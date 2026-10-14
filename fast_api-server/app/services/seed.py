"""Seed data (fixtures/seed.json, strings copied from daygraph.html). Loaded on startup when the DB is empty."""
import json
import os

from app.adapters import get_llm
from app.repositories._util import ds
from app.services import indexing
from app.storage.db import create_tables, transaction

FIXTURES = os.path.join(os.path.dirname(__file__), "..", "fixtures")
_TABLES_IN_DELETE_ORDER = [
    "search_index", "audit_log", "impact_events", "chat_turns", "plan_snapshots", "plan_blocks", "tasks", "links", "ideas", "notes",
    "document_acl", "documents", "decisions", "topics", "transcripts", "meeting_attendees", "meetings", "user_settings",
    "connections", "users", "people",
]


def _insert(db, table: str, row: dict):
    row = {k: (json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v) for k, v in row.items()}
    cols = list(row)
    db.execute(f"INSERT INTO {table} ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})", list(row.values()))


def is_empty(db) -> bool:
    return db.execute("SELECT COUNT(*) FROM people").fetchone()[0] == 0


def seed(db):
    with open(os.path.join(FIXTURES, "seed.json"), encoding="utf-8") as f:
        data = json.load(f)
    llm = get_llm()
    with transaction(db):
        for p in data["people"]:
            _insert(db, "people", p)
        for u in data["users"]:
            _insert(db, "users", u)
            db.execute("INSERT INTO user_settings (user_id) VALUES (?)", (u["id"],))
        for c in data["connections"]:
            _insert(db, "connections", c)
        for m in data["meetings"]:
            _insert(db, "meetings", m)
        for a in data["meeting_attendees"]:
            _insert(db, "meeting_attendees", a)
        for t in data["topics"]:
            _insert(db, "topics", {**t, "embedding": llm.embed([t["title"]])[0]})
        for dcs in data["decisions"]:
            text = " ".join(x for x in (dcs["statement"], dcs["quote"], dcs.get("translation")) if x)
            _insert(db, "decisions", {**dcs, "embedding": llm.embed([text])[0]})
        # tasks reference decisions, so they come after
        for t in data["tasks"]:
            _insert(db, "tasks", t)
        for b in data["plan_blocks"]:
            _insert(db, "plan_blocks", b)
        for n in data["notes"]:
            _insert(db, "notes", n)
        for i in data["ideas"]:
            _insert(db, "ideas", i)
        for l in data["links"]:
            _insert(db, "links", l)
        for doc in data["documents"]:
            acl = doc.pop("acl")
            _insert(db, "documents", doc)
            for pid in acl:
                db.execute("INSERT INTO document_acl (document_id, person_id) VALUES (?,?)", (doc["id"], pid))
        # transcript for the seeded meeting (the ingestion fixture reads the same file)
        with open(os.path.join(FIXTURES, "transcript_mtg_pls.json"), encoding="utf-8") as f:
            tr = json.load(f)
        _insert(db, "transcripts", {"id": "trn_pls", "meeting_id": "mtg_pls", "segments": tr["segments"], "duration_sec": tr["duration_sec"]})
        reindex(db)


def reindex(db):
    db.execute("DELETE FROM search_index")
    for d in [dict(r) for r in db.execute("SELECT * FROM decisions WHERE deleted_at IS NULL")]:
        indexing.index_decision(db, d)
    for doc in ds(db.execute("SELECT * FROM documents WHERE deleted_at IS NULL")):
        indexing.index_doc(db, doc)
    for l in ds(db.execute("SELECT * FROM links WHERE deleted_at IS NULL")):
        indexing.index_link(db, l)
    for n in ds(db.execute("SELECT * FROM notes WHERE deleted_at IS NULL")):
        indexing.index_note(db, n)
    for i in ds(db.execute("SELECT * FROM ideas WHERE deleted_at IS NULL")):
        indexing.index_idea(db, i)


def seed_if_empty(db):
    create_tables(db)
    if is_empty(db):
        seed(db)
        return True
    return False


def reset(db):
    """Dev only: wipe everything and restore the seed."""
    db.execute("PRAGMA foreign_keys = OFF")
    for t in _TABLES_IN_DELETE_ORDER:
        db.execute(f"DELETE FROM {t}")
    db.commit()
    db.execute("PRAGMA foreign_keys = ON")
    seed(db)
