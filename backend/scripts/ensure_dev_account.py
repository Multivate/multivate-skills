"""Create or refresh the platform admin (admin@multivate.com.ng).

Safe to run locally or on Render Shell after deploy.
"""
from __future__ import annotations

import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.core.database import SessionLocal
from app.services.admin_bootstrap import ADMIN_EMAIL, ADMIN_PASSWORD, ensure_platform_admin


def main() -> None:
    db = SessionLocal()
    try:
        result = ensure_platform_admin(db, sync_password=True)
        print(f"{result.upper()} {ADMIN_EMAIL} role=admin password={ADMIN_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
