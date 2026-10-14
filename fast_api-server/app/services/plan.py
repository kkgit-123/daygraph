"""Plan generate / apply / replan / undo. Planner actions never 500 when the model or Google fails: they return a notice."""
from datetime import date

from app.adapters import get_gateway, get_llm
from app.adapters.google.base import UpstreamUnavailable
from app.domain import labels, planner
from app.repositories import people, tasks as tasks_repo
from app.services import clock
from app.services.day import to_plan_task
from app.storage.db import transaction
from app.utils.errors import invalid_state, not_found
from app.utils.logger_config import get_logger

logger = get_logger(__name__)
MOCK_SLIP_MIN = 15  # mock mode: "a slow start" of 15 minutes (live mode derives it from the clock)


def _day_context(db, viewer, date_str):
    s = people.get_settings(db, viewer["id"])
    notice = None
    try:
        events = get_gateway().calendar_events(viewer["id"], date_str)
    except UpstreamUnavailable:
        events, notice = [], "Calendar is not reachable, so this plan uses your working hours only."
    meetings = [(e["start_min"], e["end_min"]) for e in events]
    lunch = (labels.to_min(s["lunch_start"]), labels.to_min(s["lunch_end"]))
    return s, meetings, lunch, notice


def _estimates(tasks):
    """Model supplies importance/effort only. On any failure the planner falls back to due date, then manual priority."""
    try:
        res = get_llm().generate_json("plan_estimates", {"tasks": [{"id": t["id"], "title": t["title"]} for t in tasks]}) or {}
        return res if isinstance(res, dict) else {}
    except Exception as exc:  # noqa: BLE001
        logger.warning("plan_estimates failed, using fallback: %s", exc)
        return {}


def generate(db, viewer: dict, date_str: str) -> dict:
    uid = viewer["id"]
    d = date.fromisoformat(date_str)
    s, meetings, lunch, notice = _day_context(db, viewer, date_str)
    cands = tasks_repo.candidates(db, uid, date_str)
    est = _estimates(cands)
    plan_tasks = []
    for t in cands:
        pt = to_plan_task(t)
        e = est.get(t["id"], {})
        if "importance" not in (t["meta"] or {}) and "importance" in e:
            pt.importance = float(e["importance"])
        plan_tasks.append(pt)
    weights = s.get("weights")
    chosen = planner.pick_priorities(plan_tasks, d, weights)
    ranked = {t.id: sc for t, sc in planner.rank(plan_tasks, d, weights)}
    start = labels.to_min(s["work_start"])
    if d == clock.today(s["timezone"]):
        start = max(start, clock.now_min(s["timezone"]))
    windows = planner.free_windows(start, labels.to_min(s["work_end"]), meetings, lunch, s["buffer_min"])
    blocks = planner.place_blocks(chosen, windows)
    in_longest = {b.task_id for b in blocks if b.why == "longest free window"}
    return {
        "date": date_str,
        "priorities": [{"task_id": t.id, "title": t.title, "score": ranked[t.id], "reason": planner.reason_for(t, d, t.id in in_longest)} for t in chosen],
        "blocks": [{"task_id": b.task_id, "title": b.title, "start": labels.hhmm(b.start), "end": labels.hhmm(b.end), "why": b.why} for b in blocks],
        "notice": notice,
    }


def apply(db, viewer: dict, date_str: str, task_ids: list[str], blocks: list[dict]) -> dict:
    from app.services.tasks import set_priorities

    set_priorities(db, viewer, date_str, task_ids)
    titles = {t["id"]: t for t in tasks_repo.for_day(db, viewer["id"], date_str)}
    rows = []
    for b in blocks:
        if b["task_id"] not in titles:
            raise not_found("Task not found.")
        rows.append({"task_id": b["task_id"], "title": "Focus: " + (titles[b["task_id"]]["meta"] or {}).get("short", titles[b["task_id"]]["title"]),
                     "why": b.get("why"), "start_min": labels.to_min(b["start"]), "end_min": labels.to_min(b["end"])})
    with transaction(db):
        tasks_repo.replace_blocks(db, viewer["id"], date_str, rows)
    return {"saved": True}


def replan(db, viewer: dict, date_str: str) -> dict:
    uid = viewer["id"]
    d = date.fromisoformat(date_str)
    s, meetings, lunch, notice = _day_context(db, viewer, date_str)
    blocks = tasks_repo.blocks_for_day(db, uid, date_str)
    if tasks_repo.latest_snapshot(db, uid, date_str):
        return {"moved": [], "dropped": [], "undo_token": None, "message": "This day is already replanned. Undo it first to replan again.", "notice": notice}
    now_min = clock.now_min(s["timezone"]) if d == clock.today(s["timezone"]) else 0
    if clock.is_mock():
        slip = MOCK_SLIP_MIN
    else:
        upcoming = [b for b in blocks if b["start_min"] >= now_min]
        slip = max(0, now_min - upcoming[0]["start_min"]) if upcoming else 0
    moves = planner.replan([(b["id"], b["start_min"], b["end_min"]) for b in blocks], meetings + [lunch], labels.to_min(s["work_end"]), slip, now_min, s["buffer_min"])
    if not moves:
        return {"moved": [], "dropped": [], "undo_token": None, "message": "Replanned: nothing needed to move. Nothing was dropped.", "notice": notice}
    by_id = {b["id"]: b for b in blocks}
    token = None
    with transaction(db):
        token = tasks_repo.save_snapshot(db, uid, date_str, {"blocks": [dict(b) for b in blocks]})
        for m in moves:
            tasks_repo.update_block(db, m["block_id"], start_min=m["to"], end_min=m["end"], moved_by_replan=1, why="after a slow start")
    n = len(moves)
    return {
        "moved": [{"block_id": m["block_id"], "from": labels.hhmm(m["from"]), "to": labels.hhmm(m["to"])} for m in moves],
        "dropped": [], "undo_token": token, "notice": notice,
        "message": f"Replanned: moved {n} block{'s' if n != 1 else ''} by {slip} minutes. Nothing was dropped.",
    }


def undo(db, viewer: dict, token: str) -> dict:
    uid = viewer["id"]
    snap = tasks_repo.get_snapshot(db, uid, token)
    if snap is None:
        raise not_found("Nothing to undo.")
    if snap["used"]:
        raise invalid_state("That replan was already undone.")
    with transaction(db):
        for b in snap["snapshot"]["blocks"]:  # restore in place (same block ids)
            tasks_repo.update_block(db, b["id"], start_min=b["start_min"], end_min=b["end_min"], why=b["why"], moved_by_replan=0)
        db.execute("UPDATE plan_snapshots SET used = 1 WHERE token = ?", (token,))
    return {"message": "Back to the earlier plan.", "date": snap["plan_date"]}
