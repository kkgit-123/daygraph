"""Citation enforcement for Ask. Pure: no sentence survives without a source the viewer was allowed to see."""


def enforce_citations(sentences: list[dict], allowed_ids: set[str]) -> tuple[list[dict], list[str]]:
    """Drop every sentence whose source_ids are empty or contain nothing the viewer may see.

    Unknown ids are removed from a sentence; if none remain the sentence is dropped.
    Sources are numbered by first use. Returns ([{text, cites:[n]}], [ref_id in citation order]).
    """
    order: list[str] = []
    kept: list[dict] = []
    for s in sentences:
        text = (s.get("text") or "").strip()
        ids = [i for i in dict.fromkeys(s.get("source_ids") or []) if i in allowed_ids]
        if not text or not ids:
            continue
        cites = []
        for i in ids:
            if i not in order:
                order.append(i)
            cites.append(order.index(i) + 1)
        kept.append({"text": text, "cites": cites})
    return kept, order
