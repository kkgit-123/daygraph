"""Display labels computed on the server exactly as the prototype shows them. Pure functions."""
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def iso(dt: datetime) -> str:
    return dt.isoformat()


def local(value: str | datetime, tz: str) -> datetime:
    dt = parse_dt(value) if isinstance(value, str) else value
    return dt.astimezone(ZoneInfo(tz))


def hhmm(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def to_min(hhmm_str: str) -> int:
    h, m = hhmm_str.split(":")
    return int(h) * 60 + int(m)


def mmss(seconds: int) -> str:
    return f"{seconds // 60}:{seconds % 60:02d}"


def day_title(d: date) -> str:
    return f"{WEEKDAYS[d.weekday()]}, {d.day} {MONTHS_LONG[d.month - 1]}"


def short_date(d: date) -> str:
    return f"{d.day} {MONTHS[d.month - 1]}"


def weekday_short_date(d: date) -> str:
    return f"{WEEKDAYS[d.weekday()][:3]} {d.day} {MONTHS[d.month - 1]}"


def due_label_for_card(deadline: str | None, today: date) -> str | None:
    """PROTO: 'Due 15 Nov', 'Due Mon 12 Oct', 'Due Fri 16 Oct' (weekday shown when within 7 days)."""
    if not deadline:
        return None
    d = date.fromisoformat(deadline)
    delta = (d - today).days
    if 0 <= delta <= 7:
        return f"Due {weekday_short_date(d)}"
    return f"Due {short_date(d)}"


def when_word(d: date, today: date) -> str:
    return "today" if d == today else short_date(d)


def greeting(hour: int) -> str:
    return "Good morning" if hour < 12 else "Good afternoon" if hour < 18 else "Good evening"


def delta_label(earlier_deadline: str | None, proposed_deadline: str | None) -> str | None:
    if not earlier_deadline or not proposed_deadline:
        return None
    days = (date.fromisoformat(proposed_deadline) - date.fromisoformat(earlier_deadline)).days
    if days == 0:
        return "Same date"
    return f"{abs(days)} days {'later' if days > 0 else 'earlier'}"


def quote_class(lang: str) -> str:
    return {"ja": "q-jp", "en": "q-en", "id": "q-en"}.get(lang, "q-en")


LANGUAGE_LABELS = {"ja": "Japanese", "en": "English", "id": "Bahasa Indonesia and English"}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
