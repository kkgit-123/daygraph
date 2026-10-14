"""Deterministic Google for mock mode. Records every call so tests can assert on write-back."""
import json
import os

from app.adapters.google.base import GoogleGateway, UpstreamUnavailable
from app.domain import transcript as tx

MOCK_TRANSCRIPT_DOC = "https://docs.google.com/document/d/mock-transcript-mtg-pls"

FIXTURES = os.path.join(os.path.dirname(__file__), "..", "..", "fixtures")
MOCK_DAY = "2026-10-09"
_EVENTS = [
    {"id": "mtg_pls", "title": "Payments launch sync", "start_min": 9 * 60 + 30, "end_min": 10 * 60, "meeting_id": "mtg_pls"},
    {"id": "cal_weekly", "title": "Weekly team sync", "start_min": 13 * 60 + 30, "end_min": 14 * 60, "meeting_id": None},
    {"id": "cal_design", "title": "Design review: retry policy", "start_min": 15 * 60, "end_min": 15 * 60 + 45, "meeting_id": None},
]


class MockGateway(GoogleGateway):
    mode = "mock"

    def __init__(self):
        self.calls: list[tuple] = []
        self.fail_writes = False  # tests flip this to simulate "Google Tasks is down"
        self._seq = 0

    def calendar_events(self, user_id, date):
        self.calls.append(("calendar_events", user_id, date))
        return [dict(e) for e in _EVENTS] if date == MOCK_DAY and user_id == "usr_aiko" else []

    def free_busy(self, user_id, date):
        return [(e["start_min"], e["end_min"]) for e in self.calendar_events(user_id, date)]

    def _write(self, name, *args):
        if self.fail_writes:
            raise UpstreamUnavailable("mock Google Tasks is down")
        self.calls.append((name, *args))

    def create_task(self, user_id, title, due=None, notes=None):
        self._write("create_task", user_id, title, due)
        self._seq += 1
        return f"gt_mock_{self._seq}"

    def complete_task(self, user_id, google_task_id):
        self._write("complete_task", user_id, google_task_id)

    def delete_task(self, user_id, google_task_id):
        self._write("delete_task", user_id, google_task_id)

    def get_transcript(self, user_id, conference_ref):
        if conference_ref == "mtg_pls":
            with open(os.path.join(FIXTURES, "transcript_mtg_pls.json"), encoding="utf-8") as f:
                return json.load(f)["segments"]
        return []

    def directory(self):
        with open(os.path.join(FIXTURES, "seed.json"), encoding="utf-8") as f:
            return [p for p in json.load(f)["people"] if p.get("in_directory", 1)]

    def drive_docs(self, user_id):
        return []

    def document_text(self, user_id, url):
        # mock mode has no Drive: only the sample transcript link resolves, so the demo runs offline
        if url.rstrip("/") == MOCK_TRANSCRIPT_DOC:
            return tx.render(self.get_transcript(user_id, "mtg_pls"))
        raise UpstreamUnavailable("In mock mode only the sample transcript document can be opened. Paste the text instead.")

    # test helper
    def calls_named(self, name):
        return [c for c in self.calls if c[0] == name]
