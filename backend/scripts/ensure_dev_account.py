"""One-off: create or reset local dev admin account (not for production).

Uses admin@example.com — valid for Pydantic EmailStr and browser type=email.
(Legacy dev@multivate.local is rejected as a special-use domain.)
"""
from __future__ import annotations

import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.role import UserRole
from app.models.user import User

# RFC 2606 documentation domain; accepted by email-validator and HTML5 validators.
EMAIL = "admin@example.com"
LEGACY_EMAIL = "dev@multivate.local"
PASSWORD = "Multivate2026!"
NAME = "Multivate Admin"


def upsert_dev_admin(db: Session) -> str:
    """Create or update the dev admin user; commit inside this function."""
    legacy = db.execute(select(User).where(User.email == LEGACY_EMAIL)).scalar_one_or_none()
    if legacy:
        legacy.email = EMAIL
        legacy.name = NAME
        legacy.password_hash = hash_password(PASSWORD)
        legacy.role = UserRole.ADMIN
        legacy.is_active = True
        legacy.two_factor_enabled = True
        db.commit()
        return f"MIGRATED {LEGACY_EMAIL} -> {EMAIL} role=admin"

    u = db.execute(select(User).where(User.email == EMAIL)).scalar_one_or_none()
    if u:
        u.name = NAME
        u.password_hash = hash_password(PASSWORD)
        u.role = UserRole.ADMIN
        u.is_active = True
        u.two_factor_enabled = True
        db.commit()
        return f"UPDATED {EMAIL} role=admin"

    db.add(
        User(
            name=NAME,
            email=EMAIL,
            password_hash=hash_password(PASSWORD),
            role=UserRole.ADMIN,
            is_active=True,
            two_factor_enabled=True,
        )
    )
    db.commit()
    return f"CREATED {EMAIL} role=admin"


def main() -> None:
    db = SessionLocal()
    try:
        print(upsert_dev_admin(db))
    finally:
        db.close()


if __name__ == "__main__":
    main()
