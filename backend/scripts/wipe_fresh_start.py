#!/usr/bin/env python3
"""Wipe learning data and non-admin users for a clean slate.

Keeps platform admin: admin@multivate.com.ng (recreated on next API boot if missing).

Local:
  cd backend
  set WIPE_FRESH_START_CONFIRM=yes
  python scripts/wipe_fresh_start.py

Production (Render Shell — uses DATABASE_URL from the web service):
  cd backend
  export WIPE_FRESH_START_CONFIRM=yes
  python scripts/wipe_fresh_start.py
"""

from __future__ import annotations

import logging
import os
import shutil
import sys
from pathlib import Path

from sqlalchemy import delete, inspect, text

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_settings  # noqa: E402
from app.core.database import SessionLocal, engine  # noqa: E402
from app.models.course import Course  # noqa: E402
from app.models.course_audit_log import CourseAuditLog  # noqa: E402
from app.models.course_review import CourseReview  # noqa: E402
from app.models.course_section import CourseSection  # noqa: E402
from app.models.enrollment import Enrollment  # noqa: E402
from app.models.inbox_message import InboxMessage  # noqa: E402
from app.models.instructor_teaching_profile import InstructorTeachingProfile  # noqa: E402
from app.models.lesson import Lesson  # noqa: E402
from app.models.lesson_resource import LessonResource  # noqa: E402
from app.models.mfa_otp_challenge import MfaOtpChallenge  # noqa: E402
from app.models.notification import Notification  # noqa: E402
from app.models.payment import Payment  # noqa: E402
from app.models.payment_audit_log import PaymentAuditLog  # noqa: E402
from app.models.student_learning_profile import StudentLearningProfile  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.video_watch_history import VideoWatchHistory  # noqa: E402
from app.services.media_storage_service import media_root  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("wipe_fresh_start")

KEEP_ADMIN_EMAIL = "admin@multivate.com.ng"
OPTIONAL_TABLES = ("instructor_reviews",)


def _delete_all(db, model, label: str) -> int:
    result = db.execute(delete(model))
    count = result.rowcount or 0
    logger.info("Deleted %s rows from %s", count, label)
    return count


def _delete_optional_tables(db) -> None:
    tables = set(inspect(engine).get_table_names())
    for table in OPTIONAL_TABLES:
        if table not in tables:
            logger.info("Skip optional table %s (not present)", table)
            continue
        result = db.execute(text(f"DELETE FROM {table}"))
        logger.info("Deleted %s rows from %s", result.rowcount or 0, table)


def _clear_media_uploads() -> None:
    root = media_root()
    removed = 0
    for child in root.iterdir():
        if child.is_dir():
            shutil.rmtree(child)
            removed += 1
            logger.info("Removed media folder: %s", child.name)
        elif child.is_file():
            child.unlink(missing_ok=True)
            removed += 1
            logger.info("Removed media file: %s", child.name)
    if removed == 0:
        logger.info("Media folder already empty: %s", root)


def _db_tail(database_url: str) -> str:
    if "@" in database_url:
        return database_url.split("@", 1)[-1]
    return database_url[:64]


def _is_local_database(database_url: str) -> bool:
    lower = database_url.lower()
    return "localhost" in lower or "127.0.0.1" in lower


def _require_confirm(database_url: str) -> None:
    if _is_local_database(database_url):
        return
    v = os.environ.get("WIPE_FRESH_START_CONFIRM", "").strip().lower()
    if v not in ("1", "yes", "true", "y"):
        print(
            "Refusing to wipe a non-local database.\n"
            f"Target: …{_db_tail(database_url)}\n"
            "Set WIPE_FRESH_START_CONFIRM=yes and run again.",
            file=sys.stderr,
        )
        sys.exit(1)


def main() -> None:
    settings = get_settings()
    _require_confirm(settings.database_url)
    logger.info("Fresh-start wipe target database …%s", _db_tail(settings.database_url))
    logger.info("Starting fresh-start database wipe…")

    db = SessionLocal()
    try:
        _delete_all(db, PaymentAuditLog, "payment_audit_logs")
        _delete_all(db, Payment, "payments")
        _delete_all(db, VideoWatchHistory, "video_watch_history")
        _delete_all(db, LessonResource, "lesson_resources")
        _delete_all(db, Lesson, "lessons")
        _delete_all(db, CourseSection, "course_sections")
        _delete_all(db, CourseAuditLog, "course_audit_logs")
        _delete_all(db, CourseReview, "course_reviews")
        _delete_all(db, Enrollment, "enrollments")
        _delete_all(db, Notification, "notifications")
        _delete_all(db, InboxMessage, "inbox_messages")
        _delete_all(db, MfaOtpChallenge, "mfa_otp_challenges")
        _delete_all(db, StudentLearningProfile, "student_learning_profiles")
        _delete_all(db, InstructorTeachingProfile, "instructor_teaching_profiles")
        _delete_all(db, Course, "courses")
        _delete_optional_tables(db)

        removed_users = db.execute(
            delete(User).where(User.email != KEEP_ADMIN_EMAIL)
        )
        logger.info(
            "Removed non-admin users (%s row(s)); kept %s",
            removed_users.rowcount or 0,
            KEEP_ADMIN_EMAIL,
        )

        db.commit()
        logger.info("Fresh-start wipe committed.")
    except Exception:
        db.rollback()
        logger.exception("Fresh-start wipe failed — rolled back.")
        raise
    finally:
        db.close()

    _clear_media_uploads()
    logger.info("Fresh-start wipe complete. Platform admin preserved.")


if __name__ == "__main__":
    main()
