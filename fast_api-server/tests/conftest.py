import os
import sys

import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)
os.chdir(ROOT)  # config.ini, logging.conf and prompts are read relative to the project root


@pytest.fixture()
def db_path(tmp_path, monkeypatch):
    import app.storage.db as dbmod

    path = str(tmp_path / "test.db")
    monkeypatch.setattr(dbmod, "get_db_file", lambda: path)
    return path


@pytest.fixture()
def client(db_path, monkeypatch):
    from fastapi.testclient import TestClient

    from app import init_app
    from app.adapters import reset_adapters
    from app.services import jobs
    from app.utils import ratelimit

    reset_adapters()
    jobs.set_inline(True)
    ratelimit.reset()
    app = init_app()
    with TestClient(app) as c:
        yield c
    jobs.set_inline(False)
    reset_adapters()


def login(client, user="aiko"):
    r = client.post("/api/auth/dev-login", json={"user": user})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["data"]["access_token"]}


@pytest.fixture()
def aiko(client):
    return login(client, "aiko")


@pytest.fixture()
def taro(client):
    return login(client, "taro")
