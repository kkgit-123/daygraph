"""Per-user sliding-window rate limit. In-process; fine for one instance (see KNOWN_GAPS)."""
import threading
import time
from collections import defaultdict, deque

from app.utils.errors import ApiError

_lock = threading.Lock()
_hits: dict[str, deque] = defaultdict(deque)


def check(key: str, limit: int, window_s: int = 60):
    now = time.monotonic()
    with _lock:
        q = _hits[key]
        while q and now - q[0] > window_s:
            q.popleft()
        if len(q) >= limit:
            raise ApiError(429, "RATE_LIMITED", "Too many requests. Wait a minute and try again.")
        q.append(now)


def reset():
    with _lock:
        _hits.clear()
