from datetime import date

from fastapi import APIRouter, Depends, status

from app.models.requests import PrioritiesBody
from app.services import day as day_svc, tasks as tasks_svc
from app.storage.db import transaction
from app.utils.auth import get_current_user, get_db
from app.utils.response import set_response

router = APIRouter(tags=["day"])


@router.get("/day/{day}", status_code=status.HTTP_200_OK)
def get_day(day: str, user=Depends(get_current_user), db=Depends(get_db)):
    date.fromisoformat(day)
    return set_response(200, "OK", day_svc.build_day(db, user, day))


@router.put("/day/{day}/priorities", status_code=status.HTTP_200_OK)
def put_priorities(day: str, body: PrioritiesBody, user=Depends(get_current_user), db=Depends(get_db)):
    date.fromisoformat(day)
    tasks_svc.set_priorities(db, user, day, body.task_ids)
    return set_response(200, "Priorities saved", day_svc.build_day(db, user, day))
