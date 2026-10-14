from fastapi import APIRouter, Depends, status

from app.models.requests import PlanApply, PlanDate, UndoBody
from app.services import plan as svc
from app.utils.auth import get_current_user, get_db
from app.utils.response import set_response

router = APIRouter(prefix="/plan", tags=["plan"])


@router.post("/generate", status_code=status.HTTP_200_OK)
def generate(body: PlanDate, user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "Suggested", svc.generate(db, user, body.date))


@router.post("/apply", status_code=status.HTTP_200_OK)
def apply(body: PlanApply, user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "Plan saved", svc.apply(db, user, body.date, body.task_ids, body.blocks))


@router.post("/replan", status_code=status.HTTP_200_OK)
def replan(body: PlanDate, user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "Replanned", svc.replan(db, user, body.date))


@router.post("/undo", status_code=status.HTTP_200_OK)
def undo(body: UndoBody, user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "Back to the earlier plan.", svc.undo(db, user, body.undo_token))
