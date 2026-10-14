from fastapi import APIRouter, Depends, status

from app.models.requests import AskBody
from app.services import ask_service, cards
from app.utils import ratelimit
from app.utils.auth import get_current_user, get_db
from app.utils.errors import not_found
from app.utils.response import set_response

router = APIRouter(tags=["ask"])


@router.get("/ask/suggestions", status_code=status.HTTP_200_OK)
def suggestions(user=Depends(get_current_user)):
    return set_response(200, "OK", {"items": ask_service.SUGGESTIONS})


@router.post("/ask", status_code=status.HTTP_200_OK)
def ask(body: AskBody, user=Depends(get_current_user), db=Depends(get_db)):
    ratelimit.check(f"ask:{user['id']}", limit=10)
    return set_response(200, "OK", ask_service.ask(db, user, body.question, body.scope))


@router.get("/sources/{ref_id}", status_code=status.HTTP_200_OK)
def source(ref_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    c = cards.source_for(db, user, ref_id)
    if c is None:
        raise not_found("Source not found.")
    return set_response(200, "OK", c)
