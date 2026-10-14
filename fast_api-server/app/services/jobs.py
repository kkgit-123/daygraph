"""Tiny in-process job runner (DG-B29): 3 attempts, exponential backoff. Jobs open their own DB connection."""
import threading
import time

from app.storage.db import get_connection
from app.utils.logger_config import get_logger

logger = get_logger(__name__)
_run_inline = False  # tests flip this so jobs finish before assertions


def set_inline(value: bool):
    global _run_inline
    _run_inline = value


def _attempt(fn, args, attempts: int, base_delay: float):
    for n in range(1, attempts + 1):
        db = get_connection()
        try:
            fn(db, *args)
            db.commit()
            return
        except Exception as exc:  # noqa: BLE001 - a job must never take the server down
            db.rollback()
            logger.warning("Job %s failed (attempt %s/%s): %s", getattr(fn, "__name__", fn), n, attempts, exc)
            if n < attempts:
                time.sleep(0 if _run_inline else base_delay * (2 ** (n - 1)))
        finally:
            db.close()
    logger.error("Job %s gave up after %s attempts", getattr(fn, "__name__", fn), attempts)


def enqueue(fn, *args, attempts: int = 3, base_delay: float = 0.5):
    """Run fn(db, *args) after the request has committed."""
    if _run_inline:
        _attempt(fn, args, attempts, base_delay)
    else:
        threading.Thread(target=_attempt, args=(fn, args, attempts, base_delay), daemon=True).start()
