"""Ingestion pipeline (DG-B24): load -> chunk -> extract -> verify quotes -> dedupe -> resolve owner -> assign topic
-> detect conflict -> persist as PROPOSED, all in one transaction."""
import json
from datetime import date

import numpy as np

from app.adapters import get_gateway, get_llm
from app.domain import transcript as tx
from app.domain.owner_resolver import resolve_owner
from app.domain.verifier import verify_quote
from app.models.llm import ExtractResult
from app.repositories import decisions as dec_repo, meetings as meet_repo, people
from app.services import conflict, indexing
from app.storage.db import transaction
from app.utils.logger_config import get_logger

logger = get_logger(__name__)
TOPIC_MATCH = 0.78
DEDUPE_COSINE = 0.9
DEDUPE_SECONDS = 60


def _cos(a, b) -> float:
    a, b = np.array(a), np.array(b)
    d = np.linalg.norm(a) * np.linalg.norm(b)
    return float(a @ b / d) if d else 0.0


def _valid_date(s):
    try:
        return date.fromisoformat(s).isoformat() if s else None
    except ValueError:
        return None


def _topic_for(db, llm, item, emb) -> str:
    topics = dec_repo.topics_all(db)
    hint = (item.topic_hint or "").strip().casefold()
    if hint:
        for t in topics:
            if t["title"].casefold() == hint:
                return t["id"]
    best, best_s = None, 0.0
    for t in topics:
        if t["embedding"]:
            s = _cos(emb, t["embedding"])
            if s > best_s:
                best, best_s = t, s
    if best and best_s >= TOPIC_MATCH:
        return best["id"]
    label = (item.topic_hint or item.short_title or item.statement)[:60]
    return dec_repo.create_topic(db, label, llm.embed([label])[0])


def ingest_meeting(db, meeting_id: str, viewer_id: str) -> dict:
    """Entry point for the background job. Never raises: a failure marks the meeting FAILED and blocks nothing else."""
    try:
        return _run(db, meeting_id, viewer_id)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.exception("Ingestion failed for %s", meeting_id)
        meet_repo.set_status(db, meeting_id, "FAILED", failure_reason=f"{type(exc).__name__}: {exc}"[:300])
        db.commit()
        return {"status": "FAILED", "created": 0}


def _run(db, meeting_id: str, viewer_id: str) -> dict:
    llm, gw = get_llm(), get_gateway()
    meeting = meet_repo.get_raw(db, meeting_id)
    if meeting is None:
        raise ValueError("meeting not found")
    settings = people.get_settings(db, viewer_id)
    if not settings["analysis_enabled"] or "#nodaygraph" in (meeting.get("description") or "").casefold():
        meet_repo.set_status(db, meeting_id, "PROCESSED", ["Skipped: meeting analysis is off for this meeting."])
        db.commit()
        return {"status": "PROCESSED", "created": 0}

    # 1. load
    tr = meet_repo.get_transcript(db, meeting_id)
    segments = tr["segments"] if tr else gw.get_transcript(meeting_id)
    if not segments:
        raise ValueError("no transcript available")
    people_on = people.meeting_people(db, meeting_id)
    directory = people.directory(db)
    from_meet = meeting["source"] == "calendar"

    # 2-3. chunk + extract (a bad chunk is skipped, never trusted)
    raw_items = []
    for chunk in tx.chunk_segments(segments):
        payload = {"meeting_title": meeting["title"], "attendees": [p["name"] for p in people_on], "transcript_text": tx.render(chunk)}
        try:
            raw_items += ExtractResult.model_validate(llm.generate_json("extract", payload)).items
        except Exception as exc:  # noqa: BLE001
            logger.warning("Extract output rejected for a chunk of %s: %s", meeting_id, exc)

    # 4. verify quotes verbatim; speaker and offset come from the transcript, never from the model
    verified, rejected = [], 0
    for it in raw_items:
        m = verify_quote(it.quote, segments)
        if m.verified:
            verified.append((it, m))
        else:
            rejected += 1
            logger.info("Dropped ungrounded quote: %r (best match %.2f)", it.quote[:60], m.score)

    # 5. dedupe (chunk overlap can find the same decision twice)
    embs = llm.embed([f"{it.statement} {it.quote}" for it, _ in verified]) if verified else []
    kept: list[tuple] = []
    for (it, m), e in zip(verified, embs):
        if any(_cos(e, ke) >= DEDUPE_COSINE and abs(m.offset_sec - km.offset_sec) <= DEDUPE_SECONDS for _, km, ke in kept):
            continue
        kept.append((it, m, e))

    earlier_count = db.execute(
        "SELECT COUNT(*) FROM decisions d WHERE d.meeting_id != ? AND d.deleted_at IS NULL AND d.status IN ('ACTIVE','SUPERSEDED')",
        (meeting_id,)).fetchone()[0]

    rows, owner_checks, conflicts = [], 0, 0
    with transaction(db):
        for it, m, e in kept:
            # 6. owner
            res = resolve_owner(it.owner_mention, people_on, directory, it.addressed)
            owner_checks += int(res.needs_check)
            # 7. topic
            topic_id = _topic_for(db, llm, it, e)
            # 8. conflict, against ACTIVE decisions on that topic from meetings the viewer attended
            cands = dec_repo.conflict_candidates(db, viewer_id, topic_id)
            proposed = {"statement": it.statement, "quote": it.quote, "deadline": _valid_date(it.deadline)}
            cr = conflict.judge(llm, proposed, cands)
            conflicts += int(cr.conflict_state == "PENDING")
            lang = it.quote_lang
            did = dec_repo.insert(
                db, topic_id=topic_id, meeting_id=meeting_id, statement=it.statement, short_title=it.short_title or it.statement[:28],
                quote=it.quote, quote_lang=lang, translation=it.translation if lang != "en" else None,
                speaker_id=m.speaker_id, offset_sec=m.offset_sec, quote_match=m.score,
                owner_id=res.owner_id, owner_confidence=res.confidence, owner_candidates=res.candidates,
                deadline=proposed["deadline"], task_title=it.task_title or it.statement, task_short=it.task_short,
                status="PROPOSED", conflict_state=cr.conflict_state, conflict_target_id=cr.target_id,
                conflict_rationale=cr.rationale, conflict_note=cr.note, earlier_value=cr.earlier_value, proposed_value=cr.proposed_value,
                embedding=e, decided_at=meeting["start_at"])
            d = dec_repo.get_raw(db, did)
            indexing.index_decision(db, d)
            rows.append(did)
        n = len(rows)
        mins = (tr["duration_sec"] // 60) if tr else max(segments[-1]["offset_sec"] // 60, 1)
        summary = [
            "Fetched the transcript from Meet" if from_meet else f"Loaded the pasted transcript ({mins} min)",
            f"Found {n} decision{'s' if n != 1 else ''} and commitment{'s' if n != 1 else ''}" if n else "Found no decisions or commitments",
        ]
        if n:
            summary.append(f"Matched all {n} quotes word for word, in their original language" if not rejected
                           else f"Matched {n} quotes word for word. Dropped {rejected} the transcript did not contain.")
            summary.append("Matched owners to your directory." + ("" if not owner_checks else (" One needs your check." if owner_checks == 1 else f" {owner_checks} need your check.")))
            summary.append(f"Compared with {earlier_count} earlier decisions and found {conflicts} conflict{'s' if conflicts != 1 else ''}")
        meet_repo.set_status(db, meeting_id, "PROCESSED", summary)
    return {"status": "PROCESSED", "created": len(rows), "decision_ids": rows}
