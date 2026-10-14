from abc import ABC, abstractmethod


class GoogleGateway(ABC):
    """Everything DayGraph needs from Google Workspace. Business logic only sees this interface."""

    mode: str = "abstract"

    @abstractmethod
    def calendar_events(self, user_id: str, date: str) -> list[dict]:
        """Events for one local day: [{id, title, start_min, end_min, meeting_id?}]."""

    @abstractmethod
    def free_busy(self, user_id: str, date: str) -> list[tuple[int, int]]: ...

    @abstractmethod
    def create_task(self, user_id: str, title: str, due: str | None = None, notes: str | None = None) -> str: ...

    @abstractmethod
    def complete_task(self, user_id: str, google_task_id: str) -> None: ...

    @abstractmethod
    def delete_task(self, user_id: str, google_task_id: str) -> None: ...

    @abstractmethod
    def get_transcript(self, user_id: str, conference_ref: str) -> list[dict]:
        """Transcript lines of a Meet conference: [{idx, speaker_id: None, speaker_name, offset_sec, text}]."""

    @abstractmethod
    def directory(self) -> list[dict]: ...

    @abstractmethod
    def drive_docs(self, user_id: str) -> list[dict]:
        """Docs the viewer can open: [{id, title, url, edited_at}]."""

    @abstractmethod
    def document_text(self, user_id: str, url: str) -> str:
        """Plain text of a Google Doc the viewer can open (used for 'ingest a doc link')."""


class UpstreamUnavailable(Exception):
    """Raised by a gateway when Google cannot be reached. Callers keep the change in DayGraph and surface a notice."""
