#!/usr/bin/env python3
"""Remove demo courses, enrollments, payments, notifications, and uploaded media.

Keeps registered user accounts (except the dev placeholder admin@example.com).
Run from backend/: python scripts/wipe_demo_data.py
"""

from __future__ import annotations

import logging
import shutil
import sys
from pathlib import Path

from sqlalchemy import delete, inspect, text

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SessionLocal, engine  # noqa: E402
from app.models.course import Course  # noqa: E402
from app.models.course_audit_log import CourseAuditLog  # noqa: E402
from app.models.course_section import CourseSection  # noqa: E402
from app.models.enrollment import Enrollment  # noqa: E402
from app.models.lesson import Lesson  # noqa: E402
from app.models.lesson_resource import LessonResource  # noqa: E402
from app.models.notification import Notification  # noqa: E402
from app.models.payment import Payment  # noqa: E402
from app.models.payment_audit_log import PaymentAuditLog  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.video_watch_history import VideoWatchHistory  # noqa: E402
from app.services.media_storage_service import media_root  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("wipe_demo_data")

OPTIONAL_TABLES = (
    "inbox_messages",
    "course_reviews",
    "instructor_reviews",
)


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


def main() -> None:
    logger.info("Starting demo data wipe…")

    db = SessionLocal()
    try:
        _delete_all(db, PaymentAuditLog, "payment_audit_logs")
        _delete_all(db, Payment, "payments")
        _delete_all(db, VideoWatchHistory, "video_watch_history")
        _delete_all(db, LessonResource, "lesson_resources")
        _delete_all(db, Lesson, "lessons")
        _delete_all(db, CourseSection, "course_sections")
        _delete_all(db, CourseAuditLog, "course_audit_logs")
        _delete_all(db, Enrollment, "enrollments")
        _delete_all(db, Notification, "notifications")
        _delete_all(db, Course, "courses")
        _delete_optional_tables(db)

        dev_admin = db.execute(delete(User).where(User.email.in_(("admin@example.com", "dev@multivate.local"))))
        if dev_admin.rowcount:
            logger.info("Removed legacy placeholder admin accounts (%s row(s))", dev_admin.rowcount)

        db.commit()
        logger.info("Database wipe committed.")
    except Exception:
        db.rollback()
        logger.exception("Database wipe failed — rolled back.")
        raise
    finally:
        db.close()

    _clear_media_uploads()
    logger.info("Demo data wipe complete. User accounts were kept.")


if __name__ == "__main__":
    main()
