"""Keeps the retriever index in step with the things Ask can cite (DG-B32)."""
from app.adapters import get_llm
from app.services.retriever import LocalRetriever


def retriever() -> LocalRetriever:
    return LocalRetriever(get_llm())


def index_decision(db, d: dict):
    text = " ".join(x for x in (d["statement"], d["quote"], d.get("translation")) if x)
    retriever().index(db, "decision", d["id"], text, meeting_id=d["meeting_id"])


def index_doc(db, doc: dict):
    retriever().index(db, "doc", doc["id"], f"{doc['title']}. {doc['passage']}")


def index_link(db, link: dict):
    retriever().index(db, "link", link["id"], f"{link.get('title') or ''}. {link.get('passage') or link.get('summary') or ''}", owner_user_id=link["owner_id"])


def index_note(db, note: dict):
    retriever().index(db, "note", note["id"], f"{note.get('title') or ''}. {note['text']}", owner_user_id=note["owner_id"])


def index_idea(db, idea: dict):
    retriever().index(db, "idea", idea["id"], f"{idea['text']}. {idea.get('detail') or ''}", owner_user_id=idea["owner_id"])
