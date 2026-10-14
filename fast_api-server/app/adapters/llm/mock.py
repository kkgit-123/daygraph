"""Deterministic LLM for mock mode: reads fixtures/llm/*.json, never touches the network."""
import hashlib
import json
import os
import re
import unicodedata
from typing import Any

import numpy as np

from app.adapters.llm.base import LLMClient

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "fixtures", "llm")
DIM = 256


def _load(prefix: str) -> list[dict]:
    out = []
    if not os.path.isdir(FIXTURE_DIR):
        return out
    for name in sorted(os.listdir(FIXTURE_DIR)):
        if name.startswith(prefix) and name.endswith(".json"):
            with open(os.path.join(FIXTURE_DIR, name), encoding="utf-8") as f:
                out.append(json.load(f))
    return out


def _tokens(text: str) -> list[str]:
    text = unicodedata.normalize("NFKC", text).casefold()
    return re.findall(r"\w+", text)


def hashed_embedding(text: str) -> list[float]:
    """Hashed bag-of-words + char trigrams into 256 dims, L2 normalised. Deterministic across runs."""
    vec = np.zeros(DIM, dtype=np.float64)
    toks = _tokens(text)
    feats = [("w", t) for t in toks]
    flat = " ".join(toks)
    feats += [("c", flat[i:i + 3]) for i in range(max(len(flat) - 2, 0))]
    for kind, f in feats:
        h = int.from_bytes(hashlib.blake2b(f"{kind}:{f}".encode(), digest_size=8).digest(), "big")
        vec[h % DIM] += 1.0 if kind == "w" else 0.5
    n = np.linalg.norm(vec)
    return (vec / n).tolist() if n else vec.tolist()


class MockLLM(LLMClient):
    mode = "mock"

    def generate_json(self, task: str, payload: dict) -> Any:
        handler = getattr(self, f"_{task}", None)
        if handler is None:
            return {}
        return handler(payload)

    # extract: fixture is picked by a phrase that must occur in the transcript text
    def _extract(self, p: dict) -> dict:
        text = p.get("transcript_text", "")
        for fx in _load("extract_"):
            if fx.get("match") and fx["match"] in text:
                return {"items": fx["items"]}
        return {"items": []}

    # conflict: safe default is "no relation"; target is the candidate whose statement contains the fixture phrase
    def _conflict(self, p: dict) -> dict:
        proposed = p.get("proposed", {}).get("statement", "")
        for fx in _load("conflict_"):
            if fx["match_proposed"] in proposed:
                for c in p.get("candidates", []):
                    if fx["target_contains"] in c.get("statement", ""):
                        res = dict(fx["result"])
                        res["target_id"] = c["id"]
                        return res
        return {"relation": "NONE", "target_id": None, "rationale": ""}

    # answer: intent routing by keywords; unknown questions get the safe empty result
    def _answer(self, p: dict) -> dict:
        q = p.get("question", "").casefold()
        key = None
        if "retry" in q or "saved" in q or "retries" in q:
            key = "retry"
        elif "launch" in q or "date" in q:
            key = "launch"
        if key is None:
            return {"sentences": []}
        for fx in _load("answer_"):
            if fx.get("key") == key:
                return {"sentences": fx["sentences"]}
        return {"sentences": []}

    def _plan_estimates(self, p: dict) -> dict:
        return {}

    def _link_summary(self, p: dict) -> dict:
        return {}

    def _idea_tags(self, p: dict) -> dict:
        return {"tags": []}

    def generate_text(self, prompt: str) -> str:
        return ""

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [hashed_embedding(t) for t in texts]
