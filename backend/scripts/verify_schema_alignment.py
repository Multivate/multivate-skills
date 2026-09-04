"""Verify live Postgres tables/columns match SQLAlchemy models.

Exit 0 when aligned; exit 1 when tables or columns are missing.
Usage (from backend/):  python scripts/verify_schema_alignment.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import inspect  # noqa: E402

import app.main  # noqa: E402,F401 - register models
from app.core.database import Base, engine  # noqa: E402


def main() -> int:
    insp = inspect(engine)
    db_tables = set(insp.get_table_names())
    model_tables = set(Base.metadata.tables.keys())

    missing_tables = sorted(model_tables - db_tables)
    missing_cols: list[str] = []

    for tname, table in sorted(Base.metadata.tables.items()):
        if tname not in db_tables:
            continue
        db_cols = {c["name"] for c in insp.get_columns(tname)}
        model_cols = {c.name for c in table.columns}
        for col in sorted(model_cols - db_cols):
            missing_cols.append(f"{tname}.{col}")

    print(f"tables: {len(model_tables & db_tables)}/{len(model_tables)} present")
    if missing_tables:
        print("MISSING TABLES:")
        for t in missing_tables:
            print(f"  - {t}")
    if missing_cols:
        print("MISSING COLUMNS:")
        for c in missing_cols:
            print(f"  - {c}")

    if missing_tables or missing_cols:
        print("SCHEMA ALIGNMENT: FAIL")
        return 1

    print("SCHEMA ALIGNMENT: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
