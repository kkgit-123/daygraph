"""Manager view (demo). Hardcoded from fixtures/team.json, as agreed for the recorded demo; not a product feature."""
import json
import os

from fastapi import APIRouter, Depends, status

from app.apis.me import MANAGER_ROLES
from app.utils.auth import get_current_user
from app.utils.errors import not_found
from app.utils.response import set_response

router = APIRouter(tags=["team"])
FIXTURE = os.path.join(os.path.dirname(__file__), "..", "fixtures", "team.json")


@router.get("/team", status_code=status.HTTP_200_OK)
def team(user=Depends(get_current_user)):
    if user["role"] not in MANAGER_ROLES:
        raise not_found("Not found.")  # same answer as a missing page, so the view is not revealed
    with open(FIXTURE, encoding="utf-8") as f:
        return set_response(200, "OK", json.load(f))
