"""Graph payload (DG-B31). Only nodes/edges the viewer may see; states derived from decision status + user actions."""
from collections import Counter

from app.repositories import decisions as dec_repo, meetings as meet_repo, people, tasks as tasks_repo
from app.domain import labels
from app.services import clock

NODE_W = {"topic": 210, "decision": 150, "meeting": 140, "task": 150}
DEC_STATE = {"ACTIVE": "active", "SUPERSEDED": "superseded", "PROPOSED": "pending", "DISMISSED": "dismissed"}


def _short_date(iso: str, tz: str) -> str:
    return labels.short_date(labels.local(iso, tz).date())


def graph_for_topic(db, viewer, topic_id: str | None) -> dict:
    uid = viewer["id"]
    tz = clock.tz_name()
    topic = dec_repo.get_topic(db, topic_id) if topic_id else dec_repo.latest_visible_topic(db, uid)
    if topic is None:
        return {"topic_id": None, "stats": {"decisions": 0, "links": 0, "open_conflicts": 0}, "nodes": [], "edges": []}
    decs = dec_repo.list_visible(db, uid)
    decs = [d for d in decs if d["topic_id"] == topic["id"]]
    dec_ids = {d["id"] for d in decs}
    meeting_ids = {d["meeting_id"] for d in decs}
    nodes, edges = [], []
    nodes.append({"id": topic["id"], "kind": "topic", "title": topic["title"], "subtitle": f"{len(decs)} decisions across {len(meeting_ids)} meetings",
                  "state": None, "full_title": topic["title"], "meta": f"{len(decs)} decisions across {len(meeting_ids)} meetings",
                  "order_key": -1, "layout_hint": {"x": 350, "y": 62}})
    for i, d in enumerate(decs):
        state = DEC_STATE.get(d["status"], "active")
        sub = {"active": "Active", "superseded": "Replaced", "pending": "To review", "dismissed": "Dismissed"}[state]
        meeting = meet_repo.get_raw(db, d["meeting_id"])
        nodes.append({"id": d["id"], "kind": "decision", "title": d.get("short_title") or d["statement"][:28], "subtitle": sub,
                      "state": state, "full_title": d["statement"], "meta": f"{meeting['title'] if meeting else ''}",
                      "quote": d["quote"], "quote_class": labels.quote_class(d["quote_lang"]), "translation": d["translation"],
                      "order_key": i, "layout_hint": None})
        edges.append({"id": f"e_{d['id']}_topic", "from": d["id"], "to": topic["id"], "type": "about"})
        edges.append({"id": f"e_{d['id']}_m", "from": d["id"], "to": d["meeting_id"], "type": "decided"})
        if d["supersedes_decision_id"] and d["supersedes_decision_id"] in dec_ids:
            edges.append({"id": f"e_{d['id']}_sup", "from": d["id"], "to": d["supersedes_decision_id"], "type": "supersedes", "label": "supersedes"})
        if d["conflict_state"] == "PENDING" and d["conflict_target_id"] in dec_ids and d["status"] == "PROPOSED":
            edges.append({"id": f"e_{d['id']}_conf", "from": d["id"], "to": d["conflict_target_id"], "type": "supersedes", "conflict": True, "label": "conflict?"})
        if d["conflict_state"] == "KEPT_BOTH" and d["conflict_target_id"] in dec_ids:
            edges.append({"id": f"e_{d['id']}_kept", "from": d["id"], "to": d["conflict_target_id"], "type": "supersedes", "label": "kept both"})
        t = tasks_repo.for_decision(db, uid, d["id"])
        if t and t["state"] == "DONE":
            tstate = "done"
        elif t:
            tstate = "open"
        elif d["status"] == "PROPOSED":
            tstate = "planned"
        else:
            tstate = None
        if tstate:
            tid = t["id"] if t else f"planned_{d['id']}"
            nodes.append({"id": tid, "kind": "task", "title": (d.get("task_short") or d["task_title"] or "Task")[:24], "subtitle": None,
                          "state": tstate, "full_title": d["task_title"] or d["statement"], "meta": "Created when you accept the decision",
                          "order_key": i, "layout_hint": None})
            edges.append({"id": f"e_{d['id']}_task", "from": d["id"], "to": tid, "type": "produced"})
    for mid in meeting_ids:
        m = meet_repo.get_raw(db, mid)
        if m:
            nodes.append({"id": m["id"], "kind": "meeting", "title": m["title"], "subtitle": None, "state": None, "full_title": m["title"],
                          "meta": f"{_short_date(m['start_at'], tz)}", "order_key": 0, "layout_hint": None})
            for p in people.meeting_people(db, mid):
                if p["attendance"] != "attended" or not p["show_in_graph"]:
                    continue
                if not any(n["id"] == p["id"] for n in nodes):
                    hint = {"x": p["graph_x"], "y": p["graph_y"]} if p.get("graph_x") is not None else None
                    nodes.append({"id": p["id"], "kind": "person", "title": p["initials"], "subtitle": None, "state": None,
                                  "full_title": p["name"], "meta": f"{p['role']}, {p['city']}", "bg": p["bg"], "order_key": 0, "layout_hint": hint})
                edges.append({"id": f"e_{p['id']}_{mid}", "from": p["id"], "to": mid, "type": "attended"})
    if not clock.is_mock():
        # live mode shows at most 4 people, ranked by how many displayed meetings each attended (DG-B31)
        attended = Counter(e["from"] for e in edges if e["type"] == "attended")
        keep = {pid for pid, _ in sorted(attended.items(), key=lambda kv: (-kv[1], kv[0]))[:4]}
        nodes = [n for n in nodes if n["kind"] != "person" or n["id"] in keep]
    open_conflicts = sum(1 for d in decs if d["conflict_state"] == "PENDING" and d["status"] == "PROPOSED")
    # keep only edges whose ends are both visible nodes
    ids = {n["id"] for n in nodes}
    edges = [e for e in edges if e["from"] in ids and e["to"] in ids]
    return {"topic_id": topic["id"], "stats": {"decisions": len(decs), "links": len(edges), "open_conflicts": open_conflicts}, "nodes": nodes, "edges": edges}
