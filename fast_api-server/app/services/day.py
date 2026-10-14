"""GET /day/{date}: one call feeds the whole Today page. All labels are computed here, exactly as in the prototype."""
from datetime import date

from app.adapters import get_gateway
from app.adapters.google.base import UpstreamUnavailable
from app.domain import labels
from app.domain.planner import PlanTask, reason_for
from app.repositories import decisions as dec_repo, people, tasks as tasks_repo
from app.services import clock


def estimate_label(minutes: int | None) -> str | None:
    return f"{minutes} min" if minutes else None


def to_plan_task(t: dict) -> PlanTask:
    meta = t.get("meta") or {}
    return PlanTask(
        id=t["id"], title=t["title"], due=date.fromisoformat(t["due"]) if t.get("due") else None,
        estimate_min=t.get("estimate_min") or 30, importance=float(meta.get("importance", 0.5)),
        blocks_others=bool(meta.get("blocks_others")), commitment=bool(meta.get("commitment")), meta=meta)


def block_detail(b: dict) -> str:
    base = f"{labels.hhmm(b['start_min'])} to {labels.hhmm(b['end_min'])}"
    return f"{base}, {b['why']}" if b.get("why") else base


def build_day(db, viewer: dict, date_str: str) -> dict:
    uid = viewer["id"]
    d = date.fromisoformat(date_str)
    today = clock.today()
    settings = people.get_settings(db, uid)
    now_min = clock.now_min(settings["timezone"])

    tasks = tasks_repo.for_day(db, uid, date_str)
    prios = sorted((t for t in tasks if t["priority_slot"]), key=lambda t: t["priority_slot"])
    others = [t for t in tasks if not t["priority_slot"]]
    blocks = tasks_repo.blocks_for_day(db, uid, date_str)
    block_for_task = {b["task_id"]: b for b in blocks if b["task_id"]}

    notice = None
    try:
        events = get_gateway().calendar_events(uid, date_str)
    except UpstreamUnavailable:
        events = []
        notice = "Calendar is not reachable. Showing your working hours only."
    pending = dec_repo.pending_by_meeting(db, uid)

    def state_of(start: int, end: int) -> str:
        if d < today or (d == today and end <= now_min):
            return "ended"
        if d == today and start <= now_min < end:
            return "live"
        return "upcoming"

    schedule = []
    for e in events:
        st = state_of(e["start_min"], e["end_min"])
        item = {
            "kind": "meeting", "id": e["id"], "title": e["title"], "start": labels.hhmm(e["start_min"]), "end": labels.hhmm(e["end_min"]),
            "state": st, "subtitle": f"Ended {labels.hhmm(e['end_min'])}" if st == "ended" else f"{labels.hhmm(e['start_min'])} to {labels.hhmm(e['end_min'])}",
            "pending_decisions": pending.get(e.get("meeting_id") or "", 0),
        }
        schedule.append((e["start_min"], item))
    for b in blocks:
        schedule.append((b["start_min"], {
            "kind": "focus", "id": b["id"], "title": b["title"], "start": labels.hhmm(b["start_min"]), "end": labels.hhmm(b["end_min"]),
            "reason": block_detail(b), "moved_by_replan": bool(b["moved_by_replan"]),
        }))
    schedule = [i for _, i in sorted(schedule, key=lambda x: x[0])]

    priorities = []
    for t in prios:
        b = block_for_task.get(t["id"])
        reason = reason_for(to_plan_task(t), d, bool(b and b["why"] == "longest free window"))
        priorities.append({
            "id": t["id"], "title": t["title"], "state": t["state"], "slot": t["priority_slot"],
            "estimate_label": estimate_label(t["estimate_min"]), "source_label": (t["meta"] or {}).get("source_label"),
            "slot_label": f"{labels.hhmm(b['start_min'])} to {labels.hhmm(b['end_min'])}" if b else None,
            "reason": reason,
        })

    def carried(t):
        if not t["carried_over_from"]:
            return False, None
        wd = labels.WEEKDAYS[date.fromisoformat(t["carried_over_from"]).weekday()]
        return True, f"Carried over from {wd}"

    task_items = []
    for t in others:
        c, c_label = carried(t)
        task_items.append({"id": t["id"], "title": t["title"], "state": t["state"], "estimate_label": estimate_label(t["estimate_min"]),
                           "carried_over": c, "carried_label": c_label})

    meeting_minutes = sum(e["end_min"] - e["start_min"] for e in events)
    working = max(labels.to_min(settings["work_end"]) - labels.to_min(settings["work_start"]), 1)
    percent = round(meeting_minutes * 100 / working)
    word = "today" if d == today else "this day"
    n_meet, n_prio = len(events), len(priorities)
    plural = lambda n, w, ws: f"{n} {w if n == 1 else ws}"  # noqa: E731
    first = viewer["name"].split(" ")[0]
    lead = f"{labels.greeting(clock.local_now(settings['timezone']).hour)}, {first}. " if d == today else ""
    snap = tasks_repo.latest_snapshot(db, uid, date_str)

    return {
        "date": date_str, "is_today": d == today, "title": labels.day_title(d), "short_label": labels.weekday_short_date(d),
        "subtitle": f"{lead}You have {plural(n_meet, 'meeting', 'meetings')} and {plural(n_prio, 'priority', 'priorities')} {word}.",
        "priorities": priorities, "tasks": task_items, "schedule": schedule,
        "plan": {"replanned": snap is not None, "can_undo": snap is not None, "undo_token": snap["token"] if snap else None},
        "meeting_load": {"minutes": meeting_minutes, "working_minutes": working, "percent": percent, "label": f"Meetings take {percent}% of {word}."},
        "counts": {"tasks_open": sum(1 for t in tasks if t["state"] == "OPEN"), "tasks_done": sum(1 for t in tasks if t["state"] == "DONE")},
        "notice": notice,
    }
