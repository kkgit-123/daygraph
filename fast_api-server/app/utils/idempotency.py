"""Idempotency-Key replay (DG-B07). The first response for (user, scope, key) is stored and replayed for 24 hours."""
import json
from datetime import datetime, timedelta

from fastapi import Header
from fastapi.responses import JSONResponse

from app.services import clock
from app.utils.errors import ApiError

REPLAY_WINDOW = timedelta(hours=24)
MAX_KEY_LEN = 128


def key_from_header(idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")) -> str | None:
    if idempotency_key is not None and not (1 <= len(idempotency_key) <= MAX_KEY_LEN):
        raise ApiError(422, "VALIDATION_ERROR", "Idempotency-Key must be 1 to 128 characters.")
    return idempotency_key


def run(db, viewer_id: str, scope: str, key: str | None, fn):
    """Run fn() once per key. fn returns a JSONResponse; a repeat with the same key gets the stored one back."""
    if not key:
        return fn()
    row = db.execute("SELECT status_code, body, created_at FROM idempotency_keys WHERE owner_id = ? AND scope = ? AND key = ?",
                     (viewer_id, scope, key)).fetchone()
    if row is not None:
        if clock.now() - datetime.fromisoformat(row["created_at"]) <= REPLAY_WINDOW:
            return JSONResponse(content=json.loads(row["body"]), status_code=row["status_code"])
        db.execute("DELETE FROM idempotency_keys WHERE owner_id = ? AND scope = ? AND key = ?", (viewer_id, scope, key))
    resp = fn()
    db.execute("INSERT INTO idempotency_keys (owner_id, scope, key, status_code, body, created_at) VALUES (?,?,?,?,?,?)",
               (viewer_id, scope, key, resp.status_code, resp.body.decode("utf-8"), clock.now_iso()))
    db.commit()
    return resp
