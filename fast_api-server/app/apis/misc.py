from datetime import date

from fastapi import APIRouter, Depends, status

from app.adapters import get_llm
from app.models.requests import IdeaCreate, IdeaPatch, LinkCreate, NoteBody
from app.repositories import misc as repo, tasks as tasks_repo
from app.services import clock, impact as impact_svc, indexing, links as links_svc, tasks as tasks_svc
from app.storage.db import transaction
from app.utils.auth import get_current_user, get_db
from app.utils.errors import not_found
from app.utils.ids import new_id
from app.utils.response import set_response
from app.utils import ratelimit
from app.services.clock import is_mock
from app.utils.logger_config import get_logger
import json
import os

logger = get_logger(__name__)
router = APIRouter(tags=["misc"])
IMPACT = os.path.join(os.path.dirname(__file__), "..", "fixtures", "impact.json")


@router.get("/impact", status_code=status.HTTP_200_OK)
def impact(user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "OK", impact_svc.for_viewer(db, user))


@router.get("/notes/{scope}", status_code=status.HTTP_200_OK)
def get_note(scope: str, date_: str | None = None, user=Depends(get_current_user), db=Depends(get_db)):
    if scope not in ("day", "global"):
        raise not_found("Unknown scope.")
    day = (date_ or clock.today().isoformat()) if scope == "day" else None
    row = db.execute("SELECT * FROM notes WHERE owner_id = ? AND scope = ? AND IFNULL(scope_date,'') = IFNULL(?,'') AND deleted_at IS NULL",
                     (user["id"], scope, day)).fetchone()
    return set_response(200, "OK", {"text": row["text"] if row else "", "updated_at": row["updated_at"] if row else None, "scope": scope, "date": day})


@router.put("/notes/{scope}", status_code=status.HTTP_200_OK)
def put_note(scope: str, body: NoteBody, date_: str | None = None, user=Depends(get_current_user), db=Depends(get_db)):
    if scope not in ("day", "global"):
        raise not_found("Unknown scope.")
    day = (date_ or clock.today().isoformat()) if scope == "day" else None
    now = clock.now_iso()
    with transaction(db):
        row = db.execute("SELECT id FROM notes WHERE owner_id = ? AND scope = ? AND IFNULL(scope_date,'') = IFNULL(?,'') AND deleted_at IS NULL",
                         (user["id"], scope, day)).fetchone()
        if row:
            db.execute("UPDATE notes SET text = ?, updated_at = ? WHERE id = ?", (body.text, now, row["id"]))
            nid = row["id"]
        else:
            nid = new_id("note")
            db.execute("INSERT INTO notes (id, owner_id, scope, scope_date, title, text, updated_at) VALUES (?,?,?,?,?,?,?)",
                       (nid, user["id"], scope, day, "Scratchpad" if scope == "day" else "Notes", body.text, now))
        indexing.index_note(db, dict(db.execute("SELECT * FROM notes WHERE id = ?", (nid,)).fetchone()))
    return set_response(200, "Saved", {"text": body.text, "updated_at": now})


@router.get("/ideas", status_code=status.HTTP_200_OK)
def ideas(user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "OK", {"items": [_idea_out(i) for i in repo.ideas(db, user["id"])]})


def _idea_out(i):
    return {"id": i["id"], "text": i["text"], "detail": i["detail"], "tags": i["tags"], "created_at": i["created_at"]}


@router.post("/ideas", status_code=status.HTTP_201_CREATED)
def create_idea(body: IdeaCreate, user=Depends(get_current_user), db=Depends(get_db)):
    try:
        tags = (get_llm().generate_json("idea_tags", {"text": body.text}) or {}).get("tags", [])
    except Exception:  # noqa: BLE001 - tags are optional
        tags = []
    iid = new_id("ide")
    with transaction(db):
        db.execute("INSERT INTO ideas (id, owner_id, text, tags) VALUES (?,?,?,?)", (iid, user["id"], body.text, json.dumps(tags[:3])))
        repo.add_audit(db, user["id"], "idea.create", iid)
        indexing.index_idea(db, dict(db.execute("SELECT * FROM ideas WHERE id = ?", (iid,)).fetchone()))
    return set_response(201, "Idea saved. You can find it later in Ask.", _idea_out(repo.get_idea(db, user["id"], iid)))


@router.patch("/ideas/{idea_id}", status_code=status.HTTP_200_OK)
def patch_idea(idea_id: str, body: IdeaPatch, user=Depends(get_current_user), db=Depends(get_db)):
    if repo.get_idea(db, user["id"], idea_id) is None:
        raise not_found("Idea not found.")
    with transaction(db):
        db.execute("UPDATE ideas SET text = ? WHERE id = ?", (body.text, idea_id))
        indexing.index_idea(db, dict(db.execute("SELECT * FROM ideas WHERE id = ?", (idea_id,)).fetchone()))
    return set_response(200, "Saved", _idea_out(repo.get_idea(db, user["id"], idea_id)))


@router.post("/ideas/{idea_id}/to_task", status_code=status.HTTP_201_CREATED)
def idea_to_task(idea_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    idea = repo.get_idea(db, user["id"], idea_id)
    if idea is None:
        raise not_found("Idea not found.")
    body = {"title": idea["text"][:200], "plan_date": clock.today().isoformat()}
    return set_response(201, "Task added", tasks_svc.create_task(db, user, body))


@router.get("/links", status_code=status.HTTP_200_OK)
def links(user=Depends(get_current_user), db=Depends(get_db)):
    return set_response(200, "OK", {"items": [_link_out(l) for l in repo.links(db, user["id"])]})


def _link_out(l):
    return links_svc.to_out(l)


@router.post("/links", status_code=status.HTTP_201_CREATED)
def create_link(body: LinkCreate, user=Depends(get_current_user), db=Depends(get_db)):
    ratelimit.check(f"link:{user['id']}", limit=30)
    code, link = links_svc.save(db, user, body.url)
    message = "Already saved" if code == 200 else "Saved"
    return set_response(code, message, links_svc.to_out(link))


@router.delete("/links/{link_id}", status_code=status.HTTP_200_OK)
def delete_link(link_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    if repo.get_link(db, user["id"], link_id) is None:
        raise not_found("Link not found.")
    with transaction(db):
        db.execute("UPDATE links SET deleted_at = ? WHERE id = ?", (clock.now_iso(), link_id))
        db.execute("DELETE FROM search_index WHERE kind = 'link' AND ref_id = ?", (link_id,))
        repo.add_audit(db, user["id"], "link.delete", link_id)
    return set_response(200, "Removed", {"id": link_id})


@router.get("/healthz", status_code=status.HTTP_200_OK)
def healthz():
    return set_response(200, "ok", {"status": "ok"})


@router.get("/readyz", status_code=status.HTTP_200_OK)
def readyz(db=Depends(get_db)):
    from app.config_view import dg_config
    db.execute("SELECT 1").fetchone()
    cfg = dg_config()
    return set_response(200, "ready", {"database": "ok", "modes": {"google": cfg["google_mode"], "llm": cfg["llm_mode"]}})
