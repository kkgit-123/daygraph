"""Write-back to Google Tasks. DayGraph's own row is always the source of truth: a Google failure never loses a task."""
from app.adapters import get_gateway
from app.adapters.google.base import UpstreamUnavailable
from app.repositories import tasks as tasks_repo
from app.utils.logger_config import get_logger

logger = get_logger(__name__)


def push_task(db, task_id: str):
    """Create (or complete) the Google Task for a DayGraph task. Idempotent via the stored google_task_id."""
    row = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if row is None or row["deleted_at"]:
        return False
    gw = get_gateway()
    try:
        gid = row["google_task_id"]
        if not gid:
            gid = gw.create_task(row["owner_id"], row["title"], row["due"], row["notes"])
            tasks_repo.update(db, task_id, google_task_id=gid)
        if row["state"] == "DONE":
            gw.complete_task(row["owner_id"], gid)
        tasks_repo.update(db, task_id, synced=1)
        return True
    except UpstreamUnavailable as exc:
        logger.warning("Google Tasks write-back failed for %s: %s", task_id, exc)
        tasks_repo.update(db, task_id, synced=0)
        return False


def remove_task(db, owner_id: str, google_task_id: str | None):
    if not google_task_id:
        return
    try:
        get_gateway().delete_task(owner_id, google_task_id)
    except UpstreamUnavailable as exc:
        logger.warning("Could not delete Google Task %s: %s", google_task_id, exc)
