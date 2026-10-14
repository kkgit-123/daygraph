"""Manual ingest (DG-B26): POST /meetings/ingest with pasted text or a document link becomes a PENDING meeting
plus a background ingestion job. The viewer is the organiser; speakers named in the text who are in the directory attended."""
from datetime import timedelta

from app.adapters import get_gateway
from app.adapters.google.base import UpstreamUnavailable
from app.domain import transcript as tx
from app.repositories import meetings as meet_repo, people
from app.services import clock, jobs
from app.storage.db import transaction
from app.utils.errors import ApiError
from app.utils.logger_config import get_logger

logger = get_logger(__name__)
MAX_SEGMENTS = 2000


def _title(body_title: str | None) -> str:
    return (body_title or "").strip() or "Pasted transcript"


def ingest(db, viewer: dict, body) -> dict:
    from app.services.ingestion import ingest_meeting

    if bool(body.text) == bool(body.doc_url):
        raise ApiError(422, "VALIDATION_ERROR", "Send either text or doc_url, not both and not neither.")
    if body.doc_url:
        try:
            text = get_gateway().document_text(viewer["id"], body.doc_url.strip())
        except UpstreamUnavailable as exc:
            raise ApiError(503, "UPSTREAM_UNAVAILABLE", str(exc)) from exc
    else:
        text = body.text

    directory = people.directory(db)
    segments = tx.parse_text(text, directory)
    if not segments:
        raise ApiError(422, "VALIDATION_ERROR", "No transcript lines found.")
    if len(segments) > MAX_SEGMENTS:
        raise ApiError(422, "VALIDATION_ERROR", f"Transcripts are limited to {MAX_SEGMENTS} lines.")

    now = clock.now()
    duration = max(segments[-1]["offset_sec"], 60)
    with transaction(db):
        mid = meet_repo.create(db, _title(body.title), now.isoformat(), (now + timedelta(seconds=duration)).isoformat(),
                               organizer_id=viewer["person_id"], source="manual")
        meet_repo.add_attendee(db, mid, viewer["person_id"], "attended")
        for seg in segments:
            if seg["speaker_id"]:
                meet_repo.add_attendee(db, mid, seg["speaker_id"], "attended")
        meet_repo.save_transcript(db, mid, segments, duration)
        meet_repo.set_status(db, mid, "PENDING")
    jobs.enqueue(lambda conn, m, uid: ingest_meeting(conn, m, uid), mid, viewer["id"])
    logger.info("Manual ingest queued for meeting %s (%s lines)", mid, len(segments))
    return {"meeting_id": mid, "status": "PENDING", "segments": len(segments)}
