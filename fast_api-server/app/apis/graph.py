from fastapi import APIRouter, Depends, status

from app.services import graph as svc
from app.utils.auth import get_current_user, get_db
from app.utils.response import set_response

router = APIRouter(tags=["graph"])


@router.get("/graph", status_code=status.HTTP_200_OK)
def graph(topic_id: str | None = None, user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "OK", svc.graph_for_topic(db, user, topic_id))
