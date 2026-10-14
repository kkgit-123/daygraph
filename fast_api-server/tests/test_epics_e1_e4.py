"""Backend gaps closed for E1-E4: idempotency, manual ingest, concurrency cap, links, live impact and graph rules,
audit, global rate limit. Run with `python3 -m pytest`; nothing here runs at server startup."""
import sqlite3
import threading

import httpx
import pytest

from app.utils.errors import ApiError
from tests.conftest import login


def _db(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


# ---- DG-B07 idempotency -------------------------------------------------------------

def test_idempotency_key_replays_first_task(client, aiko):
    body = {"title": "Draft the rollout note", "plan_date": "2026-10-12"}
    first = client.post("/api/tasks", headers={**aiko, "Idempotency-Key": "k-1"}, json=body)
    again = client.post("/api/tasks", headers={**aiko, "Idempotency-Key": "k-1"}, json=body)
    assert first.status_code == again.status_code == 201
    assert first.json()["data"]["id"] == again.json()["data"]["id"]
    other = client.post("/api/tasks", headers={**aiko, "Idempotency-Key": "k-2"}, json=body)
    assert other.json()["data"]["id"] != first.json()["data"]["id"]


def test_idempotency_key_replays_accept(client, aiko, db_path):
    pending = client.get("/api/decisions?status=pending", headers=aiko).json()["data"]["items"]
    did = next(c["id"] for c in pending if c["state"] == "pending" and not c["conflict"])
    h = {**aiko, "Idempotency-Key": "accept-1"}
    a = client.post(f"/api/decisions/{did}/accept", headers=h, json={})
    b = client.post(f"/api/decisions/{did}/accept", headers=h, json={})
    assert a.status_code == b.status_code == 200
    assert a.json()["data"] == b.json()["data"]


def test_idempotency_key_too_long_is_422(client, aiko):
    r = client.post("/api/tasks", headers={**aiko, "Idempotency-Key": "x" * 200}, json={"title": "t", "plan_date": "2026-10-12"})
    assert r.status_code == 422


# ---- DG-B11 concurrency: the cap holds under races -------------------------------

def test_concurrent_priority_requests_never_exceed_three(client, aiko, db_path):
    from app.services import tasks as svc
    from app.storage.db import get_connection

    day = "2026-10-12"
    results = []

    def work(i):
        conn = get_connection(db_path)
        try:
            svc.create_task(conn, {"id": "usr_aiko"}, {"title": f"race {i}", "plan_date": day, "priority_slot": (i % 3) + 1})
            results.append("ok")
        except ApiError as exc:
            results.append(exc.detail["code"])
        finally:
            conn.close()

    threads = [threading.Thread(target=work, args=(i,)) for i in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert results.count("ok") <= 3
    assert set(results) <= {"ok", "PRIORITY_CAP_EXCEEDED"}
    conn = _db(db_path)
    n = conn.execute("SELECT COUNT(*) FROM tasks WHERE owner_id = 'usr_aiko' AND plan_date = ? AND priority_slot IS NOT NULL AND deleted_at IS NULL",
                     (day,)).fetchone()[0]
    assert n <= 3


# ---- DG-B26 manual ingest -------------------------------------------------------------

def test_ingest_pasted_text_queues_and_processes(client, aiko):
    text = "[0:00] Mei Chen: Let's move the payments launch to 15 November.\n[0:20] Aiko Tanaka: Agreed, I will own the rollout."
    r = client.post("/api/meetings/ingest", headers=aiko, json={"text": text, "title": "Quick sync"})
    assert r.status_code == 202, r.text
    mid = r.json()["data"]["meeting_id"]
    m = client.get(f"/api/meetings/{mid}", headers=aiko)
    assert m.status_code == 200
    assert m.json()["data"]["meeting"]["status"] in ("PROCESSED", "FAILED")


def test_ingest_doc_url_mock_sample_and_unknown(client, aiko):
    ok = client.post("/api/meetings/ingest", headers=aiko, json={"doc_url": "https://docs.google.com/document/d/mock-transcript-mtg-pls"})
    assert ok.status_code == 202
    bad = client.post("/api/meetings/ingest", headers=aiko, json={"doc_url": "https://docs.google.com/document/d/other"})
    assert bad.status_code == 503 and bad.json()["data"]["code"] == "UPSTREAM_UNAVAILABLE"


def test_ingest_needs_exactly_one_source(client, aiko):
    assert client.post("/api/meetings/ingest", headers=aiko, json={}).status_code == 422
    assert client.post("/api/meetings/ingest", headers=aiko, json={"text": "a: b", "doc_url": "https://x.example/d"}).status_code == 422


def test_ingest_visibility_taro_cannot_see_aikos_meeting(client, aiko, taro):
    mid = client.post("/api/meetings/ingest", headers=aiko, json={"text": "Aiko Tanaka: Ship it."}).json()["data"]["meeting_id"]
    assert client.get(f"/api/meetings/{mid}", headers=taro).status_code == 404


# ---- DG-B18 saved links -----------------------------------------------------------------

def test_link_saved_as_metadata_only_in_mock_and_deduplicated(client, aiko):
    a = client.post("/api/links", headers=aiko, json={"url": "https://Example.com/retry/?utm_source=x"})
    assert a.status_code == 201
    link = a.json()["data"]
    assert link["status"] == "metadata_only"
    b = client.post("/api/links", headers=aiko, json={"url": "https://example.com/retry"})
    assert b.status_code == 200 and b.json()["data"]["id"] == link["id"]


@pytest.mark.parametrize("url", ["javascript:alert(1)", "http://localhost/admin", "http://169.254.169.254/latest/meta-data", "http://10.0.0.5/x", "ftp://example.com/a"])
def test_link_rejects_unsafe_addresses(client, aiko, url):
    r = client.post("/api/links", headers=aiko, json={"url": url})
    assert r.status_code == 422 and r.json()["data"]["code"] == "VALIDATION_ERROR"


def test_safe_fetcher_rejects_redirect_into_private_network(monkeypatch):
    from app.services import url_safety

    def handler(request):
        if request.url.host == "93.184.216.34":
            return httpx.Response(302, headers={"location": "http://127.0.0.1/admin"})
        return httpx.Response(200, text="should not be reached")

    real_client = httpx.Client
    monkeypatch.setattr(httpx, "Client", lambda **kw: real_client(transport=httpx.MockTransport(handler), **{k: v for k, v in kw.items() if k != "transport"}))
    with pytest.raises(ApiError) as exc:
        url_safety.fetch("https://93.184.216.34/start")
    assert exc.value.detail["code"] == "VALIDATION_ERROR"


def test_safe_fetcher_caps_redirect_chain(monkeypatch):
    from app.services import url_safety

    def handler(request):
        n = int(request.url.path.rsplit("/", 1)[-1])
        return httpx.Response(302, headers={"location": f"https://93.184.216.34/hop/{n + 1}"})

    real_client = httpx.Client
    monkeypatch.setattr(httpx, "Client", lambda **kw: real_client(transport=httpx.MockTransport(handler), **{k: v for k, v in kw.items() if k != "transport"}))
    with pytest.raises(ApiError) as exc:
        url_safety.fetch("https://93.184.216.34/hop/0")
    assert "Too many redirects" in exc.value.detail["message"]


# ---- DG-B19 live impact computed from own rows -----------------------------------------

def test_live_impact_is_computed_not_fixture(client, aiko, monkeypatch):
    from app.services import impact as impact_svc

    monkeypatch.setattr(impact_svc.clock, "is_mock", lambda: False)
    r = client.get("/api/impact", headers=aiko)
    assert r.status_code == 200
    stats = {s["key"]: s for s in r.json()["data"]["stats"]}
    assert set(stats) == {"decisions", "on_time", "conflicts", "review_time"}
    assert stats["decisions"]["value"] == 17  # 3 pending + 14 active or superseded in the seed; dismissed are excluded
    assert stats["conflicts"]["note"].endswith("waiting for your review")
    assert len(r.json()["data"]["weekly"]) == 7


def test_review_action_counts_toward_review_time(client, aiko, monkeypatch):
    from app.services import impact as impact_svc

    monkeypatch.setattr(impact_svc.clock, "is_mock", lambda: False)
    pending = client.get("/api/decisions?status=pending", headers=aiko).json()["data"]["items"]
    did = next(c["id"] for c in pending if not c["conflict"])
    client.post(f"/api/decisions/{did}/dismiss", headers=aiko)
    stats = {s["key"]: s for s in client.get("/api/impact", headers=aiko).json()["data"]["stats"]}
    assert stats["review_time"]["value"] != "0 min"


# ---- DG-B31 live mode shows at most four people -----------------------------------------

def test_live_graph_shows_at_most_four_people(client, aiko, monkeypatch):
    from app.services import graph as graph_svc

    monkeypatch.setattr(graph_svc.clock, "is_mock", lambda: False)
    body = client.get("/api/graph", headers=aiko).json()["data"]
    people_nodes = [n for n in body["nodes"] if n["kind"] == "person"]
    assert len(people_nodes) <= 4
    node_ids = {n["id"] for n in body["nodes"]}
    assert all(e["from"] in node_ids and e["to"] in node_ids for e in body["edges"])


# ---- DG-B07 audit trail -----------------------------------------------------------------

def test_sensitive_actions_are_audited(client, aiko, db_path):
    pending = client.get("/api/decisions?status=pending", headers=aiko).json()["data"]["items"]
    did = next(c["id"] for c in pending if not c["conflict"])
    client.post(f"/api/decisions/{did}/accept", headers=aiko, json={})
    client.get("/api/me/export", headers=aiko)
    client.post("/api/connections/meet/enable", headers=aiko)
    actions = {r["action"] for r in _db(db_path).execute("SELECT action FROM audit_log").fetchall()}
    assert {"auth.sign_in", "decision.accept", "export", "connection.enable"} <= actions


# ---- DG-B09 global rate limit ------------------------------------------------------------

def test_global_limit_is_sixty_per_minute_per_user(client, aiko):
    codes = [client.get("/api/me", headers=aiko).status_code for _ in range(60)]
    assert set(codes) == {200}
    r = client.get("/api/me", headers=aiko)
    assert r.status_code == 429 and r.json()["data"]["code"] == "RATE_LIMITED"


def test_readyz_reports_modes(client):
    body = client.get("/api/readyz").json()["data"]
    assert body["modes"] == {"google": "mock", "llm": "mock"}
