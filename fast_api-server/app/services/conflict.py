"""Conflict judge (DG-B25). The model may only pick a target from the candidate list the code supplies, and it never
changes a decision's status: only a user action does."""
from dataclasses import dataclass

from app.domain import labels
from app.models.llm import ConflictJudgement
from app.utils.logger_config import get_logger

logger = get_logger(__name__)
FALLBACK_RATIONALE = "Both decisions cover the same topic. Check them before accepting."


@dataclass
class ConflictResult:
    conflict_state: str = "NONE"        # NONE | PENDING
    target_id: str | None = None
    rationale: str | None = None
    note: str | None = None
    earlier_value: str | None = None
    proposed_value: str | None = None


def judge(llm, proposed: dict, candidates: list[dict]) -> ConflictResult:
    if not candidates:
        return ConflictResult()
    ids = {c["id"] for c in candidates}
    payload = {
        "proposed": {"statement": proposed["statement"], "quote": proposed["quote"], "deadline": proposed.get("deadline")},
        "candidates": [{"id": c["id"], "statement": c["statement"], "quote": c["quote"], "deadline": c.get("deadline")} for c in candidates],
    }
    try:
        parsed = ConflictJudgement.model_validate(llm.generate_json("conflict", payload))
    except Exception as exc:  # timeout, invalid JSON, schema mismatch: be careful, not silent
        logger.warning("Conflict judge failed (%s); defaulting to CONTRADICTS with the most recent candidate", exc)
        newest = candidates[0]  # candidates are newest first
        return ConflictResult("PENDING", newest["id"], FALLBACK_RATIONALE, None, None, None)
    if parsed.relation in ("NONE", "DUPLICATE"):
        return ConflictResult()
    if parsed.target_id not in ids:
        logger.warning("Conflict judge named %r which is not in the candidate list; ignoring", parsed.target_id)
        return ConflictResult()
    return ConflictResult("PENDING", parsed.target_id, parsed.rationale.strip() or FALLBACK_RATIONALE,
                          parsed.proposed_note, parsed.earlier_value, parsed.proposed_value)


def delta(earlier: dict, proposed_deadline: str | None) -> str | None:
    return labels.delta_label(earlier.get("deadline"), proposed_deadline)
