from fastapi import APIRouter, Depends, status

from app.adapters import reset_adapters
from app.services import clock, jobs, seed as seed_svc
from app.services.ingestion import ingest_meeting
from app.repositories import meetings as meet_repo
from app.storage.db import transaction
from app.utils.auth import get_current_user, get_db
from app.utils.errors import not_found
from app.utils.response import set_response
from app.services.permissions import visible_meeting

router = APIRouter(tags=["dev"])


def _mock_only():
    if not clock.is_mock():
        raise not_found("Not found.")


@router.post("/dev/reset", status_code=status.HTTP_200_OK)
def reset(db=Depends(get_db)):
    _mock_only()
    seed_svc.reset(db)
    reset_adapters()
    return set_response(200, "Reset to the sample data", {"reset": True})


@router.post("/dev/clear_decisions/{meeting_id}", status_code=status.HTTP_200_OK)
def clear_decisions(meeting_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    """Mock-only helper for the demo: removes one meeting's decisions so the pipeline can be run again."""
    _mock_only()
    with transaction(db):
        db.execute("DELETE FROM search_index WHERE kind = 'decision' AND meeting_id = ?", (meeting_id,))
        db.execute("DELETE FROM tasks WHERE source_decision_id IN (SELECT id FROM decisions WHERE meeting_id = ?)", (meeting_id,))
        db.execute("DELETE FROM decisions WHERE meeting_id = ?", (meeting_id,))
        meet_repo.set_status(db, meeting_id, "PENDING")
    return set_response(200, "Cleared", {"meeting_id": meeting_id})


@router.post("/meetings/{meeting_id}/process", status_code=status.HTTP_202_ACCEPTED)
def process(meeting_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    """Run the ingestion pipeline on a meeting the viewer can see (also used for manual ingest)."""
    if meet_repo.get_visible(db, user["id"], meeting_id) is None:
        raise not_found("Meeting not found.")
    with transaction(db):
        meet_repo.set_status(db, meeting_id, "PENDING")
    jobs.enqueue(lambda conn, mid, uid: ingest_meeting(conn, mid, uid), meeting_id, user["id"])
    return set_response(202, "Analysing the meeting", {"meeting_id": meeting_id, "status": "PENDING"})
