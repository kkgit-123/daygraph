from fastapi import APIRouter, status

from app.adapters import get_gateway
from app.models.requests import DevLogin
from app.repositories import people
from app.services import clock
from app.storage.db import transaction
from app.utils.auth import create_token, expiry_seconds, get_db
from app.utils.errors import not_found
from app.utils.response import set_response
from app.repositories import misc
from fastapi import Depends

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/dev-login", status_code=status.HTTP_200_OK)
def dev_login(body: DevLogin, db=Depends(get_db)):
    if not clock.is_mock():
        raise not_found("Dev sign-in is not available. Sign in with Google.")
    user = people.get_user_by_handle(db, body.user)
    if user is None:
        raise not_found("Unknown sample user.")
    with transaction(db):
        misc.add_audit(db, user["id"], "auth.sign_in")
    return set_response(200, "Signed in", {
        "access_token": create_token(user["id"]), "token_type": "bearer", "expires_in": expiry_seconds(),
        "user": {"id": user["id"], "name": user["name"], "initials": user["initials"]},
    })
