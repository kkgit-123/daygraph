"""Pydantic contracts for everything an LLM may return. Model output is never trusted before it passes these."""
from typing import Literal

from pydantic import BaseModel, Field


class ExtractedDecision(BaseModel):
    statement: str
    short_title: str | None = None
    quote: str
    quote_lang: Literal["en", "ja", "id"] = "en"
    translation: str | None = None
    owner_mention: str | None = None
    addressed: bool = True
    deadline: str | None = None
    task_title: str | None = None
    task_short: str | None = None
    topic_hint: str | None = None


class ExtractResult(BaseModel):
    items: list[ExtractedDecision] = Field(default_factory=list)


class ConflictJudgement(BaseModel):
    relation: Literal["NONE", "CONTRADICTS", "SUPERSEDES", "DUPLICATE"] = "NONE"
    target_id: str | None = None
    rationale: str = ""
    earlier_value: str | None = None
    proposed_value: str | None = None
    proposed_note: str | None = None


class AnswerSentence(BaseModel):
    text: str
    source_ids: list[str] = Field(default_factory=list)


class AnswerResult(BaseModel):
    sentences: list[AnswerSentence] = Field(default_factory=list)
