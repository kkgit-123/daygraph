"""Ask pipeline (DG-B33): retrieve what the viewer may see, LLM answers from those sources only, drop uncited sentences."""
from app.adapters import get_llm
from app.domain.citations import enforce_citations
from app.repositories import misc
from app.services import cards, indexing
from app.services.retriever import LocalRetriever
from app.utils.logger_config import get_logger

logger = get_logger(__name__)
SCOPE_TO_KINDS = {"decisions": ["decision"], "docs": ["doc"], "links": ["link"], "notes": ["note"], "ideas": ["idea"]}
NOT_FOUND_FOOTER = "Nothing found. DayGraph never guesses."

SUGGESTIONS = [
    {"key": "launch", "text": "Why did we change the launch date?"},
    {"key": "retry", "text": "What did I save about retry strategies?"},
    {"key": "none", "text": "What did the legal team decide about data retention?"},
]


def _kinds(scope):
    if not scope:
        return ["decision", "doc", "link", "note", "idea"]
    out = []
    for s in scope:
        out += SCOPE_TO_KINDS.get(s, [])
    return out or ["decision", "doc", "link", "note", "idea"]


def ask(db, viewer: dict, question: str, scope=None) -> dict:
    uid = viewer["id"]
    r = LocalRetriever(get_llm())
    hits = r.search(db, uid, question, _kinds(scope), k=20)
    # the model only ever sees sources the viewer is allowed to open (filtered in SQL above)
    allowed = {h["ref_id"]: h for h in hits}
    sources = {}
    for ref in allowed:
        c = cards.source_for(db, viewer, ref)
        if c is not None:
            sources[ref] = c
    payload = {"question": question, "sources": [{"id": k, "type": v["type_label"], "title": v["title"], "text": v["passage"]} for k, v in sources.items()]}
    try:
        from app.models.llm import AnswerResult
        raw = get_llm().generate_json("answer", payload) or {}
        parsed = AnswerResult.model_validate(raw).sentences
        sentences = [s.model_dump() for s in parsed]
    except Exception as exc:  # noqa: BLE001 - invalid output is a not-found, never a guess
        logger.warning("Answer output rejected: %s", exc)
        sentences = []
    kept, order = enforce_citations(sentences, set(sources))
    if not kept:
        result = {"grounded": False, "question": question, "sentences": [], "citations": [], "footer": NOT_FOUND_FOOTER}
    else:
        citations = []
        for n, ref in enumerate(order, start=1):
            c = sources[ref]
            citations.append({"n": n, "ref_id": ref, "type_label": c["type_label"], "title": c["title"], "meta": c["meta"],
                              "passage": c["passage"], "passage_class": c["passage_class"], "translation": c["translation"],
                              "access_note": c["access_note"], "cta": c["cta"]})
        footer = f"{len(kept)} sentence{'s' if len(kept) != 1 else ''}, {len(order)} source{'s' if len(order) != 1 else ''}. Every sentence has a source."
        result = {"grounded": True, "question": question, "sentences": kept, "citations": citations, "footer": footer}
    misc.add_chat_turn(db, uid, question, result, result["grounded"])
    misc.add_impact(db, uid, "ask", None)
    return result
