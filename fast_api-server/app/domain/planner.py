"""Day planner. Pure functions: no I/O, no clock, no model calls. Times are minutes since local midnight."""
from dataclasses import dataclass, field
from datetime import date

DEFAULT_WEIGHTS = {"urgency": 3.0, "importance": 2.0, "blocks_others": 2.0, "commitment": 1.5, "effort": 1.0}
URGENCY_HORIZON_DAYS = 14
BIG_TASK_MIN = 180
MIN_BLOCK = 25
SLACK = 0.2


@dataclass
class PlanTask:
    id: str
    title: str
    due: date | None = None
    estimate_min: int = 30
    importance: float = 0.5          # 0..1 (model estimate, or default)
    blocks_others: bool = False
    commitment: bool = False
    meta: dict = field(default_factory=dict)


@dataclass
class Block:
    task_id: str
    title: str
    start: int
    end: int
    why: str


def urgency(due: date | None, today: date) -> float:
    """0 with no due date; rises linearly to 1 on (or after) the due date."""
    if due is None:
        return 0.0
    days = (due - today).days
    return max(0.0, min(1.0, 1 - days / URGENCY_HORIZON_DAYS))


def score(task: PlanTask, today: date, max_effort: int, weights: dict | None = None) -> float:
    w = {**DEFAULT_WEIGHTS, **(weights or {})}
    effort = (task.estimate_min / max_effort) if max_effort else 0.0
    return round(
        w["urgency"] * urgency(task.due, today)
        + w["importance"] * task.importance
        + w["blocks_others"] * (1.0 if task.blocks_others else 0.0)
        + w["commitment"] * (1.0 if task.commitment else 0.0)
        - w["effort"] * effort,
        4,
    )


def rank(tasks: list[PlanTask], today: date, weights: dict | None = None) -> list[tuple[PlanTask, float]]:
    max_effort = max((t.estimate_min for t in tasks), default=0)
    scored = [(t, score(t, today, max_effort, weights)) for t in tasks]
    # ties: sooner due date first, then title, so the order is stable
    return sorted(scored, key=lambda ts: (-ts[1], ts[0].due or date.max, ts[0].title))


def pick_priorities(tasks: list[PlanTask], today: date, weights: dict | None = None) -> list[PlanTask]:
    """Top 3 by score: at most one task over 180 min; at least one that unblocks someone, if any exists."""
    ranked = [t for t, _ in rank(tasks, today, weights)]
    chosen: list[PlanTask] = []
    for t in ranked:
        if len(chosen) == 3:
            break
        if t.estimate_min > BIG_TASK_MIN and any(c.estimate_min > BIG_TASK_MIN for c in chosen):
            continue
        chosen.append(t)
    if chosen and not any(c.blocks_others for c in chosen):
        unblocker = next((t for t in ranked if t.blocks_others and t not in chosen), None)
        if unblocker is not None:
            candidate = chosen[:-1] + [unblocker]
            if sum(1 for c in candidate if c.estimate_min > BIG_TASK_MIN) <= 1:
                chosen = candidate
    return chosen


def free_windows(work_start: int, work_end: int, meetings: list[tuple[int, int]], lunch: tuple[int, int] | None, buffer_min: int = 10) -> list[tuple[int, int]]:
    """Working hours minus meetings (each followed by a buffer) minus lunch."""
    busy = [(s, e + buffer_min) for s, e in meetings]
    if lunch:
        busy.append(lunch)
    busy.sort()
    windows, cursor = [], work_start
    for s, e in busy:
        if s > cursor:
            windows.append((cursor, min(s, work_end)))
        cursor = max(cursor, e)
        if cursor >= work_end:
            break
    if cursor < work_end:
        windows.append((cursor, work_end))
    return [(s, e) for s, e in windows if e - s >= MIN_BLOCK]


def _round5(x: float) -> int:
    return int(x // 5 * 5)


def place_blocks(priorities: list[PlanTask], windows: list[tuple[int, int]]) -> list[Block]:
    """Priorities go into the longest windows first (best priority into the longest).

    20% of each window stays free as slack, tasks bigger than a window are split, no block is under 25 minutes.
    """
    caps = [[s, e, _round5((e - s) * (1 - SLACK))] for s, e in sorted(windows, key=lambda w: -(w[1] - w[0]))]
    caps = [c for c in caps if c[2] >= MIN_BLOCK]
    blocks: list[Block] = []
    for ti, task in enumerate(priorities):
        remaining = task.estimate_min
        parts = 0
        for c in caps:
            if remaining < MIN_BLOCK and parts > 0:
                # a leftover that is too small is folded into the previous block of this task
                break
            if c[2] <= 0:
                continue
            length = min(remaining, c[2])
            if length < MIN_BLOCK:
                continue
            why = "longest free window" if (ti == 0 and c is caps[0]) else ("continues in a later window" if parts else "next free window")
            blocks.append(Block(task.id, task.title, c[0], c[0] + length, why))
            c[0] += length
            c[2] -= length
            remaining -= length
            parts += 1
            if remaining <= 0:
                break
        # remaining > 0 here means the day cannot hold the whole task; it stays in the task list (nothing is dropped silently)
    return sorted(blocks, key=lambda b: b.start)


def reason_for(task: PlanTask, today: date, in_longest_window: bool) -> str:
    """Reasons come from fixed templates only, never from model free text."""
    meta = task.meta or {}
    waiting, needs = meta.get("waiting"), meta.get("needs")
    if waiting:
        return f"{waiting['person']} is waiting on your {waiting.get('what', 'review')} before {waiting['consequence']}."
    if needs:
        return f"{needs['person']} needs it before {needs['consequence']}."
    parts = []
    if meta.get("blocks_label"):
        parts.append(f"It blocks {meta['blocks_label']}")
    if task.due is not None:
        days = (task.due - today).days
        weekday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][task.due.weekday()]
        parts.append("is due today" if days == 0 else f"is due {weekday}")
    sentences = []
    if in_longest_window:
        sentences.append("Longest free window of the day.")
    if parts:
        joined = " and ".join(parts)
        sentences.append(joined + "." if joined.startswith("It ") else "It " + joined + ".")
    return " ".join(sentences) if sentences else "Next on your list."


def replan(blocks: list[tuple[str, int, int]], fixed: list[tuple[int, int]], work_end: int, slip: int, now_min: int = 0, buffer_min: int = 10) -> list[dict]:
    """Recompute only unstarted blocks after a slow start of `slip` minutes.

    The slip is absorbed by the LATEST unstarted block that still fits: it keeps `buffer_min` before the next
    meeting or lunch, does not run into the next block, and ends no later than work end plus the slip.
    Earlier blocks do not move. Nothing is ever dropped. Returns [{block_id, from, to, end}].
    """
    if slip <= 0:
        return []
    ordered = sorted(((bid, s, e) for bid, s, e in blocks if s >= now_min), key=lambda b: b[1])
    for i in range(len(ordered) - 1, -1, -1):
        bid, s, e = ordered[i]
        ns, ne = s + slip, e + slip
        nxt_fixed = min((fs for fs, _ in fixed if fs >= e), default=None)
        nxt_block = ordered[i + 1][1] if i + 1 < len(ordered) else None
        if nxt_fixed is not None and ne + buffer_min > nxt_fixed:
            continue
        if nxt_block is not None and ne > nxt_block:
            continue
        if ne > work_end + slip:
            continue
        return [{"block_id": bid, "from": s, "to": ns, "end": ne}]
    return []
