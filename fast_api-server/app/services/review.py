"""Review actions (DG-B28). Only user actions change decision status. Every mutation is one DB transaction."""
from datetime import datetime, timedelta

from app.repositories import decisions as dec_repo, misc, people, tasks as tasks_repo
from app.services import clock, google_sync, indexing, jobs
from app.services.permissions import visible_decision
from app.storage.db import transaction
from app.utils.errors import invalid_state, not_found, undo_expired

UNDO_MIN = 10


def _visible(db, viewer, did):
    d = dec_repo.get_visible(db, viewer["id"], did)
    if d is None:
        raise not_found("Decision not found.")
    return d


def _task_for(d, owner_id):
    return {"owner_id": owner_id, "title": d["task_title"] or d["statement"], "due": d["deadline"], "source_decision_id": d["id"],
            "plan_date": None, "meta": {"short": d.get("task_short") or (d["task_title"] or d["statement"])[:28], "source_label": "From a meeting"}}


def _create_task(db, owner_id, d):
    tid = tasks_repo.insert(db, owner_id, d["task_title"] or d["statement"], due=d["deadline"], source_decision_id=d["id"],
                            meta={"short": d.get("task_short") or (d["task_title"] or d["statement"])[:28]})
    return tid


def _sync_after_commit(task_id):
    if task_id:
        jobs.enqueue(google_sync.push_task, task_id)


def accept(db, viewer, did, owner_person_id=None, deadline=None) -> dict:
    uid = viewer["id"]
    d = _visible(db, viewer, did)
    if d["status"] == "ACTIVE":
        return {"decision_id": did, "status": "ACTIVE", "idempotent": True, "message": d.get("accepted_message")}
    if d["status"] != "PROPOSED":
        raise invalid_state("This decision is already dismissed or replaced.")
    with transaction(db):
        fields = {"status": "ACTIVE", "resolved_at": clock.now_iso()}
        if owner_person_id:
            fields.update(owner_id=owner_person_id, owner_confidence=1.0, owner_candidates=[], owner_confirmed=1)
        if deadline:
            fields["deadline"] = deadline
        if d["conflict_state"] == "PENDING" and d["conflict_target_id"]:
            target = dec_repo.get_raw(db, d["conflict_target_id"])
            if target and target["status"] == "ACTIVE":
                dec_repo.update(db, target["id"], status="SUPERSEDED")
            fields.update(conflict_state="SUPERSEDES", supersedes_decision_id=d["conflict_target_id"])
        dec_repo.update(db, did, **fields)
        task_id = _create_task(db, uid, dec_repo.get_raw(db, did))
        misc.add_audit(db, uid, "decision.accept", did)
        misc.add_impact(db, uid, "decision_accepted", did)
        misc.add_impact(db, uid, "review", did)
    _sync_after_commit(task_id)
    return {"decision_id": did, "status": "ACTIVE", "task_id": task_id, "message": "Accepted."}


def keep_both(db, viewer, did) -> dict:
    uid = viewer["id"]
    d = _visible(db, viewer, did)
    if d["status"] != "PROPOSED":
        raise invalid_state("Only a pending decision can be kept.")
    with transaction(db):
        dec_repo.update(db, did, status="ACTIVE", conflict_state="KEPT_BOTH", resolved_at=clock.now_iso())
        if d["conflict_target_id"]:
            dec_repo.update(db, d["conflict_target_id"], conflict_state="KEPT_BOTH")
        task_id = _create_task(db, uid, dec_repo.get_raw(db, did))
        misc.add_audit(db, uid, "decision.keep_both", did)
        misc.add_impact(db, uid, "decision_accepted", did)
        misc.add_impact(db, uid, "review", did)
    _sync_after_commit(task_id)
    return {"decision_id": did, "status": "ACTIVE", "task_id": task_id, "message": "Both decisions kept and linked."}


def dismiss(db, viewer, did) -> dict:
    d = _visible(db, viewer, did)
    if d["status"] != "PROPOSED":
        raise invalid_state("Only a pending decision can be dismissed.")
    with transaction(db):
        dec_repo.update(db, did, status="DISMISSED", resolved_at=clock.now_iso())
        misc.add_audit(db, viewer["id"], "decision.dismiss", did)
        misc.add_impact(db, viewer["id"], "review", did)
    return {"decision_id": did, "status": "DISMISSED", "message": "Dismissed. It stays in the audit log."}


def undo(db, viewer, did) -> dict:
    uid = viewer["id"]
    d = _visible(db, viewer, did)
    if not d["resolved_at"]:
        raise invalid_state("Nothing to undo.")
    if clock.now() - datetime.fromisoformat(d["resolved_at"]) > timedelta(minutes=UNDO_MIN):
        raise undo_expired()
    task = tasks_repo.for_decision(db, uid, did)
    with transaction(db):
        if d["supersedes_decision_id"]:
            earlier = dec_repo.get_raw(db, d["supersedes_decision_id"])
            if earlier and earlier["status"] == "SUPERSEDED":
                dec_repo.update(db, earlier["id"], status="ACTIVE")
            if earlier:
                dec_repo.update(db, earlier["id"], conflict_state="NONE")
        if d["conflict_state"] == "KEPT_BOTH" and d["conflict_target_id"]:
            dec_repo.update(db, d["conflict_target_id"], conflict_state="NONE")
        dec_repo.update(db, did, status="PROPOSED", conflict_state="PENDING" if d["conflict_target_id"] else "NONE",
                        supersedes_decision_id=None, resolved_at=None)
        if task:
            tasks_repo.soft_delete(db, task["id"])
        misc.add_audit(db, uid, "decision.undo", did)
    if task:
        google_sync.remove_task(db, uid, task["google_task_id"])
    return {"decision_id": did, "status": "PROPOSED", "message": "Undone. The Google Task was removed."}


def set_owner(db, viewer, did, person_id) -> dict:
    d = _visible(db, viewer, did)
    if not any(p["id"] == person_id for p in people.directory(db)):
        raise not_found("Person not found.")
    with transaction(db):
        dec_repo.update(db, did, owner_id=person_id, owner_confidence=1.0, owner_confirmed=1, owner_candidates=[])
        misc.add_audit(db, viewer["id"], "decision.owner", did)
    return {"decision_id": did, "owner_person_id": person_id, "note": "Confirmed by you"}


def accept_all(db, viewer) -> dict:
    rows = db.execute(
        f"SELECT d.id FROM decisions d WHERE d.status = 'PROPOSED' AND d.conflict_state = 'NONE' "
        f"AND d.owner_candidates = '[]' AND {visible_decision('d')}",
        {"viewer_id": viewer["id"]}).fetchall()
    accepted = 0
    for r in rows:
        accept(db, viewer, r["id"])
        accepted += 1
    return {"accepted": accepted, "message": f"{accepted} tasks added to Google Tasks."}


def lineage(db, viewer, did) -> list[dict]:
    _visible(db, viewer, did)
    return [{"id": d["id"], "statement": d["statement"], "status": d["status"], "deadline": d["deadline"], "position": d["pos"]}
            for d in dec_repo.lineage(db, viewer["id"], did)]
