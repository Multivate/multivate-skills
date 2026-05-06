"""Upsert catalog courses and sample enrollments for local demos (idempotent)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select

from app.core.database import Base, SessionLocal, engine
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User

# Mirrors `frontend/src/data/courses-catalog.ts` slugs used on the marketing site.
CATALOG = [
    {
        "slug": "german",
        "title": "German Language (A1–B2)",
        "description": "Learn German step-by-step from A1 to B2 level.",
        "image_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80",
        "lessons_count": 42,
    },
    {
        "slug": "fullstack-react",
        "title": "Full Stack with React",
        "description": "Modern React, APIs, auth, and deployment from first principles.",
        "image_url": "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80",
        "lessons_count": 38,
    },
]

# (slug, lesson_done, progress_pct)
SAMPLE_PROGRESS = [
    ("german", 12, 40),
    ("fullstack-react", 15, 32),
]

DEMO_EMAIL = "admin@example.com"


def _upsert_course(db, row: dict, instructor_id) -> Course:
    c = db.execute(select(Course).where(Course.slug == row["slug"])).scalar_one_or_none()
    if c:
        c.title = row["title"]
        c.description = row["description"]
        c.image_url = row["image_url"]
        c.lessons_count = row["lessons_count"]
        if instructor_id is not None and c.instructor_id is None:
            c.instructor_id = instructor_id
        return c
    c = Course(
        slug=row["slug"],
        title=row["title"],
        description=row["description"],
        image_url=row["image_url"],
        lessons_count=row["lessons_count"],
        instructor_id=instructor_id,
    )
    db.add(c)
    db.flush()
    return c


def _ensure_enrollment(db, user_id: UUID, course_id: UUID, lesson_done: int, progress_pct: int) -> None:
    ex = db.execute(
        select(Enrollment).where(Enrollment.user_id == user_id, Enrollment.course_id == course_id)
    ).scalar_one_or_none()
    if ex:
        ex.lesson_done = lesson_done
        ex.progress_pct = progress_pct
        return
    db.add(
        Enrollment(
            user_id=user_id,
            course_id=course_id,
            lesson_done=lesson_done,
            progress_pct=progress_pct,
        )
    )


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.execute(select(User).where(User.email == DEMO_EMAIL)).scalar_one_or_none()
        if not user:
            print(f"No user with email {DEMO_EMAIL}; create that account first (see scripts/ensure_dev_account.py).")
            return

        slug_to_course: dict[str, Course] = {}
        for row in CATALOG:
            slug_to_course[row["slug"]] = _upsert_course(db, row, user.id)

        for slug, ld, pct in SAMPLE_PROGRESS:
            c = slug_to_course.get(slug)
            if not c:
                continue
            _ensure_enrollment(db, user.id, c.id, ld, pct)
        db.commit()
        print(f"Seeded courses + enrollments for {DEMO_EMAIL}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
