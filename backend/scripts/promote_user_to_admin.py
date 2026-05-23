"""Promote an existing user to admin by email (for production DB setup).

Usage (from backend/, with DATABASE_URL pointing at your live Postgres):

  python scripts/promote_user_to_admin.py you@yourdomain.com

Or create the default dev admin:

  python scripts/ensure_dev_account.py
"""
from __future__ import annotations

import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.role import UserRole
from app.models.user import User


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python scripts/promote_user_to_admin.py <email>", file=sys.stderr)
        sys.exit(1)

    email = sys.argv[1].strip().lower()
    if not email or "@" not in email:
        print("Provide a valid email address.", file=sys.stderr)
        sys.exit(1)

    db = SessionLocal()
    try:
        user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if not user:
            print(f"No user found with email {email}. Register on the live site first, then run this again.")
            sys.exit(1)
        user.role = UserRole.ADMIN
        user.is_active = True
        db.commit()
        print(f"OK: {email} is now role=admin. Sign out and sign in again on the live site.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
