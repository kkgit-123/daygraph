import json
import sqlite3


def d(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row is not None else None


def ds(rows) -> list[dict]:
    return [dict(r) for r in rows]


def jload(value, default=None):
    if value is None or value == "":
        return default
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default
