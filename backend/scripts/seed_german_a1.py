"""Create or replace the published German A1 classroom course.

Idempotent. Assigns the course to admin@multivate.com.ng and publishes it.

  cd backend
  python scripts/seed_german_a1.py

Production:

  docker compose -f docker-compose.prod.yml --env-file .env.production exec api \
    python scripts/seed_german_a1.py
"""

from __future__ import annotations

import importlib.util
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete, select

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _load_curriculum():
    data_dir = Path(__file__).resolve().parent / "data"
    if str(data_dir) not in sys.path:
        sys.path.insert(0, str(data_dir))
    path = data_dir / "german_a1_modules.py"
    spec = importlib.util.spec_from_file_location("german_a1_modules", path)
    if spec is None or spec.loader is None:
        raise SystemExit(f"Could not load curriculum file: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.COURSE, module.MODULES


COURSE, MODULES = _load_curriculum()

from app.core.cache_service import invalidate_catalog_cache  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.models.audio_phrase import AudioPhrase  # noqa: E402
from app.models.course import Course  # noqa: E402
from app.models.course_section import CourseSection  # noqa: E402
from app.models.course_status import CourseFormat, CourseLevel, CourseStatus  # noqa: E402
from app.models.lesson import Lesson  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.admin_bootstrap import ADMIN_EMAIL  # noqa: E402


def _admin(db) -> User:
    user = db.execute(select(User).where(User.email == ADMIN_EMAIL)).scalar_one_or_none()
    if user is None:
        raise SystemExit(f"No admin account {ADMIN_EMAIL}. Start the API once so admin bootstrap can run.")
    return user


def _upsert_course(db, admin: User) -> Course:
    course = db.execute(select(Course).where(Course.slug == COURSE["slug"])).scalar_one_or_none()
    if course is None:
        course = Course(slug=COURSE["slug"])
        db.add(course)
    course.title = COURSE["title"]
    course.subtitle = COURSE["subtitle"]
    course.description = COURSE["description"]
    course.learning_objectives = COURSE["learning_objectives"]
    course.image_url = COURSE["image_url"]
    course.category = COURSE["category"]
    course.tags = COURSE["tags"]
    course.format = CourseFormat.AUDIO
    course.source_language = "en"
    course.target_language = "de"
    course.cefr_level = "A1"
    course.level = CourseLevel.BEGINNER
    course.language = "en"
    course.duration_minutes = COURSE["duration_minutes"]
    course.price_cents = COURSE["price_cents"]
    course.currency = COURSE["currency"]
    course.is_free = False
    course.discount_percent = 0
    course.instructor_id = admin.id
    course.status = CourseStatus.PUBLISHED
    course.published_at = datetime.now(timezone.utc)
    course.rejection_reason = None
    db.flush()
    return course


def _replace_curriculum(db, course: Course) -> tuple[int, int]:
    db.execute(delete(AudioPhrase).where(AudioPhrase.course_id == course.id))
    db.execute(delete(Lesson).where(Lesson.course_id == course.id))
    db.execute(delete(CourseSection).where(CourseSection.course_id == course.id))
    db.flush()

    phrase_count = 0
    for index, (title, scene_key, phrases) in enumerate(MODULES, start=1):
        section = CourseSection(
            course_id=course.id,
            title=title,
            position=index,
            scene_key=scene_key,
        )
        db.add(section)
        db.flush()
        for source, target, usage in phrases:
            phrase_count += 1
            db.add(
                AudioPhrase(
                    course_id=course.id,
                    section_id=section.id,
                    position=phrase_count,
                    source_text=source,
                    target_text=target,
                    usage_note=usage,
                )
            )
    course.lessons_count = phrase_count
    return len(MODULES), phrase_count


def main() -> None:
    db = SessionLocal()
    try:
        admin = _admin(db)
        course = _upsert_course(db, admin)
        modules, phrases = _replace_curriculum(db, course)
        db.commit()
        invalidate_catalog_cache()
        print(
            f"Published {course.slug}: {modules} modules, {phrases} lessons, "
            f"status={course.status.value}, instructor={admin.email}"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
