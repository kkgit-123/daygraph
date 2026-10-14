from abc import ABC, abstractmethod
from typing import Any


class LLMClient(ABC):
    """Everything the business logic may ask of a language model. No SDK types cross this line.

    generate_json(task, payload) -> parsed JSON (dict or list). `task` is one of
    extract | conflict | answer | plan_estimates | link_summary | idea_tags.
    """

    mode: str = "abstract"

    @abstractmethod
    def generate_json(self, task: str, payload: dict) -> Any: ...

    @abstractmethod
    def generate_text(self, prompt: str) -> str: ...

    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]: ...
