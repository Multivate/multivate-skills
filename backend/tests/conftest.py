"""Tests use a dedicated PostgreSQL database (never SQLite).

TEST_DATABASE_URL overrides everything. Otherwise the test DB is taken from
backend/.env DATABASE_URL with the database name switched to multivate_test
(same host, user, password — no secrets committed in this file).
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url


def _database_url_from_dotenv() -> str | None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.is_file():
        return None
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def _default_test_database_url() -> str:
    explicit = os.environ.get("TEST_DATABASE_URL", "").strip()
    if explicit:
        return explicit
    base = _database_url_from_dotenv()
    if base:
        u = make_url(base).set(database="multivate_test")
        return u.render_as_string(hide_password=False)
    return "postgresql://multivate:multivate@127.0.0.1:5432/multivate_test"


os.environ["DATABASE_URL"] = _default_test_database_url()
os.environ["AUTO_CREATE_TABLES"] = "true"

from app.core.config import get_settings

get_settings.cache_clear()

from app.main import app  # noqa: E402
from app.core.database import Base, engine  # noqa: E402


@pytest.fixture(autouse=True)
def _use_fake_redis(monkeypatch: pytest.MonkeyPatch) -> None:  # noqa: PT001
    import fakeredis

    from app.core import redis_client as rc

    rc.reset_redis_client_for_tests()
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(rc, "get_redis", lambda: fake)


@pytest.fixture(scope="session", autouse=True)
def _reset_test_schema() -> None:
    """Drop and recreate all ORM tables on the test database (destructive)."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as c:
        yield c
