import json

from app.repositories._util import d, ds, jload
from app.services.permissions import visible_decision, visible_meeting_ids
from app.utils.ids import new_id

_JSON_COLS = ("owner_candidates", "embedding")


def _row(r) -> dict | None:
    row = d(r)
    if row:
        row["owner_candidates"] = jload(row["owner_candidates"], [])
        row["embedding"] = jload(row["embedding"], None)
    return row


def list_visible(db, viewer_id: str, statuses: list[str] | None = None, meeting_id: str | None = None) -> list[dict]:
    sql = f"SELECT d.* FROM decisions d WHERE {visible_decision('d')}"
    params: dict = {"viewer_id": viewer_id}
    if statuses:
        marks = ",".join(f":s{i}" for i in range(len(statuses)))
        sql += f" AND d.status IN ({marks})"
        params.update({f"s{i}": s for i, s in enumerate(statuses)})
    if meeting_id:
        sql += " AND d.meeting_id = :meeting_id"
        params["meeting_id"] = meeting_id
    sql += " ORDER BY d.rowid"
    return [_row(r) for r in db.execute(sql, params).fetchall()]


def get_visible(db, viewer_id: str, decision_id: str) -> dict | None:
    return _row(db.execute(
        f"SELECT d.* FROM decisions d WHERE d.id = :id AND {visible_decision('d')}", {"id": decision_id, "viewer_id": viewer_id}).fetchone())


def get_raw(db, decision_id: str) -> dict | None:
    return _row(db.execute("SELECT * FROM decisions WHERE id = ? AND deleted_at IS NULL", (decision_id,)).fetchone())


def count_pending_visible(db, viewer_id: str) -> int:
    return db.execute(
        f"SELECT COUNT(*) FROM decisions d WHERE d.status = 'PROPOSED' AND {visible_decision('d')}", {"viewer_id": viewer_id}).fetchone()[0]


def count_open_conflicts_visible(db, viewer_id: str) -> int:
    return db.execute(
        f"SELECT COUNT(*) FROM decisions d WHERE d.conflict_state = 'PENDING' AND d.status = 'PROPOSED' AND {visible_decision('d')}",
        {"viewer_id": viewer_id}).fetchone()[0]


def pending_by_meeting(db, viewer_id: str) -> dict[str, int]:
    rows = db.execute(
        f"SELECT d.meeting_id, COUNT(*) c FROM decisions d WHERE d.status = 'PROPOSED' AND {visible_decision('d')} GROUP BY d.meeting_id",
        {"viewer_id": viewer_id}).fetchall()
    return {r["meeting_id"]: r["c"] for r in rows}


def insert(db, **f) -> str:
    did = f.pop("id", None) or new_id("dec")
    f["owner_candidates"] = json.dumps(f.get("owner_candidates") or [])
    if f.get("embedding") is not None:
        f["embedding"] = json.dumps(f["embedding"])
    cols = ["id"] + list(f)
    db.execute(f"INSERT INTO decisions ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})", [did] + list(f.values()))
    return did


def update(db, decision_id: str, **f):
    if not f:
        return
    for k in ("owner_candidates",):
        if k in f and not isinstance(f[k], str):
            f[k] = json.dumps(f[k])
    sets = ",".join(f"{k} = ?" for k in f)
    db.execute(f"UPDATE decisions SET {sets} WHERE id = ?", list(f.values()) + [decision_id])


# ---- topics ----
def topics_all(db) -> list[dict]:
    rows = ds(db.execute("SELECT * FROM topics WHERE deleted_at IS NULL ORDER BY rowid").fetchall())
    for r in rows:
        r["embedding"] = jload(r["embedding"], None)
    return rows


def get_topic(db, topic_id: str) -> dict | None:
    return d(db.execute("SELECT * FROM topics WHERE id = ? AND deleted_at IS NULL", (topic_id,)).fetchone())


def create_topic(db, title: str, embedding: list[float] | None) -> str:
    tid = new_id("top")
    db.execute("INSERT INTO topics (id, title, embedding) VALUES (?,?,?)", (tid, title, json.dumps(embedding) if embedding else None))
    return tid


def visible_topics(db, viewer_id: str) -> list[dict]:
    from app.services.permissions import visible_topic
    return ds(db.execute(f"SELECT t.* FROM topics t WHERE {visible_topic('t')} ORDER BY t.rowid", {"viewer_id": viewer_id}).fetchall())


def latest_visible_topic(db, viewer_id: str) -> dict | None:
    """Default graph topic: the visible topic with the most decisions (ties go to the newest decision)."""
    row = db.execute(
        f"SELECT d.topic_id FROM decisions d JOIN meetings m ON m.id = d.meeting_id "
        f"WHERE d.topic_id IS NOT NULL AND {visible_decision('d')} "
        f"GROUP BY d.topic_id ORDER BY COUNT(*) DESC, MAX(m.start_at) DESC LIMIT 1", {"viewer_id": viewer_id}).fetchone()
    return get_topic(db, row["topic_id"]) if row else None


# ---- graph helpers ----
def conflict_candidates(db, viewer_id: str, topic_id: str, exclude_id: str | None = None, limit: int = 10) -> list[dict]:
    """ACTIVE decisions on the same topic from meetings the viewer attended, newest first, at most 10."""
    rows = db.execute(
        f"SELECT d.* FROM decisions d JOIN meetings m ON m.id = d.meeting_id "
        f"WHERE d.topic_id = :topic AND d.status = 'ACTIVE' AND d.id != :ex AND {visible_decision('d')} "
        f"ORDER BY m.start_at DESC, d.rowid DESC LIMIT :limit",
        {"topic": topic_id, "ex": exclude_id or "", "viewer_id": viewer_id, "limit": limit}).fetchall()
    return [_row(r) for r in rows]


def lineage(db, viewer_id: str, decision_id: str) -> list[dict]:
    """Supersede chain around a decision, oldest first. Recursive CTE in both directions, permission filtered."""
    rows = db.execute(
        f"""
        WITH RECURSIVE older(id, depth) AS (
            SELECT :id, 0
            UNION ALL
            SELECT d.supersedes_decision_id, o.depth + 1 FROM decisions d JOIN older o ON d.id = o.id
            WHERE d.supersedes_decision_id IS NOT NULL
        ), newer(id, depth) AS (
            SELECT :id, 0
            UNION ALL
            SELECT d.id, n.depth + 1 FROM decisions d JOIN newer n ON d.supersedes_decision_id = n.id
        ), chain(id, pos) AS (
            SELECT id, -depth FROM older
            UNION
            SELECT id, depth FROM newer
        )
        SELECT d.*, c.pos FROM chain c JOIN decisions d ON d.id = c.id
        WHERE {visible_decision('d')} ORDER BY c.pos
        """, {"id": decision_id, "viewer_id": viewer_id}).fetchall()
    return [_row(r) for r in rows]
