import json

from app.repositories._util import d, ds, jload
from app.services.permissions import owned, visible_doc
from app.utils.ids import new_id


# ---- private, owner-only things ----
def ideas(db, viewer_id: str) -> list[dict]:
    rows = ds(db.execute(f"SELECT i.* FROM ideas i WHERE {owned('i')} ORDER BY i.created_at DESC", {"viewer_id": viewer_id}).fetchall())
    for r in rows:
        r["tags"] = jload(r["tags"], [])
    return rows


def get_idea(db, viewer_id: str, idea_id: str) -> dict | None:
    row = d(db.execute(f"SELECT i.* FROM ideas i WHERE i.id = :id AND {owned('i')}", {"id": idea_id, "viewer_id": viewer_id}).fetchone())
    if row:
        row["tags"] = jload(row["tags"], [])
    return row


def links(db, viewer_id: str) -> list[dict]:
    return ds(db.execute(f"SELECT l.* FROM links l WHERE {owned('l')} ORDER BY l.saved_at DESC", {"viewer_id": viewer_id}).fetchall())


def get_link(db, viewer_id: str, link_id: str) -> dict | None:
    return d(db.execute(f"SELECT l.* FROM links l WHERE l.id = :id AND {owned('l')}", {"id": link_id, "viewer_id": viewer_id}).fetchone())


def notes(db, viewer_id: str) -> list[dict]:
    return ds(db.execute(f"SELECT n.* FROM notes n WHERE {owned('n')} ORDER BY n.rowid", {"viewer_id": viewer_id}).fetchall())


def get_note(db, viewer_id: str, note_id: str) -> dict | None:
    return d(db.execute(f"SELECT n.* FROM notes n WHERE n.id = :id AND {owned('n')}", {"id": note_id, "viewer_id": viewer_id}).fetchone())


# ---- documents (ACL) ----
def get_visible_doc(db, viewer_id: str, doc_id: str) -> dict | None:
    return d(db.execute(f"SELECT doc.* FROM documents doc WHERE doc.id = :id AND {visible_doc('doc')}", {"id": doc_id, "viewer_id": viewer_id}).fetchone())


# ---- chat / impact / audit ----
def add_chat_turn(db, viewer_id: str, question: str, answer: dict, grounded: bool) -> str:
    cid = new_id("cht")
    db.execute("INSERT INTO chat_turns (id, owner_id, question, answer, grounded) VALUES (?,?,?,?,?)",
               (cid, viewer_id, question, json.dumps(answer, ensure_ascii=False), int(grounded)))
    return cid


def add_impact(db, viewer_id: str, kind: str, ref_id: str | None = None):
    db.execute("INSERT INTO impact_events (id, owner_id, kind, ref_id) VALUES (?,?,?,?)", (new_id("imp"), viewer_id, kind, ref_id))


def add_audit(db, actor_id: str | None, action: str, ref_id: str | None = None, detail: dict | None = None):
    db.execute("INSERT INTO audit_log (id, actor_id, action, ref_id, detail) VALUES (?,?,?,?,?)",
               (new_id("aud"), actor_id, action, ref_id, json.dumps(detail) if detail else None))
