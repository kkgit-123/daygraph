"""Decision card shape for GET /decisions (DG-B27) and the source citation shape (DG-B33)."""
from datetime import date

from app.domain import labels
from app.repositories import decisions as dec_repo, meetings as meet_repo, people, misc
from app.services import clock
from app.services.permissions import visible_meeting
from app.utils.errors import not_found

STATE_MAP = {"PROPOSED": "pending", "ACTIVE": "accepted", "SUPERSEDED": "accepted", "DISMISSED": "dismissed"}
STATUS_FILTER = {"pending": ["PROPOSED"], "accepted": ["ACTIVE", "SUPERSEDED"], "dismissed": ["DISMISSED"]}


def _person(db, pid):
    return people.get_person(db, pid) if pid else None


def _meeting_card(db, m) -> dict:
    tz = clock.tz_name()
    start = labels.local(m["start_at"], tz)
    attendees = [{"id": p["id"], "initials": p["initials"], "bg": p["bg"], "color": p["fg"]}
                 for p in people.meeting_people(db, m["id"]) if p["attendance"] == "attended"]
    return {"id": m["id"], "title": m["title"], "when_label": f"{labels.WEEKDAYS[start.weekday()]} {start.day} {labels.MONTHS[start.month - 1]}, {start:%H:%M}",
            "attendees": attendees, "checks": m.get("check_summary") or [], "status": m["status"], "failure_reason": m.get("failure_reason")}


def _owner(db, d) -> dict:
    owner = _person(db, d["owner_id"])
    cands = []
    for pid in d.get("owner_candidates") or []:
        p = _person(db, pid)
        if p:
            cands.append({"person_id": p["id"], "name": p["name"], "role": p["role"], "initials": p["initials"]})
    if d["owner_confirmed"]:
        note = "Confirmed by you"
    elif cands:
        note = "Unclear, two people share this name"
    else:
        note = "Owner matched with high confidence"
    return {"person_id": owner["id"] if owner else None, "name": owner["name"] if owner else None,
            "initials": owner["initials"] if owner else "?", "bg": owner["bg"] if owner else "#E2E5EE",
            "note": note, "needs_check": bool(cands), "candidates": cands}


def _card(db, d: dict, meeting: dict) -> dict:
    tz = clock.tz_name()
    speaker = _person(db, d["speaker_id"])
    earlier = dec_repo.get_raw(db, d["conflict_target_id"]) if d["conflict_target_id"] else None
    state = STATE_MAP.get(d["status"], "pending")
    ddl = d["deadline"] and date.fromisoformat(d["deadline"])
    today = clock.today(tz)
    card = {
        "id": d["id"], "state": state, "statement": d["statement"],
        "quote": d["quote"], "quote_class": labels.quote_class(d["quote_lang"]), "translation": d["translation"] if d["quote_lang"] != "en" else None,
        "speaker": {"id": speaker["id"], "name": speaker["name"], "initials": speaker["initials"], "bg": speaker["bg"]} if speaker else None,
        "offset_label": labels.mmss(d["offset_sec"]), "language_label": labels.LANGUAGE_LABELS.get(d["quote_lang"], "English"),
        "quote_verified": (d["quote_match"] or 0) >= 0.9,
        "owner": _owner(db, d), "deadline": d["deadline"],
        "deadline_label": labels.due_label_for_card(d["deadline"], today),
        "task_title": d["task_title"] or d["statement"], "accepted_message": None,
        "accept_label": "Accept", "conflict": None,
    }
    due_text = (card["deadline_label"] or "")[4:]  # 'Due Mon 12 Oct' -> 'Mon 12 Oct'
    task_line = f"Task added to Google Tasks, due {due_text}." if due_text else "Task added to Google Tasks."
    if state == "accepted":
        card["accepted_message"] = task_line
    if earlier and d["conflict_state"] in ("PENDING", "SUPERSEDES", "KEPT_BOTH"):
        e_start = labels.local(dec_repo_meeting_start(db, earlier["meeting_id"]), tz)
        earlier_label = f"{e_start.day} {labels.MONTHS[e_start.month - 1]}"
        card["accept_label"] = f"Accept and replace the {earlier_label} decision"
        if state == "accepted":
            card["accepted_message"] = f"The {earlier_label} decision is now superseded. {task_line}"
        earlier_value = labels.short_date(date.fromisoformat(earlier["deadline"])) if earlier["deadline"] else None
        proposed_value = labels.short_date(ddl) if ddl else None
        card["conflict"] = {
            "earlier": {"id": earlier["id"], "value": d["earlier_value"] or earlier_value, "quote": earlier["quote"], "meta": f"Decided {earlier_label}"},
            "proposed": {"value": d["proposed_value"] or proposed_value, "delta_label": conflict_delta(earlier, d)},
            "rationale": d["conflict_rationale"], "note": d["conflict_note"],
        }
    return card


def dec_repo_meeting_start(db, meeting_id):
    """Start time (UTC ISO) of a meeting, used for 'Decided 3 Oct' labels."""
    row = db.execute("SELECT start_at FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
    return row["start_at"]


def conflict_delta(earlier, d) -> str | None:
    if not earlier["deadline"] or not d["deadline"]:
        return None
    days = (date.fromisoformat(d["deadline"]) - date.fromisoformat(earlier["deadline"])).days
    return f"{abs(days)} days {'later' if days > 0 else 'earlier'}" if days else "Same date"


def list_cards(db, viewer: dict, status: str | None, meeting_id: str | None) -> dict:
    uid = viewer["id"]
    statuses = None
    if status and status != "all":
        statuses = STATUS_FILTER.get(status)
        if statuses is None:
            raise not_found("Unknown status.")
    if meeting_id:
        if meet_repo.get_visible(db, uid, meeting_id) is None:
            raise not_found("Meeting not found.")
    rows = dec_repo.list_visible(db, uid, None, meeting_id)
    if statuses:
        rows = [r for r in rows if r["status"] in statuses]
    if meeting_id is None and rows:
        meeting_id = rows[-1]["meeting_id"] if status != "accepted" else rows[0]["meeting_id"]
    meeting = meet_repo.get_visible(db, uid, meeting_id) if meeting_id else None
    items = [_card(db, d, meeting) for d in rows if meeting_id is None or d["meeting_id"] == meeting_id]
    return {"meeting": _meeting_card(db, meeting) if meeting else None, "items": items}


def source_for(db, viewer: dict, ref_id: str) -> dict | None:
    """Citation object for a ref id, or None if the viewer may not see it (the caller returns 404)."""
    uid = viewer["id"]
    if ref_id.startswith("dec_"):
        d = dec_repo.get_visible(db, uid, ref_id)
        if d is None:
            return None
        m = meet_repo.get_raw(db, d["meeting_id"])
        tz = clock.tz_name()
        when = labels.local(m["start_at"], tz)
        speaker = _person(db, d["speaker_id"])
        attended = db.execute("SELECT 1 FROM meeting_attendees WHERE meeting_id = ? AND person_id = (SELECT person_id FROM users WHERE id = ?) AND status = 'attended'",
                              (m["id"], uid)).fetchone()
        access = "You attended this meeting" if attended else "You can see this because you were in the meeting."
        return {"type_label": "Decision", "ref_id": ref_id, "title": d["statement"], "meta": f"{m['title']}, {when.day} {labels.MONTHS[when.month-1]}, {labels.mmss(d['offset_sec'])}, {speaker['name'] if speaker else ''}",
                "passage": d["quote"], "passage_class": labels.quote_class(d["quote_lang"]), "translation": d["translation"],
                "access_note": access, "cta": f"Open in Meet at {labels.mmss(d['offset_sec'])}", "status": d["status"],
                "conflict_state": d["conflict_state"], "decided_label": f"Decided {when.day} {labels.MONTHS[when.month-1]}"}
    if ref_id.startswith("doc_"):
        doc = misc.get_visible_doc(db, uid, ref_id)
        if doc is None:
            return None
        return {"type_label": "Google Doc", "ref_id": ref_id, "title": doc["title"], "meta": f"Drive, edited {labels.short_date(date.fromisoformat(doc['edited_at'][:10]))}",
                "passage": doc["passage"], "passage_class": "q-en", "translation": None,
                "access_note": "You can see this because the document is shared with you.", "cta": "Open in Docs"}
    if ref_id.startswith("lnk_"):
        l = misc.get_link(db, uid, ref_id)
        if l is None:
            return None
        return {"type_label": "Saved link", "ref_id": ref_id, "title": l["title"] or l["url"], "meta": f"Saved {labels.short_date(date.fromisoformat(l['saved_at'][:10]))}",
                "passage": l["passage"] or l["summary"] or "", "passage_class": "q-en", "translation": None,
                "access_note": "Only you can see your saved reading.", "cta": "Open the page"}
    if ref_id.startswith("ide_"):
        i = misc.get_idea(db, uid, ref_id)
        if i is None:
            return None
        return {"type_label": "Idea", "ref_id": ref_id, "title": i["text"], "meta": f"Captured {labels.short_date(date.fromisoformat(i['created_at'][:10]))}",
                "passage": i["detail"] or i["text"], "passage_class": "q-en", "translation": None,
                "access_note": "Only you can see your ideas.", "cta": "Open in Ideas"}
    if ref_id.startswith("note_"):
        n = misc.get_note(db, uid, ref_id)
        if n is None:
            return None
        return {"type_label": "Scratchpad" if n["scope"] == "day" else "Note", "ref_id": ref_id, "title": n["title"] or "Note",
                "meta": "Your scratchpad", "passage": n["text"], "passage_class": "q-en", "translation": None,
                "access_note": "Only you can see your notes.", "cta": "Open the note"}
    return None
