"""Transcript helpers. Pure: parsing pasted text and chunking by speaker turns."""
import re

_LINE = re.compile(r"^\s*(?:\[?(?P<ts>\d{1,2}:\d{2}(?::\d{2})?)\]?\s+)?(?P<speaker>[^:：\n]{1,40})[:：]\s*(?P<text>.+)$")


def _seconds(ts: str | None, fallback: int) -> int:
    if not ts:
        return fallback
    parts = [int(x) for x in ts.split(":")]
    return parts[0] * 3600 + parts[1] * 60 + parts[2] if len(parts) == 3 else parts[0] * 60 + parts[1]


def parse_text(text: str, directory: list[dict]) -> list[dict]:
    """'[23:40] Mei Chen: ...' or 'Mei: ...' lines -> segments. Speaker ids come from the directory, never guessed."""
    by_name = {}
    for p in directory:
        for n in [p["name"], *p.get("aliases", [])]:
            by_name[n.casefold()] = p
    segs = []
    for line in text.splitlines():
        if not line.strip():
            continue
        m = _LINE.match(line)
        if m:
            speaker, body = m.group("speaker").strip(), m.group("text").strip()
            person = by_name.get(speaker.casefold())
            segs.append({"idx": len(segs), "speaker_id": person["id"] if person else None,
                         "speaker_name": person["name"] if person else speaker,
                         "offset_sec": _seconds(m.group("ts"), len(segs) * 15), "text": body})
        elif segs:  # continuation line
            segs[-1]["text"] += " " + line.strip()
        else:
            segs.append({"idx": 0, "speaker_id": None, "speaker_name": "Unknown", "offset_sec": 0, "text": line.strip()})
    return segs


def tokens(text: str) -> int:
    """Cheap token estimate: ~4 chars per token for Latin, ~1 per CJK character."""
    cjk = sum(1 for c in text if ord(c) > 0x2E80)
    return cjk + (len(text) - cjk) // 4 + 1


def chunk_segments(segments: list[dict], max_tokens: int = 8000, overlap_tokens: int = 500) -> list[list[dict]]:
    """Windows of whole speaker turns (~max_tokens each) overlapping by ~overlap_tokens. One window for short meetings."""
    sizes = [tokens(s["text"]) + 6 for s in segments]
    if sum(sizes) <= max_tokens:
        return [segments] if segments else []
    chunks, start = [], 0
    while start < len(segments):
        total, end = 0, start
        while end < len(segments) and (total + sizes[end] <= max_tokens or end == start):
            total += sizes[end]
            end += 1
        chunks.append(segments[start:end])
        if end >= len(segments):
            break
        back, acc = end, 0
        while back > start + 1 and acc < overlap_tokens:
            back -= 1
            acc += sizes[back]
        start = back if back > start else end
    return chunks


def render(segments: list[dict]) -> str:
    return "\n".join(f"[{s['offset_sec'] // 60}:{s['offset_sec'] % 60:02d}] {s['speaker_name']}: {s['text']}" for s in segments)
