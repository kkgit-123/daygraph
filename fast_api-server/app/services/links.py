"""Saved links (DG-B18). Status flow: queued -> ready | metadata_only | failed.

Mock mode never touches the network: the link is saved as metadata_only. Live mode fetches the page through the
safe fetcher in a background job. Summary and takeaways come from the LLM (`link_summary`) and are validated."""
import json
import re
from html import unescape
from urllib.parse import urlsplit

from app.adapters import get_llm
from app.repositories import misc
from app.services import clock, indexing, jobs, url_safety
from app.services.clock import is_mock
from app.storage.db import transaction
from app.utils.errors import ApiError
from app.utils.ids import new_id
from app.utils.logger_config import get_logger

logger = get_logger(__name__)
TAG = re.compile(r"<(script|style)[^>]*>.*?</\1>|<[^>]+>", re.DOTALL | re.IGNORECASE)
TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.DOTALL | re.IGNORECASE)
PASSAGE_CHARS = 4000


def _text_and_title(html: str) -> tuple[str | None, str]:
    m = TITLE.search(html)
    title = unescape(m.group(1)).strip()[:200] if m else None
    text = unescape(TAG.sub(" ", html))
    return title or None, re.sub(r"\s+", " ", text).strip()[:PASSAGE_CHARS]


def _summarise(url: str, title: str | None, passage: str) -> tuple[str | None, list[str]]:
    """Summary and takeaways from the LLM. Invalid output means no summary, never a guess."""
    if not passage:
        return None, []
    try:
        raw = get_llm().generate_json("link_summary", {"url": url, "title": title or "", "text": passage}) or {}
    except Exception as exc:  # noqa: BLE001 - the summary is optional
        logger.warning("Link summary failed: %s", exc)
        return None, []
    summary = raw.get("summary") if isinstance(raw.get("summary"), str) else None
    takeaways = [t for t in raw.get("takeaways", []) if isinstance(t, str)][:5]
    return (summary or None), takeaways


def _update(db, link_id: str, **fields):
    cols = ", ".join(f"{k} = ?" for k in fields)
    db.execute(f"UPDATE links SET {cols} WHERE id = ?", (*fields.values(), link_id))
    row = db.execute("SELECT * FROM links WHERE id = ?", (link_id,)).fetchone()
    indexing.index_link(db, dict(row))


def fetch_job(db, link_id: str):
    """Background job (live mode): fetch, extract, summarise. Any failure marks the link failed, never removes it."""
    row = db.execute("SELECT * FROM links WHERE id = ?", (link_id,)).fetchone()
    if row is None or row["deleted_at"]:
        return
    try:
        page = url_safety.fetch(row["canonical_url"])
        title, passage = _text_and_title(page["body"]) if "html" in page["content_type"] or not page["content_type"] else (None, "")
        summary, takeaways = _summarise(row["canonical_url"], title, passage)
        _update(db, link_id, title=title or row["title"], passage=passage or None, summary=summary,
                takeaways=json.dumps(takeaways, ensure_ascii=False), status="ready")
    except ApiError as exc:
        logger.warning("Link %s failed: %s", link_id, exc.detail)
        _update(db, link_id, status="failed")
    except Exception:  # noqa: BLE001 - a job must never take the server down
        logger.exception("Link %s failed unexpectedly", link_id)
        _update(db, link_id, status="failed")


def save(db, viewer: dict, url: str) -> tuple[int, dict]:
    """Returns (http status, link). A duplicate canonical URL returns the existing record."""
    uid = viewer["id"]
    canon = url_safety.validate(url, resolve=not is_mock())
    existing = db.execute("SELECT * FROM links WHERE owner_id = ? AND canonical_url = ? AND deleted_at IS NULL", (uid, canon)).fetchone()
    if existing:
        return 200, dict(existing)
    host = urlsplit(canon).hostname or canon
    lid = new_id("lnk")
    with transaction(db):
        db.execute("INSERT INTO links (id, owner_id, url, canonical_url, title, summary, passage, status, saved_at) VALUES (?,?,?,?,?,?,?,?,?)",
                   (lid, uid, url.strip(), canon, host, None, None, "queued", clock.now_iso()))
        misc.add_audit(db, uid, "link.save", lid)
        if is_mock():
            db.execute("UPDATE links SET status = 'metadata_only' WHERE id = ?", (lid,))
    if not is_mock():
        jobs.enqueue(fetch_job, lid)
    row = dict(db.execute("SELECT * FROM links WHERE id = ?", (lid,)).fetchone())
    with transaction(db):
        indexing.index_link(db, row)
    return 201, row


def to_out(l: dict) -> dict:
    takeaways = l.get("takeaways")
    return {"id": l["id"], "url": l["url"], "title": l["title"], "summary": l["summary"],
            "takeaways": json.loads(takeaways) if takeaways else [], "status": l["status"], "saved_at": l["saved_at"]}
