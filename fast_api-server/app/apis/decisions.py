from fastapi import APIRouter, Depends, Query, status

from app.models.requests import AcceptBody, IngestBody, OwnerBody
from app.services import cards, meeting_ingest, review
from app.utils import idempotency
from app.utils.auth import get_current_user, get_db
from app.utils.response import set_response

router = APIRouter(tags=["review"])


@router.get("/decisions", status_code=status.HTTP_200_OK)
def list_decisions(status_q: str | None = Query(default=None, alias="status"), meeting_id: str | None = None,
                   user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "OK", cards.list_cards(db, user, status_q, meeting_id))


@router.post("/decisions/accept_all", status_code=status.HTTP_200_OK)
def accept_all(user=Depends(get_current_user), db=Depends(get_db)):
    out = review.accept_all(db, user)
    return set_response(200, out["message"], out)


@router.post("/decisions/{decision_id}/accept", status_code=status.HTTP_200_OK)
def accept(decision_id: str, body: AcceptBody | None = None, key: str | None = Depends(idempotency.key_from_header),
           user=Depends(get_current_user), db=Depends(get_db)):
    body = body or AcceptBody()

    def run_accept():
        out = review.accept(db, user, decision_id, body.owner_person_id, body.deadline)
        return set_response(200, out["message"], out)

    return idempotency.run(db, user["id"], f"decision.accept:{decision_id}", key, run_accept)


@router.post("/decisions/{decision_id}/keep_both", status_code=status.HTTP_200_OK)
def keep_both(decision_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    out = review.keep_both(db, user, decision_id)
    return set_response(200, out["message"], out)


@router.post("/decisions/{decision_id}/dismiss", status_code=status.HTTP_200_OK)
def dismiss(decision_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    out = review.dismiss(db, user, decision_id)
    return set_response(200, out["message"], out)


@router.post("/decisions/{decision_id}/undo", status_code=status.HTTP_200_OK)
def undo(decision_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    out = review.undo(db, user, decision_id)
    return set_response(200, out["message"], out)


@router.post("/decisions/{decision_id}/owner", status_code=status.HTTP_200_OK)
def set_owner(decision_id: str, body: OwnerBody, user=Depends(get_current_user), db=Depends(get_db)):
    out = review.set_owner(db, user, decision_id, body.person_id)
    return set_response(200, out["note"], out)


@router.get("/decisions/{decision_id}/lineage", status_code=status.HTTP_200_OK)
def lineage(decision_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "OK", {"items": review.lineage(db, user, decision_id)})


@router.get("/meetings", status_code=status.HTTP_200_OK)
def meetings(user=Depends(get_current_user), db=Depends(get_db)):
    from app.repositories import meetings as meet_repo
    return set_response(200, "OK", {"items": meet_repo.list_visible(db, user["id"])})


@router.post("/meetings/ingest", status_code=status.HTTP_202_ACCEPTED)
def ingest(body: IngestBody, user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(202, "Analysing the transcript", meeting_ingest.ingest(db, user, body))


@router.get("/meetings/{meeting_id}", status_code=status.HTTP_200_OK)
def meeting(meeting_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    from app.repositories import meetings as meet_repo
    m = meet_repo.get_visible(db, user["id"], meeting_id)
    if m is None:
        from app.utils.errors import not_found
        raise not_found("Meeting not found.")
    return set_response(200, "OK", {"meeting": cards._meeting_card(db, m), "decisions": cards.list_cards(db, user, None, meeting_id)["items"]})
