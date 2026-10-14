import sqlite3
from contextlib import contextmanager

import config

SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS people (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        role TEXT,
        city TEXT,
        bg TEXT NOT NULL DEFAULT '#E8EAFB',
        fg TEXT NOT NULL DEFAULT '#171A2B',
        aliases TEXT NOT NULL DEFAULT '[]',
        in_directory INTEGER NOT NULL DEFAULT 1,
        graph_x REAL,
        graph_y REAL,
        deleted_at TEXT
    )""",
    """
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL REFERENCES people(id),
        handle TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now')),
        deleted_at TEXT
    )""",
    """
    CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        service TEXT NOT NULL,
        label TEXT NOT NULL,
        detail TEXT,
        status TEXT NOT NULL DEFAULT 'connected',
        UNIQUE (user_id, service)
    )""",
    """
    CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        work_start TEXT NOT NULL DEFAULT '09:00',
        work_end TEXT NOT NULL DEFAULT '17:00',
        lunch_start TEXT NOT NULL DEFAULT '12:00',
        lunch_end TEXT NOT NULL DEFAULT '13:00',
        timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
        sync_focus_blocks INTEGER NOT NULL DEFAULT 1,
        analysis_enabled INTEGER NOT NULL DEFAULT 1,
        buffer_min INTEGER NOT NULL DEFAULT 10,
        weights TEXT
    )""",
    """
    CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        organizer_id TEXT REFERENCES people(id),
        description TEXT,
        source TEXT NOT NULL DEFAULT 'calendar',
        status TEXT NOT NULL DEFAULT 'PENDING',
        check_summary TEXT,
        failure_reason TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now')),
        deleted_at TEXT
    )""",
    """
    CREATE TABLE IF NOT EXISTS meeting_attendees (
        meeting_id TEXT NOT NULL REFERENCES meetings(id),
        person_id TEXT NOT NULL REFERENCES people(id),
        status TEXT NOT NULL DEFAULT 'attended',
        show_in_graph INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (meeting_id, person_id)
    )""",
    """
    CREATE TABLE IF NOT EXISTS transcripts (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL REFERENCES meetings(id),
        segments TEXT NOT NULL,
        duration_sec INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now'))
    )""",
    """
    CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        embedding TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now')),
        deleted_at TEXT
    )""",
    """
    CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        topic_id TEXT REFERENCES topics(id),
        meeting_id TEXT NOT NULL REFERENCES meetings(id),
        statement TEXT NOT NULL,
        short_title TEXT,
        quote TEXT NOT NULL,
        quote_lang TEXT NOT NULL DEFAULT 'en' CHECK (quote_lang IN ('en','ja','id')),
        translation TEXT,
        speaker_id TEXT REFERENCES people(id),
        offset_sec INTEGER NOT NULL DEFAULT 0,
        quote_match REAL NOT NULL DEFAULT 1.0,
        owner_id TEXT REFERENCES people(id),
        owner_confidence REAL NOT NULL DEFAULT 0,
        owner_confirmed INTEGER NOT NULL DEFAULT 0,
        owner_candidates TEXT NOT NULL DEFAULT '[]',
        deadline TEXT,
        task_title TEXT,
        task_short TEXT,
        status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','ACTIVE','SUPERSEDED','DISMISSED')),
        conflict_state TEXT NOT NULL DEFAULT 'NONE' CHECK (conflict_state IN ('NONE','PENDING','SUPERSEDES','KEPT_BOTH')),
        conflict_target_id TEXT REFERENCES decisions(id),
        supersedes_decision_id TEXT REFERENCES decisions(id),
        conflict_rationale TEXT,
        conflict_note TEXT,
        earlier_value TEXT,
        proposed_value TEXT,
        embedding TEXT,
        decided_at TEXT,
        resolved_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now')),
        deleted_at TEXT
    )""",
    "CREATE INDEX IF NOT EXISTS ix_decisions_topic_status ON decisions(topic_id, status)",
    "CREATE INDEX IF NOT EXISTS ix_decisions_meeting ON decisions(meeting_id)",
    """
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        notes TEXT,
        due TEXT,
        estimate_min INTEGER,
        state TEXT NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN','DONE')),
        plan_date TEXT,
        priority_slot INTEGER CHECK (priority_slot BETWEEN 1 AND 3),
        carried_over_from TEXT,
        source_decision_id TEXT REFERENCES decisions(id),
        google_task_id TEXT,
        synced INTEGER NOT NULL DEFAULT 0,
        meta TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now')),
        completed_at TEXT,
        deleted_at TEXT
    )""",
    # the three-priority rule lives in the database, so two concurrent requests cannot both win
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_priority_slot ON tasks(owner_id, plan_date, priority_slot) WHERE priority_slot IS NOT NULL AND deleted_at IS NULL",
    "CREATE INDEX IF NOT EXISTS ix_tasks_owner_date ON tasks(owner_id, plan_date)",
    """
    CREATE TABLE IF NOT EXISTS plan_blocks (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id),
        plan_date TEXT NOT NULL,
        task_id TEXT REFERENCES tasks(id),
        title TEXT NOT NULL,
        why TEXT,
        reason TEXT,
        start_min INTEGER NOT NULL,
        end_min INTEGER NOT NULL,
        moved_by_replan INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT
    )""",
    """
    CREATE TABLE IF NOT EXISTS plan_snapshots (
        token TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id),
        plan_date TEXT NOT NULL,
        snapshot TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now'))
    )""",
    """
    CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id),
        scope TEXT NOT NULL,
        scope_date TEXT,
        title TEXT,
        text TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now')),
        deleted_at TEXT
    )""",
    """
    CREATE TABLE IF NOT EXISTS ideas (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id),
        text TEXT NOT NULL,
        detail TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now')),
        deleted_at TEXT
    )""",
    """
    CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id),
        url TEXT NOT NULL,
        canonical_url TEXT NOT NULL,
        title TEXT,
        summary TEXT,
        passage TEXT,
        takeaways TEXT,
        status TEXT NOT NULL DEFAULT 'queued',
        saved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now')),
        deleted_at TEXT
    )""",
    """
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'doc',
        drive_url TEXT,
        passage TEXT NOT NULL,
        edited_at TEXT,
        edited_by TEXT REFERENCES people(id),
        deleted_at TEXT
    )""",
    """
    CREATE TABLE IF NOT EXISTS document_acl (
        document_id TEXT NOT NULL REFERENCES documents(id),
        person_id TEXT NOT NULL REFERENCES people(id),
        PRIMARY KEY (document_id, person_id)
    )""",
    """
    CREATE TABLE IF NOT EXISTS chat_turns (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id),
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        grounded INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now')),
        deleted_at TEXT
    )""",
    """
    CREATE TABLE IF NOT EXISTS impact_events (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id),
        kind TEXT NOT NULL,
        ref_id TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now'))
    )""",
    """
    CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        actor_id TEXT,
        action TEXT NOT NULL,
        ref_id TEXT,
        detail TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+00:00','now'))
    )""",
    """
    CREATE TABLE IF NOT EXISTS search_index (
        kind TEXT NOT NULL,
        ref_id TEXT NOT NULL,
        owner_user_id TEXT,
        meeting_id TEXT,
        text TEXT NOT NULL,
        embedding TEXT NOT NULL,
        PRIMARY KEY (kind, ref_id)
    )""",
    "CREATE INDEX IF NOT EXISTS ix_attendees_person ON meeting_attendees(person_id)",
    # Idempotency-Key replays (DG-B07): the first response is stored and returned for 24 hours
    """
    CREATE TABLE IF NOT EXISTS idempotency_keys (
        owner_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        key TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (owner_id, scope, key)
    )""",
    # encrypted Google refresh tokens, one per user and service (DG-L02). Never returned by any API.
    """
    CREATE TABLE IF NOT EXISTS oauth_tokens (
        user_id TEXT NOT NULL,
        service TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, service)
    )""",
    # Pub/Sub deliveries already handled (DG-L06): Google redelivers, so each messageId is processed once
    """
    CREATE TABLE IF NOT EXISTS processed_events (
        message_id TEXT PRIMARY KEY,
        received_at TEXT NOT NULL
    )""",
]


def get_db_file():
    return config.get_config().get("paths").get("database_file")


def get_connection(db_file: str | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(db_file or get_db_file(), timeout=15, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def close_connection(conn):
    conn.close()


@contextmanager
def transaction(conn: sqlite3.Connection):
    """One DB transaction: commit on success, roll back on any error."""
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


# columns added after the first release: (table, column, DDL). Existing databases get them on startup.
MIGRATIONS = [
    ("people", "email", "ALTER TABLE people ADD COLUMN email TEXT"),
    ("meetings", "external_ref", "ALTER TABLE meetings ADD COLUMN external_ref TEXT"),
]


def create_tables(conn: sqlite3.Connection | None = None):
    own = conn is None
    conn = conn or get_connection()
    for ddl in SCHEMA:
        conn.execute(ddl)
    for table, column, ddl in MIGRATIONS:
        if column not in {r["name"] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}:
            conn.execute(ddl)
    conn.commit()
    if own:
        close_connection(conn)
