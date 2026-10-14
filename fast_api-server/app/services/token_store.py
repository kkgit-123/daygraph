"""Encrypted storage for Google refresh tokens (DG-L02). Tokens are never logged or returned by any API."""
import os

from cryptography.fernet import Fernet, InvalidToken

import config
from app.storage.db import get_connection, transaction
from app.utils.logger_config import get_logger

logger = get_logger(__name__)


class NotConfigured(Exception):
    """The Fernet key is missing, so refresh tokens cannot be stored."""


def _fernet() -> Fernet:
    key = os.environ.get("FERNET_KEY") or config.get_config().get("security", {}).get("fernet_key", "").strip()
    if not key:
        raise NotConfigured("Set FERNET_KEY or [security] fernet_key. See docs/GOOGLE_SETUP.md.")
    return Fernet(key.encode())


def save(db, user_id: str, service: str, refresh_token: str, now_iso: str) -> None:
    token = _fernet().encrypt(refresh_token.encode()).decode()
    with transaction(db):
        db.execute("INSERT OR REPLACE INTO oauth_tokens (user_id, service, ciphertext, updated_at) VALUES (?,?,?,?)",
                   (user_id, service, token, now_iso))
        db.execute("UPDATE connections SET status = 'connected' WHERE user_id = ? AND service = ?", (user_id, service))


def load(user_id: str, service: str) -> str | None:
    """The decrypted refresh token, or None when the user has not connected this service."""
    conn = get_connection()
    try:
        row = conn.execute("SELECT ciphertext FROM oauth_tokens WHERE user_id = ? AND service = ?", (user_id, service)).fetchone()
    finally:
        conn.close()
    if row is None:
        return None
    try:
        return _fernet().decrypt(row["ciphertext"].encode()).decode()
    except (InvalidToken, NotConfigured):
        logger.warning("Stored token for %s could not be decrypted; reconnect needed", service)
        return None


def delete(db, user_id: str, service: str) -> None:
    db.execute("DELETE FROM oauth_tokens WHERE user_id = ? AND service = ?", (user_id, service))


def mark_error(user_id: str, service: str) -> None:
    """Called when Google says the grant is no longer valid (invalid_grant). The sidebar then shows Reconnect Google."""
    conn = get_connection()
    try:
        with transaction(conn):
            conn.execute("UPDATE connections SET status = 'error' WHERE user_id = ? AND service = ?", (user_id, service))
    finally:
        conn.close()
