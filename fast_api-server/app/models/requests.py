"""Request contracts (pydantic). Responses are built by the routers through set_response."""
from typing import Literal

from pydantic import BaseModel, Field


class DevLogin(BaseModel):
    user: Literal["aiko", "taro", "mei"]


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    notes: str | None = None
    due: str | None = None
    estimate_min: int | None = Field(default=None, ge=5, le=600)
    plan_date: str
    priority_slot: int | None = Field(default=None, ge=1, le=3)


class TaskPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    notes: str | None = None
    due: str | None = None
    estimate_min: int | None = Field(default=None, ge=5, le=600)
    state: Literal["OPEN", "DONE"] | None = None
    priority_slot: int | None = Field(default=None, ge=1, le=3)


class TaskMove(BaseModel):
    plan_date: str


class PrioritiesBody(BaseModel):
    task_ids: list[str] = Field(max_length=3)


class PlanDate(BaseModel):
    date: str


class PlanApply(BaseModel):
    date: str
    task_ids: list[str] = Field(max_length=3)
    blocks: list[dict] = Field(default_factory=list)


class UndoBody(BaseModel):
    undo_token: str


class OwnerBody(BaseModel):
    person_id: str


class AcceptBody(BaseModel):
    owner_person_id: str | None = None
    deadline: str | None = None


class SettingsPatch(BaseModel):
    work_start: str | None = None
    work_end: str | None = None
    lunch_start: str | None = None
    lunch_end: str | None = None
    timezone: str | None = None
    sync_focus_blocks: bool | None = None
    analysis_enabled: bool | None = None


class NoteBody(BaseModel):
    text: str = Field(max_length=20000)


class IdeaCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class IdeaPatch(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class LinkCreate(BaseModel):
    url: str = Field(min_length=4, max_length=2048)


class IngestBody(BaseModel):
    text: str | None = Field(default=None, max_length=200000)
    doc_url: str | None = None
    title: str | None = Field(default=None, max_length=200)


class AskBody(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    scope: list[Literal["decisions", "docs", "links", "notes", "ideas"]] | None = None
