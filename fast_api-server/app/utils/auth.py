"""JWT auth. The user id always comes from the token; no endpoint ever accepts a user id for 'me'."""
import os
import time

import jwt
from fastapi import Depends, Header

import config
from app.storage.db import get_connection
from app.utils import ratelimit
from app.utils.errors import unauthenticated

_DEV_SECRET = "daygraph-dev-only-secret-change-me-0123456789"  # used only in mock mode


def _secret() -> str:
    # env first (never committed), then [security] jwt_secret in config.ini, then the dev-only fallback in mock mode
    secret = os.environ.get("JWT_SECRET") or config.get_config().get("security", {}).get("jwt_secret", "").strip()
    if secret:
        return secret
    if config.get_config().get("daygraph", {}).get("google_mode", "mock").strip().lower() == "mock":
        return _DEV_SECRET
    raise RuntimeError("Set JWT_SECRET or [security] jwt_secret when google_mode = live")


def expiry_seconds() -> int:
    return int(config.get_config().get("daygraph", {}).get("jwt_expiry_seconds", 28800))


def create_token(user_id: str) -> str:
    now = int(time.time())
    return jwt.encode({"sub": user_id, "iat": now, "exp": now + expiry_seconds()}, _secret(), algorithm="HS256")


def decode_token(token: str) -> str:
    try:
        return jwt.decode(token, _secret(), algorithms=["HS256"])["sub"]
    except jwt.PyJWTError as exc:
        raise unauthenticated() from exc


def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def get_current_user(authorization: str | None = Header(default=None), db=Depends(get_db)) -> dict:
    from app.repositories import people

    if not authorization or not authorization.lower().startswith("bearer "):
        raise unauthenticated()
    user = people.get_user(db, decode_token(authorization[7:].strip()))
    if user is None:
        raise unauthenticated()
    ratelimit.check(f"user:{user['id']}", limit=60)  # DG-B09: 60 requests per minute per user
    return user
