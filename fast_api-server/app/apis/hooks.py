"""Google push webhooks (DG-L06). Pub/Sub delivers Workspace Events here when a transcript file is ready."""
import base64
import json
import re
import sqlite3
import threading

import config
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.adapters.google.base import UpstreamUnavailable
from app.services import clock, meet_sync
from app.storage.db import get_connection, transaction
from app.utils.auth import get_db
from app.utils.logger_config import get_logger
from app.utils.response import set_response

logger = get_logger(__name__)
router = APIRouter(prefix="/hooks", tags=["hooks"])
CONFERENCE = re.compile(r"conferenceRecords/[A-Za-z0-9_-]+")
# Google's transcript file lands a little after the call ends; wait before reading it (DG-L06)
IMPORT_DELAY_SECONDS = 90


def _verify(authorization: str | None):
    """Checks the Google-signed OIDC token that Pub/Sub attaches to each push."""
    gcp = config.get_config().get("gcp", {})
    audience = gcp.get("pubsub_audience", "").strip()
    if not audience:
        raise HTTPException(status_code=412, detail={"code": "PUBSUB_NOT_CONFIGURED", "message": "Set [gcp] pubsub_audience."})
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED", "message": "Missing push token."})
    try:
        info = id_token.verify_oauth2_token(authorization[7:], google_requests.Request(), audience)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED", "message": "Invalid push token."}) from exc
    expected = gcp.get("pubsub_service_account", "").strip()
    if expected and info.get("email") != expected:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED", "message": "Unexpected push identity."})


def _conference_ref(message: dict) -> str | None:
    decoded = ""
    if message.get("data"):
        try:
            decoded = base64.b64decode(message["data"]).decode("utf-8", "replace")
        except (ValueError, UnicodeDecodeError):
            decoded = ""
    text = json.dumps(message.get("attributes", {})) + decoded
    found = CONFERENCE.search(text)
    return found.group(0) if found else None


def _import_later(conference_ref: str):
    """Tries each connected Meet user until one can read the transcript."""
    conn = get_connection()
    try:
        owners = conn.execute(
            "SELECT u.id, u.person_id FROM connections c JOIN users u ON u.id = c.user_id "
            "WHERE c.service = 'meet' AND c.status = 'connected' AND u.deleted_at IS NULL").fetchall()
        for owner in owners:
            try:
                if meet_sync.import_conference(conn, {"id": owner["id"], "person_id": owner["person_id"]}, conference_ref):
                    conn.commit()
                    return
            except UpstreamUnavailable as exc:
                logger.info("Meet import skipped for one user: %s", exc)
        logger.info("No connected user could read the transcript for %s", conference_ref)
    except Exception:  # noqa: BLE001 - a failed background import must never crash the server
        logger.exception("Meet import failed for %s", conference_ref)
    finally:
        conn.close()


@router.post("/pubsub/workspace-events", status_code=status.HTTP_200_OK)
async def workspace_events(request: Request, authorization: str | None = Header(default=None), db=Depends(get_db)):
    _verify(authorization)
    body = await request.json()
    message = body.get("message") or {}
    message_id = message.get("messageId")
    if not message_id:
        return set_response(200, "ignored", None)
    try:
        with transaction(db):
            db.execute("INSERT INTO processed_events (message_id, received_at) VALUES (?, ?)", (message_id, clock.now_iso()))
    except sqlite3.IntegrityError:
        return set_response(200, "duplicate", None)  # Google redelivered this message; it is already handled
    ref = _conference_ref(message)
    if ref:
        threading.Timer(IMPORT_DELAY_SECONDS, _import_later, args=(ref,)).start()
    return set_response(200, "accepted", {"conference": ref})
