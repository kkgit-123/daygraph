from fastapi import APIRouter, Depends, status

from app.models.requests import TaskCreate, TaskMove, TaskPatch
from app.services import tasks as svc
from app.utils import idempotency
from app.utils.auth import get_current_user, get_db
from app.utils.response import set_response

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create(body: TaskCreate, key: str | None = Depends(idempotency.key_from_header), user=Depends(get_current_user), db=Depends(get_db)):
    return idempotency.run(db, user["id"], "task.create", key,
                           lambda: set_response(201, "Task added", svc.create_task(db, user, body.model_dump())))


@router.patch("/{task_id}", status_code=status.HTTP_200_OK)
def patch(task_id: str, body: TaskPatch, user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "Saved", svc.update_task(db, user, task_id, body.model_dump(exclude_unset=True)))


@router.post("/{task_id}/move", status_code=status.HTTP_200_OK)
def move(task_id: str, body: TaskMove, user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "Moved", svc.move_task(db, user, task_id, body.plan_date))


@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete(task_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    svc.delete_task(db, user, task_id)
    return set_response(200, "Deleted", {"id": task_id})


@router.post("/{task_id}/retry_sync", status_code=status.HTTP_200_OK)
def retry_sync(task_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "Synced", svc.retry_sync(db, user, task_id))
