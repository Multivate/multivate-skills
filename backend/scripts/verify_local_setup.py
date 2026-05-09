"""Quick local checks: settings load, DB reachable, optional API /health/ready.

Run from backend/:  python scripts/verify_local_setup.py

Note: a **DATABASE_URL** environment variable in your shell overrides `backend/.env`.
If the URL shown here is unexpected, run in a fresh terminal or `Remove-Item Env:DATABASE_URL`.
"""
from __future__ import annotations

import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings
from app.core.database import engine


def _mask_url(url: str) -> str:
    if "@" in url and "://" in url:
        head, _, tail = url.partition("://")
        creds, _, host = tail.partition("@")
        if ":" in creds:
            user, _, _ = creds.partition(":")
            return f"{head}://{user}:***@{host}"
    return url


def main() -> None:
    get_settings.cache_clear()
    s = get_settings()
    print("ENVIRONMENT:", s.environment)
    if os.environ.get("DATABASE_URL"):
        print("NOTE: DATABASE_URL is set in the shell (overrides .env).")
    print("DATABASE_URL:", _mask_url(s.database_url))

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("DATABASE: OK (SELECT 1)")
    except OperationalError as exc:
        print("DATABASE: FAILED (cannot connect) —", exc.orig if getattr(exc, "orig", None) else exc)
        print("Hint: start Postgres from repo root:  docker compose up -d db")
        print("Or create the DB manually (see database/pgadmin/) and set DATABASE_URL in backend/.env.")
        sys.exit(1)
    except Exception as exc:
        print("DATABASE: FAILED —", exc)
        sys.exit(1)

    base = "http://127.0.0.1:8000"
    for path in ("/health", "/health/ready"):
        url = base + path
        try:
            with urllib.request.urlopen(url, timeout=3) as r:
                body = r.read().decode("utf-8", errors="replace")
                print(f"API {path}:", r.status, body[:200])
        except urllib.error.URLError as exc:
            print(f"API {path}: not reachable —", exc.reason)
            print(f"Hint: start API from backend/ with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")


if __name__ == "__main__":
    main()
