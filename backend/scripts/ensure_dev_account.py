"""One-off: create or reset local dev admin account (not for production).

Uses admin@example.com — valid for Pydantic EmailStr and browser type=email.
(Legacy dev@multivate.local is rejected as a special-use domain.)
"""
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.role import UserRole
from app.models.user import User

# RFC 2606 documentation domain; accepted by email-validator and HTML5 validators.
EMAIL = "admin@example.com"
LEGACY_EMAIL = "dev@multivate.local"
PASSWORD = "Multivate2026!"
NAME = "Multivate Admin"


def main() -> None:
    db = SessionLocal()
    try:
        legacy = db.execute(select(User).where(User.email == LEGACY_EMAIL)).scalar_one_or_none()
        if legacy:
            legacy.email = EMAIL
            legacy.name = NAME
            legacy.password_hash = hash_password(PASSWORD)
            legacy.role = UserRole.ADMIN
            legacy.is_active = True
            db.commit()
            print("MIGRATED", LEGACY_EMAIL, "->", EMAIL, "role=admin")
            return

        u = db.execute(select(User).where(User.email == EMAIL)).scalar_one_or_none()
        if u:
            u.name = NAME
            u.password_hash = hash_password(PASSWORD)
            u.role = UserRole.ADMIN
            u.is_active = True
            db.commit()
            print("UPDATED", EMAIL, "role=admin")
        else:
            db.add(
                User(
                    name=NAME,
                    email=EMAIL,
                    password_hash=hash_password(PASSWORD),
                    role=UserRole.ADMIN,
                    is_active=True,
                )
            )
            db.commit()
            print("CREATED", EMAIL, "role=admin")
    finally:
        db.close()


if __name__ == "__main__":
    main()
