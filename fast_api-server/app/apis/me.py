import json

from fastapi import APIRouter, Depends, status

from app.adapters import get_gateway
from app.models.requests import SettingsPatch
from app.repositories import decisions as dec_repo, misc, people
from app.services import clock, token_store
from app.services.tasks import serialize
from app.storage.db import transaction
from app.utils.auth import get_current_user, get_db
from app.utils.errors import not_found
from app.utils.response import set_response
from app.repositories import tasks as tasks_repo
from app.services.permissions import owned

router = APIRouter(tags=["me"])
SERVICES = {"meet", "calendar", "tasks", "drive"}
MANAGER_ROLES = {"Team lead"}  # demo: the manager view is shown to these roles only


def _settings_out(s):
    keys = ["work_start", "work_end", "lunch_start", "lunch_end", "timezone", "sync_focus_blocks", "analysis_enabled"]
    return {k: (bool(s[k]) if k in ("sync_focus_blocks", "analysis_enabled") else s[k]) for k in keys}


@router.get("/me", status_code=status.HTTP_200_OK)
def me(user=Depends(get_current_user), db=Depends(get_db)):
    from app.config_view import dg_config
    cfg = dg_config()
    conns = [dict(r) for r in db.execute("SELECT service, label, status FROM connections WHERE user_id = ? ORDER BY rowid", (user["id"],)).fetchall()]
    s = people.get_settings(db, user["id"])
    return set_response(200, "OK", {
        "user": {"id": user["id"], "name": user["name"], "initials": user["initials"], "role": user["role"], "city": user["city"]},
        "is_manager": user["role"] in MANAGER_ROLES,
        "workspace": {"name": cfg["workspace_name"], "subtitle": cfg["workspace_subtitle"]},
        "connections": conns,
        "modes": {"google": cfg["google_mode"], "llm": cfg["llm_mode"]},
        "review_count": dec_repo.count_pending_visible(db, user["id"]),
        "sync_label": "Synced with Google Workspace 2 min ago" if clock.is_mock() else "Synced with Google Workspace",
        "analysis_enabled": bool(s["analysis_enabled"]),
        "today": clock.today(s["timezone"]).isoformat(),
        "settings": _settings_out(s),
    })


@router.patch("/me/settings", status_code=status.HTTP_200_OK)
def patch_settings(body: SettingsPatch, user=Depends(get_current_user), db=Depends(get_db)):
    fields = {k: (int(v) if isinstance(v, bool) else v) for k, v in body.model_dump(exclude_none=True).items()}
    people.get_settings(db, user["id"])
    with transaction(db):
        if fields:
            sets = ",".join(f"{k} = ?" for k in fields)
            db.execute(f"UPDATE user_settings SET {sets} WHERE user_id = ?", list(fields.values()) + [user["id"]])
        misc.add_audit(db, user["id"], "settings.update", None, fields)
    return set_response(200, "Saved", _settings_out(people.get_settings(db, user["id"])))


@router.get("/connections", status_code=status.HTTP_200_OK)
def list_connections(user=Depends(get_current_user), db=Depends(get_db)):
    rows = [dict(r) for r in db.execute("SELECT service, label, status FROM connections WHERE user_id = ? ORDER BY rowid", (user["id"],)).fetchall()]
    return set_response(200, "OK", {"connections": rows})


def _set_connection(db, user, service, new_status):
    if service not in SERVICES:
        raise not_found("Unknown service.")
    with transaction(db):
        db.execute("UPDATE connections SET status = ? WHERE user_id = ? AND service = ?", (new_status, user["id"], service))
        if new_status != "connected":
            token_store.delete(db, user["id"], service)  # disconnect also forgets the Google grant
        misc.add_audit(db, user["id"], "connection.enable" if new_status == "connected" else "connection.disable", service)
    return set_response(200, "OK", {"service": service, "status": new_status})


@router.post("/connections/{service}/enable", status_code=status.HTTP_200_OK)
def enable(service: str, user=Depends(get_current_user), db=Depends(get_db)):
    return _set_connection(db, user, service, "connected")


@router.delete("/connections/{service}", status_code=status.HTTP_200_OK)
def disconnect(service: str, user=Depends(get_current_user), db=Depends(get_db)):
    return _set_connection(db, user, service, "disconnected")


@router.get("/me/export", status_code=status.HTTP_200_OK)
def export(user=Depends(get_current_user), db=Depends(get_db)):
    uid = user["id"]
    data = {"user": {k: user[k] for k in ("id", "name", "role", "city")}}
    for key, sql in {
        "tasks": "SELECT * FROM tasks WHERE owner_id = ? AND deleted_at IS NULL",
        "notes": "SELECT * FROM notes WHERE owner_id = ? AND deleted_at IS NULL",
        "ideas": "SELECT * FROM ideas WHERE owner_id = ? AND deleted_at IS NULL",
        "links": "SELECT * FROM links WHERE owner_id = ? AND deleted_at IS NULL",
        "chat_turns": "SELECT * FROM chat_turns WHERE owner_id = ? AND deleted_at IS NULL",
    }.items():
        data[key] = [dict(r) for r in db.execute(sql, (uid,)).fetchall()]
    with transaction(db):
        misc.add_audit(db, uid, "export", None)
    return set_response(200, "Exported", data)


@router.delete("/me", status_code=status.HTTP_200_OK)
def delete_me(user=Depends(get_current_user), db=Depends(get_db)):
    """Hard-delete this user's private data. Shared meeting records stay; the audit row records the deletion."""
    uid = user["id"]
    with transaction(db):
        for table in ("notes", "ideas", "links", "chat_turns", "impact_events", "plan_blocks", "plan_snapshots", "tasks", "connections", "user_settings", "search_index"):
            col = "owner_user_id" if table == "search_index" else "owner_id" if table in ("notes", "ideas", "links", "chat_turns", "impact_events", "plan_blocks", "plan_snapshots", "tasks") else "user_id"
            db.execute(f"DELETE FROM {table} WHERE {col} = ?", (uid,))
        misc.add_audit(db, uid, "account.delete", None)
    return set_response(200, "Deleted", {"deleted": True})
