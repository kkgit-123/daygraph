"""The only place permission SQL lives. Every query that returns decisions, meetings, docs or graph nodes
is filtered by the viewer in SQL, never after the fact. Not visible = not found (404), never 403.

All fragments take the bind parameter :viewer_id (a user id).
"""

VIEWER_PERSON = "(SELECT person_id FROM users WHERE id = :viewer_id)"

# meetings the viewer attended or organised
def visible_meeting(alias: str = "m") -> str:
    return (
        f"({alias}.deleted_at IS NULL AND ("
        f"{alias}.id IN (SELECT ma.meeting_id FROM meeting_attendees ma WHERE ma.person_id = {VIEWER_PERSON} AND ma.status = 'attended') "
        f"OR {alias}.organizer_id = {VIEWER_PERSON}))"
    )


def visible_meeting_ids() -> str:
    return f"(SELECT m.id FROM meetings m WHERE {visible_meeting('m')})"


# decisions that live in a visible meeting
def visible_decision(alias: str = "d") -> str:
    return f"({alias}.deleted_at IS NULL AND {alias}.meeting_id IN {visible_meeting_ids()})"


# documents the viewer is on the ACL of
def visible_doc(alias: str = "doc") -> str:
    return f"({alias}.deleted_at IS NULL AND {alias}.id IN (SELECT da.document_id FROM document_acl da WHERE da.person_id = {VIEWER_PERSON}))"


# topics with at least one visible decision
def visible_topic(alias: str = "t") -> str:
    return (
        f"({alias}.deleted_at IS NULL AND EXISTS (SELECT 1 FROM decisions d WHERE d.topic_id = {alias}.id AND {visible_decision('d')}))"
    )


# private things: owner only
def owned(alias: str, column: str = "owner_id") -> str:
    return f"({alias}.{column} = :viewer_id AND {alias}.deleted_at IS NULL)"
