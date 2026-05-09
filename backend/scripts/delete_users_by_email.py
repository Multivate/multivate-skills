"""Delete users (and their enrollments, MFA challenges, messages, etc.) by email address.

**Destructive.** Requires: DELETE_BY_EMAIL_CONFIRM=yes

Usage (from backend/):

  set DELETE_BY_EMAIL_CONFIRM=yes
  python scripts/delete_users_by_email.py one@x.com two@y.com
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from uuid import UUID

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import delete, func, or_, select, update

from app.core.database import SessionLocal
from app.models.certificate import Certificate
from app.models.course import Course
from app.models.course_review import CourseReview
from app.models.enrollment import Enrollment
from app.models.inbox_message import InboxMessage
from app.models.instructor_teaching_profile import InstructorTeachingProfile
from app.models.mfa_otp_challenge import MfaOtpChallenge
from app.models.payment import Payment
from app.models.student_learning_profile import StudentLearningProfile
from app.models.user import User


def _require_confirm() -> None:
    v = os.environ.get("DELETE_BY_EMAIL_CONFIRM", "").strip().lower()
    if v not in ("1", "yes", "true", "y"):
        print(
            "Refusing to run: set DELETE_BY_EMAIL_CONFIRM=yes then pass one or more emails as arguments.",
            file=sys.stderr,
        )
        sys.exit(1)


def delete_users_by_emails(db, emails: list[str]) -> tuple[list[str], list[str]]:
    """Return (deleted_emails, not_found_emails)."""
    normalized = [e.strip().lower() for e in emails if e.strip()]
    if not normalized:
        return [], []

    rows = db.execute(select(User.id, User.email).where(func.lower(User.email).in_(normalized))).all()
    found_map = {str(r.email).strip().lower(): r.id for r in rows}
    not_found = [e for e in normalized if e not in found_map]
    ids: list[UUID] = list(found_map.values())
    if not ids:
        return [], not_found

    id_tuple = tuple(ids)

    db.execute(delete(MfaOtpChallenge).where(MfaOtpChallenge.user_id.in_(id_tuple)))
    db.execute(
        delete(InboxMessage).where(
            or_(InboxMessage.sender_id.in_(id_tuple), InboxMessage.recipient_id.in_(id_tuple))
        )
    )
    db.execute(delete(CourseReview).where(CourseReview.user_id.in_(id_tuple)))
    db.execute(delete(Certificate).where(Certificate.user_id.in_(id_tuple)))
    db.execute(delete(Enrollment).where(Enrollment.user_id.in_(id_tuple)))
    db.execute(delete(Payment).where(Payment.user_id.in_(id_tuple)))
    db.execute(delete(StudentLearningProfile).where(StudentLearningProfile.user_id.in_(id_tuple)))
    db.execute(delete(InstructorTeachingProfile).where(InstructorTeachingProfile.user_id.in_(id_tuple)))

    db.execute(update(Course).where(Course.instructor_id.in_(id_tuple)).values(instructor_id=None))

    db.execute(delete(User).where(User.id.in_(id_tuple)))
    db.commit()

    deleted = [e for e in normalized if e in found_map]
    return deleted, not_found


def main() -> None:
    _require_confirm()
    emails = sys.argv[1:]
    if not emails:
        print("Pass at least one email, e.g. python scripts/delete_users_by_email.py a@b.com", file=sys.stderr)
        sys.exit(1)

    db = SessionLocal()
    try:
        deleted, missing = delete_users_by_emails(db, emails)
        for e in deleted:
            print("DELETED", e)
        for e in missing:
            print("NOT_FOUND", e)
    finally:
        db.close()


if __name__ == "__main__":
    main()
