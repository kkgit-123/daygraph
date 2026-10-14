"""One clock for the whole app. In mock mode it is frozen to the seeded morning so the story always reads the same."""
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

import config


def _cfg() -> dict:
    return config.get_config().get("daygraph", {})


def is_mock() -> bool:
    return _cfg().get("google_mode", "mock").strip().lower() == "mock"


_PROCESS_START = datetime.now(timezone.utc)


def now() -> datetime:
    """Timezone-aware 'now'. Mock mode starts at the seeded morning and then moves with real time,
    so windows such as the 10-minute undo still behave."""
    if is_mock() and _cfg().get("mock_now"):
        base = datetime.fromisoformat(_cfg()["mock_now"]).astimezone(timezone.utc)
        return base + (datetime.now(timezone.utc) - _PROCESS_START)
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now().isoformat()


def tz_name() -> str:
    return _cfg().get("timezone", "Asia/Tokyo")


def local_now(tz: str | None = None) -> datetime:
    return now().astimezone(ZoneInfo(tz or tz_name()))


def today(tz: str | None = None) -> date:
    return local_now(tz).date()


def now_min(tz: str | None = None) -> int:
    n = local_now(tz)
    return n.hour * 60 + n.minute
