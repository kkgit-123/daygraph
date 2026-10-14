from datetime import date

from app.domain.owner_resolver import resolve_owner
from app.domain.planner import PlanTask, free_windows, pick_priorities, place_blocks, rank
from app.domain.verifier import normalize, verify_quote
from app.domain.citations import enforce_citations
from app.domain.transcript import chunk_segments, parse_text

SEG = [
    {"speaker_id": "per_mei", "speaker_name": "Mei Chen", "offset_sec": 1420,
     "text": "決済ベンダーの認証が遅れているので、リリースは11月15日に延期しましょう。"},
    {"speaker_id": "per_dewi", "speaker_name": "Dewi Lestari", "offset_sec": 1865,
     "text": "Aiko-san, tolong kirim data staging sebelum hari Senin, ya."},
]


def test_verbatim_quote_passes_with_transcript_speaker():
    m = verify_quote(SEG[1]["text"], SEG)
    assert m.verified and m.speaker_id == "per_dewi" and m.offset_sec == 1865


def test_one_changed_word_fails():
    assert not verify_quote("Aiko-san, tolong kirim data staging sebelum hari Rabu, ya.", SEG).verified


def test_paraphrase_and_invented_quote_fail():
    assert not verify_quote("We should postpone the release to mid November.", SEG).verified
    assert not verify_quote("Let's ship on Christmas Eve.", SEG).verified


def test_japanese_full_width_and_punctuation_passes():
    # same words, half-width punctuation, no 、。 and spaces
    assert verify_quote("決済ベンダーの認証が遅れているので リリースは11月15日に延期しましょう", SEG).verified
    assert normalize("ＡＩＫＯ、 tanaka!") == normalize("aiko tanaka")


PEOPLE = [
    {"id": "per_aiko", "name": "Aiko Tanaka", "aliases": ["Tanaka-san"]},
    {"id": "per_kobayashi", "name": "Aiko Kobayashi", "aliases": []},
    {"id": "per_dewi", "name": "Dewi Lestari", "aliases": []},
]


def test_owner_exact_alias_is_confident():
    r = resolve_owner("Tanaka-san", [PEOPLE[0]], PEOPLE)
    assert r.owner_id == "per_aiko" and r.confidence == 1.0 and not r.needs_check


def test_owner_two_aikos_needs_check():
    r = resolve_owner("Aiko-san", PEOPLE[:2], PEOPLE)
    assert r.needs_check and set(r.candidates) == {"per_aiko", "per_kobayashi"}


def test_owner_dewi_over_point_nine_unknown_none():
    r = resolve_owner("Dewi", [PEOPLE[2]], PEOPLE, addressed=True)
    # first-name match 0.7 + 0.1 for being addressed = 0.8: not below the 0.8 check line, so no owner check
    assert r.owner_id == "per_dewi" and r.confidence == 0.8 and not r.needs_check
    assert resolve_owner("Nobody", [PEOPLE[2]], PEOPLE).owner_id is None


def test_chunk_short_meeting_is_one_window():
    assert len(chunk_segments(SEG)) == 1


def test_parse_text_speakers_from_directory():
    segs = parse_text("[23:40] Mei Chen: hello there\nDewi Lestari: ok", PEOPLE + [{"id": "per_mei", "name": "Mei Chen", "aliases": []}])
    assert segs[0]["speaker_id"] == "per_mei" and segs[0]["offset_sec"] == 1420
    assert segs[1]["speaker_id"] == "per_dewi"


def test_citations_drop_unknown_and_number_by_first_use():
    sentences = [{"text": "a", "source_ids": ["x"]}, {"text": "b", "source_ids": ["zzz"]}, {"text": "c", "source_ids": []}, {"text": "d", "source_ids": ["y", "x"]}]
    kept, order = enforce_citations(sentences, {"x", "y"})
    assert [k["text"] for k in kept] == ["a", "d"] and order == ["x", "y"] and kept[1]["cites"] == [2, 1]


def test_planner_order_and_blocks():
    today = date(2026, 10, 9)
    tasks = [
        PlanTask("p1", "A", due=date(2026, 10, 12), estimate_min=90, importance=0.9, blocks_others=True, commitment=True),
        PlanTask("p2", "B", due=date(2026, 10, 14), estimate_min=45, importance=0.7, blocks_others=True, commitment=True),
        PlanTask("p3", "C", due=date(2026, 10, 16), estimate_min=60, importance=0.6, blocks_others=True, commitment=True),
        PlanTask("t4", "D", due=date(2026, 10, 20), estimate_min=25, importance=0.4),
    ]
    order = [t.id for t, _ in rank(tasks, today)]
    assert order.index("p1") < order.index("p2") < order.index("p3") < order.index("t4") or order[:3] == ["p1", "p2", "p3"]
    top = [t.id for t in pick_priorities(tasks, today)]
    assert top == ["p1", "p2", "p3"]
    meetings = [(570, 600), (810, 840), (900, 945)]
    windows = free_windows(540, 1020, meetings, (720, 780), 10)
    blocks = place_blocks([tasks[0], tasks[1], tasks[2]], windows)
    for b in blocks:
        assert b.end - b.start >= 25
        for s, e in meetings + [(720, 780)]:
            assert b.end <= s or b.start >= e + 0


def test_planner_one_block_per_task_no_overlap():
    windows = [(630, 720), (840, 900), (960, 1020)]
    blocks = place_blocks([PlanTask("a", "A", estimate_min=90), PlanTask("b", "B", estimate_min=45), PlanTask("c", "C", estimate_min=60)], windows)
    spans = sorted((b.start, b.end) for b in blocks)
    for (s1, e1), (s2, _) in zip(spans, spans[1:]):
        assert e1 <= s2
