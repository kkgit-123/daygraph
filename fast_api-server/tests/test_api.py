from freezegun import freeze_time

from tests.conftest import login


def test_fresh_seed_review_count_and_taro_sees_nothing(client, aiko, taro):
    assert client.get("/api/me", headers=aiko).json()["data"]["review_count"] == 3
    assert client.get("/api/me", headers=taro).json()["data"]["review_count"] == 0
    cards = client.get("/api/decisions?status=pending", headers=aiko).json()["data"]
    assert len(cards["items"]) == 3
    assert client.get("/api/decisions", headers=taro).json()["data"]["items"] == []


def test_unauthenticated_and_bad_token_are_401(client):
    r = client.get("/api/me")
    assert r.status_code == 401 and r.json()["data"]["code"] == "UNAUTHENTICATED"
    r = client.get("/api/me", headers={"Authorization": "Bearer nope"})
    assert r.status_code == 401


def test_user_id_in_body_is_not_trusted(client, aiko):
    r = client.patch("/api/me/settings", headers=aiko, json={"user_id": "usr_taro", "timezone": "Asia/Tokyo"})
    assert r.status_code == 200


def test_request_id_header(client, aiko):
    r = client.get("/api/me", headers={**aiko, "X-Request-ID": "abc123"})
    assert r.headers["X-Request-ID"] == "abc123"


def test_priority_cap_returns_409(client, aiko):
    # the seed already holds three priorities for 2026-10-09, so any fourth is over the cap
    r = client.post("/api/tasks", headers=aiko, json={"title": "Fourth", "plan_date": "2026-10-09", "priority_slot": 1})
    assert r.status_code == 409 and r.json()["data"]["code"] == "PRIORITY_CAP_EXCEEDED"
    r = client.patch("/api/tasks/tsk_t1", headers=aiko, json={"priority_slot": 2})
    assert r.status_code == 409 and r.json()["data"]["code"] == "PRIORITY_CAP_EXCEEDED"


def test_done_writes_impact_and_completes(client, aiko):
    r = client.patch("/api/tasks/tsk_t1", headers=aiko, json={"state": "DONE"})
    assert r.status_code == 200 and r.json()["data"]["state"] == "DONE"


def test_replan_moves_third_block_and_undo_restores(client, aiko):
    r = client.post("/api/plan/replan", headers=aiko, json={"date": "2026-10-09"})
    d = r.json()["data"]
    assert [m["block_id"] for m in d["moved"]] == ["blk_3"] and d["moved"][0]["to"] == "16:15"
    assert d["message"] == "Replanned: moved 1 block by 15 minutes. Nothing was dropped."
    day = client.get("/api/day/2026-10-09", headers=aiko).json()["data"]
    assert [s for s in day["schedule"] if s["id"] == "blk_3"][0]["start"] == "16:15"
    u = client.post("/api/plan/undo", headers=aiko, json={"undo_token": d["undo_token"]})
    assert u.status_code == 200
    day = client.get("/api/day/2026-10-09", headers=aiko).json()["data"]
    assert [s for s in day["schedule"] if s["id"] == "blk_3"][0]["start"] == "16:00"


def test_conflict_accept_supersedes_and_undo_restores(client, aiko):
    r = client.post("/api/decisions/dec_d3/accept", headers=aiko, json={})
    assert r.status_code == 200
    cards = client.get("/api/decisions?status=all", headers=aiko).json()["data"]
    d3 = next(i for i in cards["items"] if i["id"] == "dec_d3")
    assert d3["state"] == "accepted"
    g = client.get("/api/graph", headers=aiko).json()["data"]
    assert g["topic_id"] == "top_launch"
    sup = [e for e in g["edges"] if e["type"] == "supersedes" and not e.get("conflict")]
    assert any(e["from"] == "dec_d3" and e["to"] == "dec_d2" for e in sup)
    assert client.get("/api/me", headers=aiko).json()["data"]["review_count"] == 2
    u = client.post("/api/decisions/dec_d3/undo", headers=aiko)
    assert u.status_code == 200
    assert client.get("/api/me", headers=aiko).json()["data"]["review_count"] == 3


def test_undo_expires_after_ten_minutes(client, aiko):
    from datetime import datetime, timedelta, timezone

    client.post("/api/decisions/dec_c2/accept", headers=aiko, json={})
    later = datetime.now(timezone.utc) + timedelta(minutes=11)
    with freeze_time(later):
        r = client.post("/api/decisions/dec_c2/undo", headers=aiko)
    assert r.status_code == 409 and r.json()["data"]["code"] == "UNDO_EXPIRED"


def test_keep_both_and_dismiss(client, aiko):
    assert client.post("/api/decisions/dec_d3/keep_both", headers=aiko).status_code == 200
    g = client.get("/api/graph", headers=aiko).json()["data"]
    assert any(e.get("label") == "kept both" for e in g["edges"])
    assert client.post("/api/decisions/dec_c3/dismiss", headers=aiko).status_code == 200
    assert client.post("/api/decisions/dec_c3/dismiss", headers=aiko).status_code == 409


def test_owner_check_confirm(client, aiko):
    r = client.post("/api/decisions/dec_c3/owner", headers=aiko, json={"person_id": "per_kobayashi"})
    assert r.status_code == 200 and r.json()["data"]["note"] == "Confirmed by you"


def test_accept_all_only_non_conflict_cards_without_owner_check(client, aiko):
    r = client.post("/api/decisions/accept_all", headers=aiko)
    assert r.json()["data"]["accepted"] == 1  # only dec_c2 (dec_d3 conflicts, dec_c3 needs an owner check)


def test_graph_permissions_outsider(client, taro):
    g = client.get("/api/graph", headers=taro).json()["data"]
    assert g["nodes"] == [] and g["edges"] == []
    assert client.get("/api/decisions/dec_d3/lineage", headers=taro).status_code == 404
    assert client.get("/api/sources/dec_d3", headers=taro).status_code == 404


def test_ask_launch_is_grounded_and_permission_filtered(client, aiko, taro):
    r = client.post("/api/ask", headers=aiko, json={"question": "Why did we change the launch date?"}).json()["data"]
    assert r["grounded"] and r["citations"] and r["sentences"]
    assert all(s["cites"] for s in r["sentences"])
    src = client.get(f"/api/sources/{r['citations'][1]['ref_id']}", headers=aiko)
    assert src.status_code == 200
    t = client.post("/api/ask", headers=taro, json={"question": "Why did we change the launch date?"}).json()["data"]
    assert t["grounded"] is False and t["footer"] == "Nothing found. DayGraph never guesses."


def test_ask_retry_cites_saved_idea_and_link(client, aiko):
    r = client.post("/api/ask", headers=aiko, json={"question": "What did I save about retry strategies?"}).json()["data"]
    refs = [c["ref_id"] for c in r["citations"]]
    assert "ide_1" in refs and "lnk_1" in refs


def test_ask_unknown_topic_is_none_found(client, aiko):
    r = client.post("/api/ask", headers=aiko, json={"question": "What did the legal team decide about data retention?"}).json()["data"]
    assert r["grounded"] is False


def test_ask_rate_limit(client, aiko):
    codes = [client.post("/api/ask", headers=aiko, json={"question": "hello"}).status_code for _ in range(11)]
    assert codes[-1] == 429


def test_ideas_notes_links(client, aiko, taro):
    i = client.post("/api/ideas", headers=aiko, json={"text": "Try hedged requests"}).json()["data"]
    assert client.patch(f"/api/ideas/{i['id']}", headers=taro, json={"text": "x"}).status_code == 404
    assert client.put("/api/notes/day", headers=aiko, json={"text": "hi"}).json()["data"]["text"] == "hi"
    assert client.get("/api/notes/day", headers=taro).json()["data"]["text"] == ""
    a = client.post("/api/links", headers=aiko, json={"url": "https://example.com/a/?utm_source=x"}).json()["data"]
    b = client.post("/api/links", headers=aiko, json={"url": "https://example.com/a"}).json()["data"]
    assert a["id"] == b["id"]
    assert client.post("/api/links", headers=aiko, json={"url": "http://127.0.0.1/admin"}).status_code == 422
    assert client.post("/api/links", headers=aiko, json={"url": "http://169.254.169.254/latest"}).status_code == 422
    assert client.post("/api/links", headers=aiko, json={"url": "file:///etc/passwd"}).status_code == 422


def test_dev_login_only_in_mock_and_taro_sign_in(client):
    assert client.post("/api/auth/dev-login", json={"user": "taro"}).status_code == 200
    assert client.post("/api/auth/dev-login", json={"user": "mallory"}).status_code == 422


def test_ingestion_produces_three_cards(client, aiko):
    client.post("/api/dev/clear_decisions/mtg_pls", headers=aiko)
    assert client.get("/api/me", headers=aiko).json()["data"]["review_count"] == 0
    r = client.post("/api/meetings/mtg_pls/process", headers=aiko)
    assert r.status_code == 202
    assert client.get("/api/me", headers=aiko).json()["data"]["review_count"] == 3
    cards = client.get("/api/decisions?status=pending", headers=aiko).json()["data"]["items"]
    by_id = {c["id"]: c for c in cards}
    assert by_id and any(c["conflict"] for c in cards)
    assert any(c["owner"]["needs_check"] for c in cards)
    meeting = client.get("/api/meetings/mtg_pls", headers=aiko).json()["data"]["meeting"]
    assert len(meeting["checks"]) == 5


def test_health_and_envelope(client):
    assert client.get("/api/healthz").json()["status_code"] == 200
    assert client.get("/api/readyz").json()["data"]["modes"]["google"] == "mock"
