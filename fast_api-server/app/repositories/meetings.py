import json

from app.repositories._util import d, ds, jload
from app.services.permissions import visible_meeting
from app.utils.ids import new_id


def list_visible(db, viewer_id: str) -> list[dict]:
    rows = ds(db.execute(
        f"SELECT m.* FROM meetings m WHERE {visible_meeting('m')} ORDER BY m.start_at DESC", {"viewer_id": viewer_id}).fetchall())
    for r in rows:
        r["check_summary"] = jload(r["check_summary"], [])
    return rows


def get_visible(db, viewer_id: str, meeting_id: str) -> dict | None:
    row = d(db.execute(
        f"SELECT m.* FROM meetings m WHERE m.id = :id AND {visible_meeting('m')}", {"id": meeting_id, "viewer_id": viewer_id}).fetchone())
    if row:
        row["check_summary"] = jload(row["check_summary"], [])
    return row


def get_raw(db, meeting_id: str) -> dict | None:
    """Unfiltered, for the ingestion job (which runs with no viewer)."""
    row = d(db.execute("SELECT * FROM meetings WHERE id = ? AND deleted_at IS NULL", (meeting_id,)).fetchone())
    if row:
        row["check_summary"] = jload(row["check_summary"], [])
    return row


def create(db, title: str, start_at: str, end_at: str, organizer_id: str | None, source: str = "manual", description: str | None = None) -> str:
    mid = new_id("mtg")
    db.execute(
        "INSERT INTO meetings (id, title, start_at, end_at, organizer_id, source, status, description) VALUES (?,?,?,?,?,?,?,?)",
        (mid, title, start_at, end_at, organizer_id, source, "PENDING", description))
    return mid


def add_attendee(db, meeting_id: str, person_id: str, status: str = "attended", show_in_graph: int = 1):
    db.execute(
        "INSERT OR IGNORE INTO meeting_attendees (meeting_id, person_id, status, show_in_graph) VALUES (?,?,?,?)",
        (meeting_id, person_id, status, show_in_graph))


def set_status(db, meeting_id: str, status: str, check_summary: list[str] | None = None, failure_reason: str | None = None):
    db.execute(
        "UPDATE meetings SET status = ?, check_summary = COALESCE(?, check_summary), failure_reason = ? WHERE id = ?",
        (status, json.dumps(check_summary) if check_summary is not None else None, failure_reason, meeting_id))


def save_transcript(db, meeting_id: str, segments: list[dict], duration_sec: int):
    db.execute("DELETE FROM transcripts WHERE meeting_id = ?", (meeting_id,))
    db.execute("INSERT INTO transcripts (id, meeting_id, segments, duration_sec) VALUES (?,?,?,?)",
               (new_id("trn"), meeting_id, json.dumps(segments, ensure_ascii=False), duration_sec))


def get_transcript(db, meeting_id: str) -> dict | None:
    row = d(db.execute("SELECT * FROM transcripts WHERE meeting_id = ?", (meeting_id,)).fetchone())
    if row:
        row["segments"] = jload(row["segments"], [])
    return row
