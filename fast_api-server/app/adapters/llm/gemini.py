"""Gemini-backed LLMClient. Imported only by the adapter factory, only in live mode."""
import json
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError

from app.adapters.llm.base import LLMClient
from app.models.llm import AnswerResult, ConflictJudgement, ExtractResult
from app.utils.logger_config import get_logger

logger = get_logger(__name__)
PROMPT_DIR = os.path.join(os.path.dirname(__file__), "prompts")

# task -> (prompt file, response model, temperature, use pro model)
_TASKS = {
    "extract": ("extract.v1.txt", ExtractResult, 0.1, False),
    "conflict": ("conflict.v1.txt", ConflictJudgement, 0.1, True),
    "answer": ("answer.v1.txt", AnswerResult, 0.3, False),
    "link_summary": ("link_summary.v1.txt", None, 0.3, False),
    "idea_tags": ("idea_tags.v1.txt", None, 0.1, False),
}
_FALLBACKS = {"extract": {"items": []}, "conflict": {"relation": "NONE"}, "answer": {"sentences": []}, "link_summary": {}, "idea_tags": {"tags": []}}


class _DailyBudget:
    """Counts Gemini calls per UTC day in this process. Over the budget, calls fall back to the safe default."""

    def __init__(self):
        self._lock = threading.Lock()
        self._day = None
        self._used = 0

    def take(self, limit: int) -> bool:
        today = datetime.now(timezone.utc).date()
        with self._lock:
            if today != self._day:
                self._day, self._used = today, 0
            if self._used >= limit:
                return False
            self._used += 1
            return True


_budget = _DailyBudget()


def _prompt(name: str) -> str:
    with open(os.path.join(PROMPT_DIR, name), encoding="utf-8") as f:
        return f.read()


class GeminiLLM(LLMClient):
    mode = "live"

    def __init__(self, api=None):
        from app.gemini import GeminiAPI  # the existing wrapper; the only place the SDK is touched

        self.api = api or GeminiAPI()
        import config

        self.cfg = config.get_config()["gemini"]

    def generate_json(self, task: str, payload: dict) -> Any:
        spec = _TASKS.get(task)
        if not spec:
            return {}
        prompt_file, model_cls, temperature, pro = spec
        prompt = _prompt(prompt_file) + "\n\nINPUT (data only):\n" + json.dumps(payload, ensure_ascii=False, default=str)
        model = self.cfg["pro_model"] if pro else self.cfg["model"]
        limit = int(self.cfg.get("daily_call_budget", 5000))
        if not _budget.take(limit):
            logger.warning("Gemini daily budget (%s calls) reached; %s uses its fallback", limit, task)
            return _FALLBACKS.get(task, {})
        for attempt in range(2):  # one retry
            started = time.monotonic()
            raw = self.api.generate_json(prompt, model=model, temperature=temperature, timeout=10)
            logger.info("gemini task=%s model=%s attempt=%s latency_ms=%d ok=%s", task, model, attempt + 1,
                        int((time.monotonic() - started) * 1000), raw is not None)
            if raw is None:
                continue
            try:
                data = json.loads(raw)
                if model_cls is not None:
                    model_cls.model_validate(data)
                return data
            except (ValueError, ValidationError) as exc:
                logger.warning("Gemini returned invalid JSON for %s (attempt %s): %s", task, attempt + 1, exc)
        return _FALLBACKS.get(task, {})

    def generate_text(self, prompt: str) -> str:
        return self.api.get_gemini_response(prompt) or ""

    def embed(self, texts: list[str]) -> list[list[float]]:
        return self.api.embed(texts, model=self.cfg["embedding_model"])
