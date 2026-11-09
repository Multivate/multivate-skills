"""Course recommendations based on student learning profile."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.course import Course
from app.models.course_status import CourseLevel, CourseStatus
from tests.registration_utils import register_student_complete

PROFILE_DS = {
    "education_level": "secondary",
    "current_skills": None,
    "skills_to_learn": "Data Science",
    "learning_goals": None,
    "preferred_formats": "Online (self-paced), Short video lessons",
    "weekly_hours": "under5",
    "career_direction": None,
    "extra_notes": None,
}


def _seed_published_courses() -> None:
    db = SessionLocal()
    try:
        rows = (
            ("rec-ds-intro", "Intro to Data Science", "Data Science", CourseLevel.BEGINNER, 180),
            ("rec-german-a1", "German A1 Basics", "German Language", CourseLevel.BEGINNER, 240),
            ("rec-cloud-pro", "Advanced Cloud Architecture", "Cloud Computing", CourseLevel.ADVANCED, 2_400),
        )
        for slug, title, category, level, duration in rows:
            found = db.execute(select(Course).where(Course.slug == slug)).scalar_one_or_none()
            if found:
                continue
            db.add(
                Course(
                    slug=slug,
                    title=title,
                    description="Structured online video lessons for career-focused learners.",
                    image_url="https://example.com/course.png",
                    lessons_count=6,
                    category=category,
                    level=level,
                    duration_minutes=duration,
                    status=CourseStatus.PUBLISHED,
                    is_free=True,
                )
            )
        db.commit()
    finally:
        db.close()


def test_recommendations_prioritize_profile_match(client) -> None:
    _seed_published_courses()
    email = f"rec-{uuid.uuid4().hex[:8]}@example.com"
    auth = register_student_complete(
        client,
        {
            "name": "Rec Learner",
            "email": email,
            "password": "password123",
            "learning_profile": PROFILE_DS,
        },
    )
    tok = auth["access_token"]
    r = client.get("/api/v1/learning/recommendations", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, list)
    assert len(body) >= 1
    slugs = [item["slug"] for item in body]
    assert slugs[0] == "rec-ds-intro"
    assert body[0]["category"] == "Data Science"
    assert "Data Science" in body[0]["match_reasons"]


PROFILE_PATH = {
    "education_level": "other",
    "current_skills": "a1",
    "skills_to_learn": "German, Technology",
    "learning_goals": "skilled work in Germany",
    "preferred_formats": "Online (self-paced)",
    "weekly_hours": "5to10",
    "career_direction": "work",
    "extra_notes": "learn_with:en;level:a1;goal:work",
    "goal_code": "work",
    "german_level": "a1",
    "instruction_locale": "en",
}


def test_learning_path_sequences_german_before_tech(client) -> None:
    _seed_published_courses()
    email = f"path-{uuid.uuid4().hex[:8]}@example.com"
    auth = register_student_complete(
        client,
        {
            "name": "Path Learner",
            "email": email,
            "password": "password123",
            "learning_profile": PROFILE_PATH,
        },
    )
    tok = auth["access_token"]
    r = client.get("/api/v1/learning/path", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["goal_code"] == "work"
    assert body["german_level"] == "a1"
    assert body["topic"] == "German, Technology"
    assert body["session_minutes"] == 30
    assert body["has_catalog"] is True
    slugs = [step["course"]["slug"] for step in body["steps"]]
    assert slugs[0] == "rec-german-a1"
    assert body["steps"][0]["track"] == "german"
    assert body["steps"][0]["role"] == "now"


def test_recommendations_forbidden_for_instructor(client) -> None:
    from tests.test_payment_checkout import _instructor

    ins = _instructor(client, f"rec-ins-{uuid.uuid4().hex[:8]}@example.com")
    tok = ins["access_token"]
    r = client.get("/api/v1/learning/recommendations", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 403
