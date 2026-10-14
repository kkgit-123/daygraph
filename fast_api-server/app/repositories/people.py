from app.repositories._util import d, ds, jload


def get_user(db, user_id: str) -> dict | None:
    return d(db.execute(
        "SELECT u.id, u.person_id, u.handle, p.name, p.initials, p.role, p.city, p.bg, p.fg "
        "FROM users u JOIN people p ON p.id = u.person_id WHERE u.id = ? AND u.deleted_at IS NULL", (user_id,)).fetchone())


def get_user_by_handle(db, handle: str) -> dict | None:
    row = db.execute("SELECT id FROM users WHERE handle = ? AND deleted_at IS NULL", (handle,)).fetchone()
    return get_user(db, row["id"]) if row else None


def user_for_person(db, person_id: str) -> dict | None:
    row = db.execute("SELECT id FROM users WHERE person_id = ? AND deleted_at IS NULL", (person_id,)).fetchone()
    return get_user(db, row["id"]) if row else None


def get_person(db, person_id: str) -> dict | None:
    row = d(db.execute("SELECT * FROM people WHERE id = ?", (person_id,)).fetchone())
    if row:
        row["aliases"] = jload(row["aliases"], [])
    return row


def directory(db) -> list[dict]:
    rows = ds(db.execute("SELECT * FROM people WHERE in_directory = 1 AND deleted_at IS NULL ORDER BY rowid").fetchall())
    for r in rows:
        r["aliases"] = jload(r["aliases"], [])
    return rows


def meeting_people(db, meeting_id: str) -> list[dict]:
    """All people on a meeting (attended + invited), with their attendance status. Not permission-gated: callers
    only pass a meeting id they already verified as visible."""
    rows = ds(db.execute(
        "SELECT p.*, ma.status AS attendance, ma.show_in_graph FROM meeting_attendees ma "
        "JOIN people p ON p.id = ma.person_id WHERE ma.meeting_id = ? ORDER BY ma.rowid", (meeting_id,)).fetchall())
    for r in rows:
        r["aliases"] = jload(r["aliases"], [])
    return rows


def get_settings(db, user_id: str) -> dict:
    row = d(db.execute("SELECT * FROM user_settings WHERE user_id = ?", (user_id,)).fetchone())
    if row is None:
        db.execute("INSERT INTO user_settings (user_id) VALUES (?)", (user_id,))
        row = d(db.execute("SELECT * FROM user_settings WHERE user_id = ?", (user_id,)).fetchone())
    row["weights"] = jload(row.get("weights"), None)
    return row
