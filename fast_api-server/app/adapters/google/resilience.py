"""Reliability wrapper for live Google calls (DG-L07): retries with jitter and one circuit breaker per service.

Transient failures (timeouts, connection errors, HTTP 429 and 5xx) are retried with exponential backoff.
After FAILURE_THRESHOLD failed calls in a row the service is paused for COOLDOWN_SECONDS, so a Google outage
does not slow every request. Other errors (for example an expired grant) are raised unchanged for the caller.
"""
import random
import threading
import time

from googleapiclient.errors import HttpError

from app.adapters.google.base import UpstreamUnavailable
from app.utils.logger_config import get_logger

logger = get_logger(__name__)

MAX_ATTEMPTS = 3
BASE_DELAY_SECONDS = 0.5
FAILURE_THRESHOLD = 5
COOLDOWN_SECONDS = 60
TRANSIENT_STATUS = {429, 500, 502, 503, 504}


class CircuitBreaker:
    def __init__(self, name: str):
        self.name = name
        self.failures = 0
        self.opened_at = None
        self._lock = threading.Lock()

    def allow(self) -> bool:
        with self._lock:
            if self.opened_at is None:
                return True
            # after the cooldown one probe call is allowed through (half-open)
            return time.monotonic() - self.opened_at >= COOLDOWN_SECONDS

    def record_success(self):
        with self._lock:
            self.failures = 0
            self.opened_at = None

    def record_failure(self):
        with self._lock:
            self.failures += 1
            if self.failures >= FAILURE_THRESHOLD:
                self.opened_at = time.monotonic()
                logger.warning("Circuit opened for %s after %s failures", self.name, self.failures)


_breakers: dict[str, CircuitBreaker] = {}


def breaker(service: str) -> CircuitBreaker:
    return _breakers.setdefault(service, CircuitBreaker(service))


def is_transient(exc: Exception) -> bool:
    if isinstance(exc, HttpError):
        return exc.resp.status in TRANSIENT_STATUS
    return isinstance(exc, (TimeoutError, ConnectionError, OSError))


def call(service: str, fn):
    """Runs fn() with retries and the breaker. Raises UpstreamUnavailable when the service stays unreachable."""
    b = breaker(service)
    if not b.allow():
        raise UpstreamUnavailable(f"{service.capitalize()} is paused after repeated errors. DayGraph kept your change.")
    for attempt in range(MAX_ATTEMPTS):
        try:
            result = fn()
        except Exception as exc:  # noqa: BLE001 - classified below
            if not is_transient(exc):
                raise
            logger.warning("Transient %s error (attempt %s): %s", service, attempt + 1, exc)
            if attempt < MAX_ATTEMPTS - 1:
                time.sleep(BASE_DELAY_SECONDS * (2 ** attempt) + random.uniform(0, 0.25))
            continue
        b.record_success()
        return result
    b.record_failure()
    raise UpstreamUnavailable(f"{service.capitalize()} did not respond. DayGraph kept your change.")
