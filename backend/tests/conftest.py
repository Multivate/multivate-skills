"""Use an isolated SQLite database and run app lifespan so create_all() runs."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["AUTO_CREATE_TABLES"] = "true"

from app.core.config import get_settings

get_settings.cache_clear()

from app.main import app


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as c:
        yield c
