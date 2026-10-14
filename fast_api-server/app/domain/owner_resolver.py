"""Owner resolution. Pure scoring rules; the model only supplies the mention text."""
import re
import unicodedata
from dataclasses import dataclass, field

_HONORIFICS = re.compile(r"(-?さん|-?san|-?sama|-?kun|-?chan)$", re.IGNORECASE)


def _norm(s: str) -> str:
    return _HONORIFICS.sub("", unicodedata.normalize("NFKC", s).strip()).casefold().strip()


def _first(name: str) -> str:
    return _norm(name).split(" ")[0]


@dataclass
class OwnerResolution:
    owner_id: str | None
    confidence: float
    needs_check: bool
    candidates: list[str] = field(default_factory=list)  # person ids, best first


def resolve_owner(mention: str | None, attendees: list[dict], directory: list[dict], addressed: bool = False) -> OwnerResolution:
    """Scores (per spec):
    exact name/alias 1.0 | first name among attendees 0.7 (-0.2 per extra attendee sharing it)
    | directory-only first name 0.6 | +0.1 when the speaker addresses the person.
    needs_check when best < 0.8 or the top two are within 0.15.
    A person dict needs: id, name, aliases (list[str]).
    """
    if not mention or not mention.strip():
        return OwnerResolution(None, 0.0, False, [])
    m = _norm(mention)
    attendee_ids = {p["id"] for p in attendees}
    scores: dict[str, float] = {}

    for p in directory + [a for a in attendees if a["id"] not in {d["id"] for d in directory}]:
        names = {_norm(p["name"])} | {_norm(a) for a in p.get("aliases", [])}
        if m in names:
            scores[p["id"]] = 1.0

    if not scores:
        sharing = [p for p in attendees if _first(p["name"]) == m or m == _norm(p["name"]).split(" ")[0]]
        for p in sharing:
            scores[p["id"]] = round(max(0.0, 0.7 - 0.2 * (len(sharing) - 1)), 2)
        if not sharing:
            for p in directory:
                if p["id"] not in attendee_ids and _first(p["name"]) == m:
                    scores[p["id"]] = 0.6

    if not scores:
        return OwnerResolution(None, 0.0, False, [])

    if addressed:
        scores = {k: round(min(1.0, v + 0.1), 2) for k, v in scores.items()}
    order = {p["id"]: i for i, p in enumerate(directory)}
    ranked = sorted(scores.items(), key=lambda kv: (-kv[1], order.get(kv[0], 999)))
    best_id, best = ranked[0]
    close = len(ranked) > 1 and (best - ranked[1][1]) < 0.15
    needs_check = best < 0.8 or close
    candidates = [pid for pid, _ in ranked] if needs_check else []
    return OwnerResolution(best_id, round(best, 2), needs_check, candidates)
