"""My impact numbers (DG-B19). Own numbers only, never a ranking of people.

Mock mode serves fixtures/impact.json (the PROTO numbers). Live mode computes from the viewer's own rows.
Review time is an estimate: each recorded review action counts as REVIEW_SECONDS (see docs/DECISIONS.md)."""
import json
import math
import os
from datetime import date, timedelta

from app.domain import labels
from app.repositories import decisions as dec_repo
from app.services import clock
from app.services.permissions import visible_decision, visible_meeting

FIXTURE = os.path.join(os.path.dirname(__file__), "..", "fixtures", "impact.json")
REVIEW_SECONDS = 30
DAYS = 7


def _mock() -> dict:
    with open(FIXTURE, encoding="utf-8") as f:
        return json.load(f)


def _window(today: date) -> list[date]:
    return [today - timedelta(days=DAYS - 1 - i) for i in range(DAYS)]


def _live(db, viewer: dict) -> dict:
    uid, tz = viewer["id"], clock.tz_name()
    today = clock.today(tz)
    days = _window(today)
    week_start = days[0].isoformat()

    decisions_total = db.execute(f"SELECT COUNT(*) FROM decisions d WHERE d.status != 'DISMISSED' AND {visible_decision('d')}",
                                 {"viewer_id": uid}).fetchone()[0]
    decisions_week = db.execute(f"SELECT COUNT(*) FROM decisions d WHERE d.status != 'DISMISSED' AND date(d.created_at) >= :since AND {visible_decision('d')}",
                                {"viewer_id": uid, "since": week_start}).fetchone()[0]
    decisions_series = [db.execute(f"SELECT COUNT(*) FROM decisions d WHERE d.status != 'DISMISSED' AND date(d.created_at) = :day AND {visible_decision('d')}",
                                   {"viewer_id": uid, "day": dd.isoformat()}).fetchone()[0] for dd in days]

    done = db.execute("SELECT completed_at, due FROM tasks WHERE owner_id = ? AND state = 'DONE' AND due IS NOT NULL AND deleted_at IS NULL", (uid,)).fetchall()
    on_time = sum(1 for r in done if r["completed_at"] and r["completed_at"][:10] <= r["due"])
    pct = round(on_time / len(done) * 100) if done else 0

    pending = dec_repo.count_pending_visible(db, uid)
    conflicts_series = [db.execute(f"SELECT COUNT(*) FROM decisions d WHERE d.conflict_state != 'NONE' AND date(d.created_at) = :day AND {visible_decision('d')}",
                                   {"viewer_id": uid, "day": dd.isoformat()}).fetchone()[0] for dd in days]
    conflicts_total = db.execute(f"SELECT COUNT(*) FROM decisions d WHERE d.conflict_state != 'NONE' AND {visible_decision('d')}", {"viewer_id": uid}).fetchone()[0]

    reviews_week = db.execute("SELECT COUNT(*) FROM impact_events WHERE owner_id = ? AND kind = 'review' AND date(created_at) >= ?", (uid, week_start)).fetchone()[0]
    review_min = math.ceil(reviews_week * REVIEW_SECONDS / 60)

    weekly = []
    for dd in days:
        focus = db.execute("SELECT COALESCE(SUM(end_min - start_min), 0) FROM plan_blocks WHERE owner_id = ? AND plan_date = ? AND deleted_at IS NULL",
                           (uid, dd.isoformat())).fetchone()[0]
        meetings = db.execute(f"SELECT m.start_at, m.end_at FROM meetings m WHERE {visible_meeting('m')}", {"viewer_id": uid}).fetchall()
        meeting_min = sum((labels.local(m["end_at"], tz) - labels.local(m["start_at"], tz)).seconds // 60
                          for m in meetings if labels.local(m["start_at"], tz).date() == dd)
        weekly.append({"day": labels.WEEKDAYS[dd.weekday()][:3], "focus_h": round(focus / 60, 1), "meeting_h": round(meeting_min / 60, 1), "is_today": dd == today})

    return {
        "stats": [
            {"key": "decisions", "value": decisions_total, "label": "Decisions captured this week", "note": f"+{decisions_week} this week",
             "tone": "ok", "series": decisions_series},
            {"key": "on_time", "value": f"{on_time} of {len(done)}", "percent": pct, "label": "Tasks done by their deadline",
             "note": f"{pct}% on time" if done else "No finished tasks with a deadline yet", "tone": "ok",
             "series": [0] * DAYS},
            {"key": "conflicts", "value": conflicts_total, "label": "Conflicts caught early",
             "note": "None waiting" if pending == 0 else f"{pending} waiting for your review", "tone": "conflict", "series": conflicts_series},
            {"key": "review_time", "value": f"{review_min} min", "label": "Time to review a meeting",
             "note": f"Estimated at {REVIEW_SECONDS} seconds per review", "tone": "quiet", "series": [0] * DAYS},
        ],
        "weekly": weekly,
    }


def for_viewer(db, viewer: dict) -> dict:
    return _mock() if clock.is_mock() else _live(db, viewer)
