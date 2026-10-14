import sqlite3
from contextlib import contextmanager
from datetime import date

from app.repositories import misc, tasks as repo
from app.services import clock, google_sync, jobs
from app.storage.db import transaction
from app.utils.errors import not_found, priority_cap

EDITABLE = {"title", "notes", "due", "estimate_min", "state", "priority_slot"}


@contextmanager
def _cap_guard():
    """Two concurrent requests for the same slot: the unique index rejects the loser, which becomes a 409 (DG-B11)."""
    try:
        yield
    except sqlite3.IntegrityError as exc:
        if "priority_slot" in str(exc):
            raise priority_cap() from exc
        raise


def _check_slot(db, viewer_id: str, plan_date: str | None, slot: int | None, exclude_id: str | None = None) -> int | None:
    """Three-priority rule. A fourth priority is a 409; a taken slot with room left gets the next free one."""
    if slot is None:
        return None
    if not plan_date:
        raise not_found("A priority needs a day.")
    if repo.priority_count(db, viewer_id, plan_date, exclude_id) >= 3:
        raise priority_cap()
    used = {r[0] for r in db.execute(
        "SELECT priority_slot FROM tasks WHERE owner_id = ? AND plan_date = ? AND priority_slot IS NOT NULL AND deleted_at IS NULL AND id != ?",
        (viewer_id, plan_date, exclude_id or ""))}
    return slot if slot not in used else repo.free_slot(db, viewer_id, plan_date)


def serialize(t: dict) -> dict:
    return {
        "id": t["id"], "title": t["title"], "notes": t["notes"], "due": t["due"], "estimate_min": t["estimate_min"],
        "state": t["state"], "plan_date": t["plan_date"], "priority_slot": t["priority_slot"],
        "carried_over_from": t["carried_over_from"], "source_decision_id": t["source_decision_id"],
        "google_task_id": t["google_task_id"], "synced": t["synced"],
    }


def create_task(db, viewer: dict, body: dict) -> dict:
    uid = viewer["id"]
    with _cap_guard(), transaction(db):
        slot = _check_slot(db, uid, body.get("plan_date"), body.get("priority_slot"))
        tid = repo.insert(db, uid, body["title"], notes=body.get("notes"), due=body.get("due"), estimate_min=body.get("estimate_min"),
                          plan_date=body.get("plan_date"), priority_slot=slot)
    jobs.enqueue(google_sync.push_task, tid)
    return serialize(repo.get_owned(db, uid, tid))


def update_task(db, viewer: dict, task_id: str, patch: dict) -> dict:
    uid = viewer["id"]
    task = repo.get_owned(db, uid, task_id)
    if task is None:
        raise not_found("Task not found.")
    fields = {k: v for k, v in patch.items() if k in EDITABLE}
    with _cap_guard(), transaction(db):
        if "priority_slot" in fields:
            fields["priority_slot"] = _check_slot(db, uid, task["plan_date"], fields["priority_slot"], exclude_id=task_id)
        if "state" in fields and fields["state"] != task["state"]:
            if fields["state"] == "DONE":
                fields["completed_at"] = clock.now_iso()
                misc.add_impact(db, uid, "task_done", task_id)
            else:
                fields["completed_at"] = None
            fields["synced"] = 0 if task["google_task_id"] else task["synced"]
        repo.update(db, task_id, **fields)
    if "state" in fields and task["google_task_id"]:
        jobs.enqueue(google_sync.push_task, task_id)
    return serialize(repo.get_owned(db, uid, task_id))


def move_task(db, viewer: dict, task_id: str, plan_date: str) -> dict:
    uid = viewer["id"]
    task = repo.get_owned(db, uid, task_id)
    if task is None:
        raise not_found("Task not found.")
    date.fromisoformat(plan_date)
    with transaction(db):
        # a moved task becomes a normal task on its new day; its focus block (if any) goes with the old plan
        repo.update(db, task_id, plan_date=plan_date, priority_slot=None,
                    carried_over_from=task["plan_date"] if task["plan_date"] and plan_date > task["plan_date"] else task["carried_over_from"])
        db.execute("UPDATE plan_blocks SET deleted_at = ? WHERE task_id = ? AND deleted_at IS NULL", (clock.now_iso(), task_id))
    return serialize(repo.get_owned(db, uid, task_id))


def delete_task(db, viewer: dict, task_id: str):
    uid = viewer["id"]
    task = repo.get_owned(db, uid, task_id)
    if task is None:
        raise not_found("Task not found.")
    with transaction(db):
        repo.soft_delete(db, task_id)
        db.execute("UPDATE plan_blocks SET deleted_at = ? WHERE task_id = ? AND deleted_at IS NULL", (clock.now_iso(), task_id))
    google_sync.remove_task(db, uid, task["google_task_id"])


def retry_sync(db, viewer: dict, task_id: str) -> dict:
    from app.utils.errors import upstream_unavailable

    uid = viewer["id"]
    if repo.get_owned(db, uid, task_id) is None:
        raise not_found("Task not found.")
    ok = google_sync.push_task(db, task_id)
    db.commit()
    if not ok:
        raise upstream_unavailable()
    return serialize(repo.get_owned(db, uid, task_id))


def set_priorities(db, viewer: dict, plan_date: str, task_ids: list[str]):
    """PUT /day/{date}/priorities: one transaction sets slots 1..n in the given order."""
    uid = viewer["id"]
    task_ids = list(dict.fromkeys(task_ids))
    if len(task_ids) > 3:
        raise priority_cap()
    tasks = []
    for tid in task_ids:
        t = repo.get_owned(db, uid, tid)
        if t is None:
            raise not_found("Task not found.")
        tasks.append(t)
    with _cap_guard(), transaction(db):
        # blocks of tasks that stop being priorities go away with them
        dropped = [r["id"] for r in db.execute(
            "SELECT id FROM tasks WHERE owner_id = ? AND plan_date = ? AND priority_slot IS NOT NULL AND deleted_at IS NULL", (uid, plan_date))
            if r["id"] not in task_ids]
        for tid in dropped:
            db.execute("UPDATE plan_blocks SET deleted_at = ? WHERE task_id = ? AND deleted_at IS NULL", (clock.now_iso(), tid))
        db.execute("UPDATE tasks SET priority_slot = NULL WHERE owner_id = ? AND plan_date = ? AND priority_slot IS NOT NULL AND deleted_at IS NULL", (uid, plan_date))
        for slot, t in enumerate(tasks, start=1):
            repo.update(db, t["id"], plan_date=plan_date, priority_slot=slot)

