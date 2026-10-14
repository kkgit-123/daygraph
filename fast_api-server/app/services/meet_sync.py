"""Imports a Google Meet transcript as a meeting (DG-L04). Same pipeline as a pasted transcript, from Google."""
from datetime import timedelta

from app.adapters import get_gateway
from app.repositories import meetings as meet_repo, people
from app.services import clock, jobs
from app.services.ingestion import ingest_meeting
from app.storage.db import transaction
from app.utils.logger_config import get_logger

logger = get_logger(__name__)


def _speaker_id(name: str | None, directory: list[dict]) -> str | None:
    """Matches a Meet display name to a directory person by name or alias. Unknown names stay unlinked."""
    wanted = (name or "").strip().lower()
    if not wanted:
        return None
    for p in directory:
        if any(wanted == cand.lower() for cand in [p["name"], *(p.get("aliases") or [])]):
            return p["id"]
    return None


def import_conference(db, viewer: dict, conference_ref: str) -> str | None:
    """Creates the meeting for one Meet conference and queues analysis. Idempotent per conference.

    Returns the meeting id, or None when this viewer cannot read a transcript for that conference.
    """
    existing = db.execute("SELECT id FROM meetings WHERE external_ref = ? AND deleted_at IS NULL", (conference_ref,)).fetchone()
    if existing:
        return existing["id"]
    lines = get_gateway().get_transcript(viewer["id"], conference_ref)
    if not lines:
        return None
    directory = people.directory(db)
    segments = []
    for i, line in enumerate(lines):
        segments.append({"idx": i, "speaker_id": _speaker_id(line.get("speaker_name"), directory),
                         "speaker_name": line.get("speaker_name") or "Unknown",
                         "offset_sec": int(line.get("offset_sec", 0)), "text": line["text"]})
    duration = max(segments[-1]["offset_sec"], 60)
    now = clock.now()
    title = f"Google Meet call {conference_ref.rsplit('/', 1)[-1][:8]}"
    with transaction(db):
        mid = meet_repo.create(db, title, (now - timedelta(seconds=duration)).isoformat(), now.isoformat(),
                               organizer_id=viewer["person_id"], source="meet")
        db.execute("UPDATE meetings SET external_ref = ? WHERE id = ?", (conference_ref, mid))
        meet_repo.add_attendee(db, mid, viewer["person_id"], "attended")
        for seg in segments:
            if seg["speaker_id"]:
                meet_repo.add_attendee(db, mid, seg["speaker_id"], "attended")
        meet_repo.save_transcript(db, mid, segments, duration)
        meet_repo.set_status(db, mid, "PENDING")
    jobs.enqueue(lambda conn, m, uid: ingest_meeting(conn, m, uid), mid, viewer["id"])
    logger.info("Meet import queued: meeting %s (%s lines)", mid, len(segments))
    return mid
