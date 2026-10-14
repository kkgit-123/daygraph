"""Google sign-in for connecting services (DG-L02): OAuth 2.0 with PKCE, one consent per service.

Flow: the signed-in user calls GET /auth/google/start?service=calendar and opens the returned URL.
Google redirects to GET /auth/google/callback, which exchanges the code, checks the Workspace domain,
stores the refresh token encrypted, and sends the browser back to the Settings page.
"""
import base64
import hashlib
import secrets
import time
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

import config
from app.repositories import misc
from app.services import clock, token_store
from app.storage.db import transaction
from app.utils.auth import get_current_user, get_db
from app.utils.auth import create_token
from app.utils.errors import not_found
from app.utils.response import set_response

router = APIRouter(prefix="/auth/google", tags=["auth"])

AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URI = "https://oauth2.googleapis.com/token"
STATE_TTL_SECONDS = 600
# Scopes per Google service. Verify each against the current Google docs before release (DG-L02).
SCOPES = {
    "calendar": "https://www.googleapis.com/auth/calendar.readonly",
    "tasks": "https://www.googleapis.com/auth/tasks",
    "meet": "https://www.googleapis.com/auth/meetings.space.readonly",
    "drive": "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly",
}
SIGNIN_SCOPE = "openid email profile"
# state -> {user_id, service, verifier, expires}. In memory: one server process only (see docs/KNOWN_GAPS.md).
_pending: dict[str, dict] = {}


def _cfg() -> dict:
    return config.get_config().get("google_oauth", {})


def _configured() -> bool:
    return bool(_cfg().get("client_id", "").strip() and _cfg().get("client_secret", "").strip())


def _require_live():
    if clock.is_mock():
        raise HTTPException(status_code=412, detail={"code": "MOCK_MODE", "message": "Google sign-in is off in mock mode."})
    if not _configured():
        raise HTTPException(status_code=412, detail={"code": "GOOGLE_NOT_CONFIGURED",
                                                     "message": "Google sign-in is not set up yet. Add the OAuth client in config.ini. See docs/GOOGLE_SETUP.md."})


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _purge_expired(now: float):
    for key in [k for k, v in _pending.items() if v["expires"] < now]:
        _pending.pop(key, None)


@router.get("/start", status_code=status.HTTP_200_OK)
def start(service: str, user=Depends(get_current_user)):
    if service not in SCOPES:
        raise not_found("Unknown service.")
    _require_live()
    now = time.time()
    _purge_expired(now)
    verifier = _b64url(secrets.token_bytes(48))
    challenge = _b64url(hashlib.sha256(verifier.encode()).digest())
    state = secrets.token_urlsafe(24)
    _pending[state] = {"user_id": user["id"], "service": service, "verifier": verifier, "expires": now + STATE_TTL_SECONDS}
    params = {
        "client_id": _cfg()["client_id"].strip(),
        "redirect_uri": _cfg()["redirect_uri"].strip(),
        "response_type": "code",
        "scope": f"openid email {SCOPES[service]}",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    if _cfg().get("allowed_domain", "").strip():
        params["hd"] = _cfg()["allowed_domain"].strip()
    return set_response(200, "OK", {"url": f"{AUTH_URI}?{urlencode(params)}"})


def _frontend() -> str:
    return _cfg().get("frontend_url", "http://localhost:3005").rstrip("/")


def _back(result: str, **extra) -> RedirectResponse:
    return RedirectResponse(f"{_frontend()}/settings?{urlencode({'google': result, **extra})}", status_code=302)


def _url(state: str, scope: str, challenge: str) -> str:
    params = {
        "client_id": _cfg()["client_id"].strip(),
        "redirect_uri": _cfg()["redirect_uri"].strip(),
        "response_type": "code",
        "scope": scope,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    if _cfg().get("allowed_domain", "").strip():
        params["hd"] = _cfg()["allowed_domain"].strip()
    return f"{AUTH_URI}?{urlencode(params)}"


@router.get("/signin/start", status_code=status.HTTP_200_OK)
def signin_start():
    """Sign-in with Google (DG-F50 live). No session yet, so the state carries no user."""
    _require_live()
    now = time.time()
    _purge_expired(now)
    verifier = _b64url(secrets.token_bytes(48))
    challenge = _b64url(hashlib.sha256(verifier.encode()).digest())
    state = secrets.token_urlsafe(24)
    _pending[state] = {"user_id": None, "service": "signin", "verifier": verifier, "expires": now + STATE_TTL_SECONDS}
    return set_response(200, "OK", {"url": _url(state, SIGNIN_SCOPE, challenge)})


@router.get("/callback")
def callback(code: str | None = None, state: str | None = None, error: str | None = None, db=Depends(get_db)):
    entry = _pending.pop(state or "", None)
    signin = entry is not None and entry["service"] == "signin"
    fail = (lambda reason: RedirectResponse(f"{_frontend()}/login?{urlencode({'error': reason})}", status_code=302)) if signin else (lambda reason: _back("error", reason=reason))
    if entry is None or entry["expires"] < time.time():
        return fail("expired")
    if error or not code:
        return fail("cancelled")
    _require_live()
    try:
        resp = httpx.post(TOKEN_URI, timeout=10, data={
            "code": code, "client_id": _cfg()["client_id"].strip(), "client_secret": _cfg()["client_secret"].strip(),
            "redirect_uri": _cfg()["redirect_uri"].strip(), "grant_type": "authorization_code",
            "code_verifier": entry["verifier"],
        })
    except httpx.HTTPError:
        return _back("error", reason="unreachable")
    if resp.status_code != 200:
        return fail("token")
    body = resp.json()
    if not body.get("id_token"):
        return fail("id_token")
    try:
        info = id_token.verify_oauth2_token(body["id_token"], google_requests.Request(), _cfg()["client_id"].strip())
    except ValueError:
        return fail("id_token")
    allowed = _cfg().get("allowed_domain", "").strip()
    if allowed and info.get("hd") != allowed:
        return fail("domain")
    if signin:
        return _finish_signin(db, info)
    refresh = body.get("refresh_token")
    if not refresh:
        return _back("error", reason="no_refresh_token")
    try:
        token_store.save(db, entry["user_id"], entry["service"], refresh, clock.now_iso())
    except token_store.NotConfigured:
        return _back("error", reason="not_configured")
    with transaction(db):
        misc.add_audit(db, entry["user_id"], "connection.google", entry["service"])
    return _back("connected", service=entry["service"])


def _finish_signin(db, info: dict):
    """Signs in the DayGraph user whose person record has this verified Google email (set people.email)."""
    email = (info.get("email") or "").strip().lower()
    row = db.execute(
        "SELECT u.id FROM users u JOIN people p ON p.id = u.person_id "
        "WHERE lower(p.email) = ? AND u.deleted_at IS NULL AND p.deleted_at IS NULL", (email,)).fetchone()
    if not info.get("email_verified") or row is None:
        return RedirectResponse(f"{_frontend()}/login?{urlencode({'error': 'not_invited'})}", status_code=302)
    with transaction(db):
        misc.add_audit(db, row["id"], "auth.sign_in")
    # the token goes in the URL fragment so it is never sent to a server or written to a log
    return RedirectResponse(f"{_frontend()}/login#token={create_token(row['id'])}", status_code=302)
