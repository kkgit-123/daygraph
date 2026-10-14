import json
import sqlite3

from app.repositories._util import d, ds, jload
from app.utils.errors import priority_cap
from app.utils.ids import new_id


def _row(r):
    row = d(r)
    if row:
        row["meta"] = jload(row["meta"], {})
        row["synced"] = bool(row["synced"])
    return row


def get_owned(db, viewer_id: str, task_id: str) -> dict | None:
    return _row(db.execute("SELECT * FROM tasks WHERE id = ? AND owner_id = ? AND deleted_at IS NULL", (task_id, viewer_id)).fetchone())


def for_day(db, viewer_id: str, plan_date: str) -> list[dict]:
    return [_row(r) for r in db.execute(
        "SELECT * FROM tasks WHERE owner_id = ? AND plan_date = ? AND deleted_at IS NULL ORDER BY rowid", (viewer_id, plan_date)).fetchall()]


def candidates(db, viewer_id: str, plan_date: str) -> list[dict]:
    """Open tasks the planner may choose from: planned for this day, or undated backlog."""
    return [_row(r) for r in db.execute(
        "SELECT * FROM tasks WHERE owner_id = ? AND state = 'OPEN' AND deleted_at IS NULL AND (plan_date = ? OR plan_date IS NULL) "
        "AND source_decision_id IS NULL ORDER BY rowid", (viewer_id, plan_date)).fetchall()]


def for_decision(db, viewer_id: str, decision_id: str) -> dict | None:
    return _row(db.execute(
        "SELECT * FROM tasks WHERE source_decision_id = ? AND owner_id = ? AND deleted_at IS NULL ORDER BY rowid DESC LIMIT 1",
        (decision_id, viewer_id)).fetchone())


def tasks_for_decisions(db, viewer_id: str, decision_ids: list[str]) -> list[dict]:
    if not decision_ids:
        return []
    marks = ",".join("?" * len(decision_ids))
    return [_row(r) for r in db.execute(
        f"SELECT * FROM tasks WHERE source_decision_id IN ({marks}) AND owner_id = ? AND deleted_at IS NULL ORDER BY rowid",
        decision_ids + [viewer_id]).fetchall()]


def insert(db, owner_id: str, title: str, **f) -> str:
    tid = f.pop("id", None) or new_id("tsk")
    f["meta"] = json.dumps(f.get("meta") or {})
    cols = ["id", "owner_id", "title"] + list(f)
    try:
        db.execute(f"INSERT INTO tasks ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})", [tid, owner_id, title] + list(f.values()))
    except sqlite3.IntegrityError as exc:
        if "priority_slot" in str(exc) or "uq_priority_slot" in str(exc):
            raise priority_cap() from exc
        raise
    return tid


def update(db, task_id: str, **f):
    if not f:
        return
    if "meta" in f and not isinstance(f["meta"], str):
        f["meta"] = json.dumps(f["meta"])
    sets = ",".join(f"{k} = ?" for k in f)
    try:
        db.execute(f"UPDATE tasks SET {sets} WHERE id = ?", list(f.values()) + [task_id])
    except sqlite3.IntegrityError as exc:
        if "priority_slot" in str(exc):
            raise priority_cap() from exc
        raise


def soft_delete(db, task_id: str):
    db.execute("UPDATE tasks SET deleted_at = strftime('%Y-%m-%dT%H:%M:%S+00:00','now'), priority_slot = NULL WHERE id = ?", (task_id,))


def priority_count(db, viewer_id: str, plan_date: str, exclude_id: str | None = None) -> int:
    return db.execute(
        "SELECT COUNT(*) FROM tasks WHERE owner_id = ? AND plan_date = ? AND priority_slot IS NOT NULL AND deleted_at IS NULL AND id != ?",
        (viewer_id, plan_date, exclude_id or "")).fetchone()[0]


def free_slot(db, viewer_id: str, plan_date: str) -> int | None:
    used = {r[0] for r in db.execute(
        "SELECT priority_slot FROM tasks WHERE owner_id = ? AND plan_date = ? AND priority_slot IS NOT NULL AND deleted_at IS NULL", (viewer_id, plan_date))}
    return next((s for s in (1, 2, 3) if s not in used), None)


# ---- plan blocks ----
def blocks_for_day(db, viewer_id: str, plan_date: str) -> list[dict]:
    return ds(db.execute(
        "SELECT * FROM plan_blocks WHERE owner_id = ? AND plan_date = ? AND deleted_at IS NULL ORDER BY start_min", (viewer_id, plan_date)).fetchall())


def replace_blocks(db, viewer_id: str, plan_date: str, blocks: list[dict]):
    db.execute("UPDATE plan_blocks SET deleted_at = strftime('%Y-%m-%dT%H:%M:%S+00:00','now') WHERE owner_id = ? AND plan_date = ? AND deleted_at IS NULL", (viewer_id, plan_date))
    for b in blocks:
        db.execute(
            "INSERT INTO plan_blocks (id, owner_id, plan_date, task_id, title, why, start_min, end_min, moved_by_replan) VALUES (?,?,?,?,?,?,?,?,?)",
            (b.get("id") or new_id("blk"), viewer_id, plan_date, b.get("task_id"), b["title"], b.get("why"), b["start_min"], b["end_min"], int(b.get("moved_by_replan", 0))))


def update_block(db, block_id: str, **f):
    sets = ",".join(f"{k} = ?" for k in f)
    db.execute(f"UPDATE plan_blocks SET {sets} WHERE id = ?", list(f.values()) + [block_id])


def save_snapshot(db, viewer_id: str, plan_date: str, snapshot: dict) -> str:
    token = new_id("undo")
    db.execute("INSERT INTO plan_snapshots (token, owner_id, plan_date, snapshot) VALUES (?,?,?,?)", (token, viewer_id, plan_date, json.dumps(snapshot)))
    return token


def get_snapshot(db, viewer_id: str, token: str) -> dict | None:
    row = d(db.execute("SELECT * FROM plan_snapshots WHERE token = ? AND owner_id = ?", (token, viewer_id)).fetchone())
    if row:
        row["snapshot"] = jload(row["snapshot"], {})
    return row


def latest_snapshot(db, viewer_id: str, plan_date: str) -> dict | None:
    row = d(db.execute(
        "SELECT * FROM plan_snapshots WHERE owner_id = ? AND plan_date = ? AND used = 0 ORDER BY rowid DESC LIMIT 1", (viewer_id, plan_date)).fetchone())
    if row:
        row["snapshot"] = jload(row["snapshot"], {})
    return row
