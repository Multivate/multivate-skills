"""Publish the German CEFR classroom ladder (A1 Advanced through C2 Advanced).

Does not replace german-a1-zero-to-beginner. Idempotent per slug.

  cd backend
  python scripts/seed_german_ladder.py

Production:

  docker compose -f docker-compose.prod.yml --env-file .env.production exec api \
    python scripts/seed_german_ladder.py
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

PACKS = [
    "german_a1_advanced",
    "german_a2_beginner",
    "german_a2_advanced",
    "german_b1_beginner",
    "german_b1_advanced",
    "german_b2_beginner",
    "german_b2_advanced",
    "german_c1_beginner",
    "german_c1_advanced",
    "german_c2_beginner",
    "german_c2_advanced",
]


def _load_pack(name: str):
    data_dir = Path(__file__).resolve().parent / "data"
    if str(data_dir) not in sys.path:
        sys.path.insert(0, str(data_dir))
    path = data_dir / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise SystemExit(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.COURSE, module.MODULES


from app.core.cache_service import invalidate_catalog_cache  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.models.audio_phrase import AudioPhrase  # noqa: E402
from app.models.course import Course  # noqa: E402
from app.models.course_section import CourseSection  # noqa: E402
from app.models.course_status import CourseFormat, CourseLevel, CourseStatus  # noqa: E402
from app.models.instructor_teaching_profile import InstructorTeachingProfile  # noqa: E402
from app.models.lesson import Lesson  # noqa: E402
from app.models.role import UserRole  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.admin_bootstrap import ADMIN_EMAIL  # noqa: E402

COURSE_INSTRUCTOR_EMAIL = "adewaledata@gmail.com"

_LEVEL = {
    "beginner": CourseLevel.BEGINNER,
    "intermediate": CourseLevel.INTERMEDIATE,
    "advanced": CourseLevel.ADVANCED,
}


def _admin(db) -> User:
    user = db.execute(select(User).where(User.email == ADMIN_EMAIL)).scalar_one_or_none()
    if user is None:
        raise SystemExit(f"No admin account {ADMIN_EMAIL}. Start the API once so admin bootstrap can run.")
    return user


def _course_owner(db, admin: User) -> User:
    email = COURSE_INSTRUCTOR_EMAIL.lower().strip()
    owner = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if owner is None:
        print(f"Instructor {email} not found; course stays with {admin.email}")
        return admin
    if owner.role != UserRole.INSTRUCTOR:
        owner.role = UserRole.INSTRUCTOR
        db.add(owner)
    profile = db.execute(
        select(InstructorTeachingProfile).where(InstructorTeachingProfile.user_id == owner.id)
    ).scalar_one_or_none()
    if profile is None:
        db.add(
            InstructorTeachingProfile(
                user_id=owner.id,
                expertise_areas="German language",
                teaching_bio="German classroom instructor for CEFR A1 to C2 exam preparation.",
                subjects_taught="German",
                years_experience="3_5",
                teaching_formats="online",
            )
        )
    return owner


def _upsert_course(db, admin: User, meta: dict) -> Course:
    course = db.execute(select(Course).where(Course.slug == meta["slug"])).scalar_one_or_none()
    if course is None:
        course = Course(slug=meta["slug"])
        db.add(course)
    course.title = meta["title"]
    course.subtitle = meta["subtitle"]
    course.description = meta["description"]
    course.learning_objectives = meta["learning_objectives"]
    course.image_url = meta["image_url"]
    course.category = meta["category"]
    course.tags = meta["tags"]
    course.format = CourseFormat.AUDIO
    course.source_language = "en"
    course.target_language = "de"
    course.cefr_level = meta["cefr_level"]
    course.level = _LEVEL.get(meta["band"], CourseLevel.BEGINNER)
    course.language = "en"
    course.duration_minutes = meta["duration_minutes"]
    course.price_cents = meta["price_cents"]
    course.currency = meta["currency"]
    course.is_free = False
    course.discount_percent = 0
    course.instructor_id = _course_owner(db, admin).id
    course.status = CourseStatus.PUBLISHED
    course.published_at = datetime.now(timezone.utc)
    course.rejection_reason = None
    db.flush()
    return course


def _replace_curriculum(db, course: Course, modules: list) -> tuple[int, int]:
    db.execute(delete(AudioPhrase).where(AudioPhrase.course_id == course.id))
    db.execute(delete(Lesson).where(Lesson.course_id == course.id))
    db.execute(delete(CourseSection).where(CourseSection.course_id == course.id))
    db.flush()
    phrase_count = 0
    for index, (title, scene_key, phrases) in enumerate(modules, start=1):
        if len(phrases) < 8:
            raise SystemExit(f"{course.slug} module {index} ({title}) has only {len(phrases)} lessons")
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
    return len(modules), phrase_count


def main() -> None:
    db = SessionLocal()
    try:
        admin = _admin(db)
        data_dir = Path(__file__).resolve().parent / "data"
        if str(data_dir) not in sys.path:
            sys.path.insert(0, str(data_dir))
        from goethe_extras import merge_modules
        from german_ladder import MINUTES_PER_LESSON  # noqa: E402
        import re

        for name in PACKS:
            meta, modules = _load_pack(name)
            if len(modules) != 16:
                raise SystemExit(f"{name} must have 16 modules, has {len(modules)}")
            modules = merge_modules(name, modules)
            lesson_count = sum(len(row[2]) for row in modules)
            meta = dict(meta)
            meta["description"] = re.sub(
                r"\d+ practice lessons", f"{lesson_count} practice lessons", meta["description"]
            )
            meta["duration_minutes"] = lesson_count * MINUTES_PER_LESSON
            meta["lessons_count"] = lesson_count
            if lesson_count < 600:
                raise SystemExit(f"{name} has only {lesson_count} lessons after merge, need 600+")
            course = _upsert_course(db, admin, meta)
            n_mod, n_ph = _replace_curriculum(db, course, modules)
            print(f"Published {course.slug}: {n_mod} modules, {n_ph} lessons, {meta['cefr_level']} {meta['band']}")
        from app.services.course_bundle import price_cents_for

        published = db.execute(select(Course).where(Course.status == CourseStatus.PUBLISHED)).scalars().all()
        for row in published:
            level = row.level.value if hasattr(row.level, "value") else str(row.level or "beginner")
            row.price_cents = price_cents_for(row.slug, level)
            row.is_free = False
            print(f"Price {row.slug}: ₦{row.price_cents // 100:,}")
        db.commit()
        invalidate_catalog_cache()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
