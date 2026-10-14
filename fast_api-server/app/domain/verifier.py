"""Quote verification. Pure: a model quote is only accepted if it is really in the transcript."""
import re
import unicodedata
from dataclasses import dataclass

from rapidfuzz import fuzz

THRESHOLD = 0.90


def normalize(text: str) -> str:
    """NFKC, casefold, drop punctuation / symbols / whitespace."""
    text = unicodedata.normalize("NFKC", text).casefold()
    return "".join(ch for ch in text if unicodedata.category(ch)[0] not in ("P", "S", "Z", "C"))


@dataclass
class QuoteMatch:
    score: float          # 0..1
    verified: bool
    segment_index: int | None
    speaker_id: str | None
    speaker_name: str | None
    offset_sec: int | None


def _score(nq: str, nt: str, words: list[str]) -> float:
    """1.0 for an exact normalised substring. Latin quotes must keep every word (one changed word fails).
    Otherwise (CJK, no spaces) a fuzzy partial ratio, which must reach THRESHOLD to be accepted."""
    if not nq or not nt:
        return 0.0
    if nq in nt:
        return 1.0
    if words and all(w in nt for w in words):
        return 1.0
    if words:
        return 0.0
    return fuzz.partial_ratio(nq, nt) / 100.0


def _latin_words(quote: str) -> list[str]:
    return [normalize(w) for w in re.findall(r"[A-Za-z0-9]+", unicodedata.normalize("NFKC", quote)) if len(w) > 1]


def verify_quote(quote: str, segments: list[dict]) -> QuoteMatch:
    """Find the transcript segment that best contains `quote`.

    Speaker and offset come from the transcript segment, never from the model. Single segments are tried first;
    only when none matches is a quote spanning two adjacent segments checked (attributed to the first).
    """
    nq = normalize(quote)
    words = _latin_words(quote) if re.search(r"[A-Za-z]", quote) and len(_latin_words(quote)) >= 3 else []
    if re.search(r"[A-Za-z]", quote) and not words:
        words = []
    best, best_i = 0.0, None
    for i, seg in enumerate(segments):
        s = _score(nq, normalize(seg["text"]), words)
        if s > best:
            best, best_i = s, i
        if s == 1.0:
            break
    if best < 1.0:
        for i in range(len(segments) - 1):
            s = _score(nq, normalize(segments[i]["text"] + segments[i + 1]["text"]), words)
            if s > best:
                best, best_i = s, i
    if best_i is None or best < THRESHOLD:
        return QuoteMatch(round(best, 3), False, None, None, None, None)
    seg = segments[best_i]
    return QuoteMatch(round(best, 3), True, best_i, seg.get("speaker_id"), seg.get("speaker_name"), seg.get("offset_sec"))
