"""Create database multivate (and multivate_test) if missing — local dev helper.

Uses the same credentials as DATABASE_URL but connects to maintenance DB
`postgres`. Requires a role with CREATEDB or superuser (often true for the
owner role you created in pgAdmin).

Run from backend/:  python scripts/ensure_multivate_database.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urlparse

_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError, OperationalError, ProgrammingError


def _main() -> None:
    from app.core.config import get_settings

    get_settings.cache_clear()
    raw = get_settings().database_url
    u = make_url(raw)
    if u.get_dialect().name != "postgresql":
        print("This script only supports postgresql URLs.")
        sys.exit(1)

    target_main = u.database or "multivate"
    target_test = "multivate_test"

    admin = u.set(database="postgres")
    admin_str = admin.render_as_string(hide_password=False)

    try:
        eng = create_engine(admin_str, isolation_level="AUTOCOMMIT")
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
    except OperationalError as e:
        print("Cannot connect to PostgreSQL (maintenance DB postgres):", e)
        sys.exit(1)

    def exists(name: str) -> bool:
        with eng.connect() as conn:
            r = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :n"),
                {"n": name},
            ).scalar()
            return r is not None

    created: list[str] = []
    for dbname in (target_main, target_test):
        if exists(dbname):
            print(f"Database {dbname!r} already exists — skip.")
            continue
        ident = re.sub(r"[^a-zA-Z0-9_]", "", dbname) or dbname
        if ident != dbname:
            print("Refusing unsafe database name:", dbname)
            sys.exit(1)
        owner = (u.username or "multivate").replace('"', "")
        try:
            with eng.connect() as conn:
                conn.execute(text(f'CREATE DATABASE "{ident}" OWNER "{owner}"'))
        except (ProgrammingError, DBAPIError) as e:
            print(f"CREATE DATABASE {dbname!r} failed:", e)
            sys.exit(1)
        created.append(dbname)
        print(f"Created database {dbname!r}.")

    if created:
        print("Done. Run: python scripts/verify_local_setup.py")
    else:
        print("Nothing to create.")


if __name__ == "__main__":
    _main()
