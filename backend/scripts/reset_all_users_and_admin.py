"""Delete every user and related rows, then create the standard dev admin.

**Destructive.** Intended for local / staging resets only.

Requires env: RESET_USERS_CONFIRM=yes

Keeps courses (and lessons); clears instructor_id on courses that pointed at a deleted user
if the database supports ON DELETE SET NULL on courses.instructor_id.

Usage (from backend/):

  set RESET_USERS_CONFIRM=yes
  python scripts/reset_all_users_and_admin.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Running as `python scripts/this.py` puts `scripts/` on sys.path first — add backend root.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import delete, inspect

from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.models.certificate import Certificate
from app.models.course_review import CourseReview
from app.models.enrollment import Enrollment
from app.models.inbox_message import InboxMessage
from app.models.instructor_teaching_profile import InstructorTeachingProfile
from app.models.mfa_otp_challenge import MfaOtpChallenge
from app.models.payment import Payment
from app.models.student_learning_profile import StudentLearningProfile
from app.models.user import User

# ensure_dev_account lives in this directory; import after sys.path fix above.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ensure_dev_account import main as ensure_admin_main  # noqa: E402


def upsert_dev_admin(db):
    from app.services.admin_bootstrap import ensure_platform_admin

    result = ensure_platform_admin(db, sync_password=True)
    return f"{result.upper()} admin@multivate.com.ng role=admin"


def _require_confirm() -> None:
    v = os.environ.get("RESET_USERS_CONFIRM", "").strip().lower()
    if v not in ("1", "yes", "true", "y"):
        print(
            "Refusing to run: this deletes ALL users and their enrollments, messages, etc.\n"
            "Set environment variable RESET_USERS_CONFIRM=yes and run again.",
            file=sys.stderr,
        )
        sys.exit(1)


def wipe_all_users(db) -> int:
    """Return number of user rows deleted (0 if table was empty)."""
    # Order: children of users first (respects FK constraints).
    db.execute(delete(MfaOtpChallenge))
    db.execute(delete(InboxMessage))
    db.execute(delete(CourseReview))
    db.execute(delete(Certificate))
    db.execute(delete(Enrollment))
    db.execute(delete(Payment))
    db.execute(delete(StudentLearningProfile))
    db.execute(delete(InstructorTeachingProfile))
    r = db.execute(delete(User))
    db.commit()
    return r.rowcount or 0


def _ensure_schema() -> None:
    """Match dev API bootstrap: create tables if missing (when AUTO_CREATE_TABLES is true)."""
    settings = get_settings()
    if not settings.auto_create_tables:
        return
    if not inspect(engine).has_table("users"):
        import app.main  # noqa: F401 — register all models on Base.metadata

        Base.metadata.create_all(bind=engine)


def main() -> None:
    _require_confirm()
    _ensure_schema()
    db = SessionLocal()
    try:
        n = wipe_all_users(db)
        print("DELETED_USERS", n)
    finally:
        db.close()

    db2 = SessionLocal()
    try:
        msg = upsert_dev_admin(db2)
        print(msg)
    finally:
        db2.close()


if __name__ == "__main__":
    main()
