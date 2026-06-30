from __future__ import annotations

import logging
import re
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.course_status import CourseLevel, CourseStatus
from app.models.enrollment import Enrollment
from app.models.enrollment_status import EnrollmentStatus
from app.models.student_learning_profile import StudentLearningProfile
from app.schemas.course import CourseOut
from app.schemas.learning import RecommendedCourseOut
from app.services.course_service import course_to_out
from app.services.learning_service import get_student_profile

logger = logging.getLogger(__name__)

DEFAULT_LIMIT = 8

# Rough total course length (minutes) that fits a learner's weekly budget over ~4 weeks.
_WEEKLY_DURATION_CAP: dict[str, int | None] = {
    "under5": 1_200,
    "5to10": 2_400,
    "10to15": 3_600,
    "15plus": None,
}

# Education → course levels that score highest.
_EDUCATION_LEVEL_PREF: dict[str, set[str]] = {
    "secondary": {CourseLevel.BEGINNER.value},
    "vocational": {CourseLevel.BEGINNER.value, CourseLevel.INTERMEDIATE.value},
    "bachelors": {CourseLevel.BEGINNER.value, CourseLevel.INTERMEDIATE.value},
    "masters": {CourseLevel.INTERMEDIATE.value, CourseLevel.ADVANCED.value},
    "phd": {CourseLevel.INTERMEDIATE.value, CourseLevel.ADVANCED.value},
    "other": {CourseLevel.BEGINNER.value, CourseLevel.INTERMEDIATE.value},
}

# Keywords from preferred learning formats → course text signals.
_FORMAT_KEYWORDS: dict[str, tuple[str, ...]] = {
    "online": ("online", "self-paced", "async", "video", "remote"),
    "live": ("live", "cohort", "q&a", "office hours"),
    "in-person": ("in-person", "in person", "physical", "workshop", "presencial", "präsenz", "présentiel"),
    "hybrid": ("hybrid", "blended", "online +", "online+"),
    "project": ("project", "hands-on", "practical", "praxis"),
}


def _split_csv(value: str | None) -> list[str]:
    if not value or not value.strip():
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _course_blob(course: Course) -> str:
    parts = [course.category or "", course.title or "", course.description or "", course.tags or ""]
    return _norm(" ".join(parts))


def _topic_matches_course(topic: str, course: Course) -> bool:
    t = _norm(topic)
    if not t:
        return False
    category = _norm(course.category or "")
    blob = _course_blob(course)
    if t == category or t in category or category in t:
        return True
    if t in blob:
        return True
    # Allow partial word overlap for multi-word topics (e.g. "data science").
    words = [w for w in re.split(r"[^a-z0-9]+", t) if len(w) > 2]
    if words and sum(1 for w in words if w in blob) >= max(1, len(words) // 2):
        return True
    return False


def _format_matches_course(format_label: str, course: Course) -> bool:
    label = _norm(format_label)
    blob = _course_blob(course)
    for key, keywords in _FORMAT_KEYWORDS.items():
        if key in label or any(k in label for k in keywords):
            if any(k in blob for k in keywords):
                return True
    return False


def _duration_fit_score(weekly_hours: str | None, duration_minutes: int) -> float:
    cap = _WEEKLY_DURATION_CAP.get(weekly_hours or "")
    if cap is None:
        return 8.0
    if duration_minutes <= 0:
        return 4.0
    if duration_minutes <= cap:
        ratio = duration_minutes / cap
        return 20.0 * max(0.0, 1.0 - abs(ratio - 0.6) / 0.6)
    over = (duration_minutes - cap) / cap
    return max(-25.0, -12.0 * over)


def _level_score(education_level: str | None, course_level: CourseLevel) -> float:
    preferred = _EDUCATION_LEVEL_PREF.get(education_level or "other", _EDUCATION_LEVEL_PREF["other"])
    value = course_level.value
    if value in preferred:
        return 15.0 if value == CourseLevel.BEGINNER.value else 12.0
    if value == CourseLevel.BEGINNER.value:
        return 5.0
    return -8.0


def _score_course(course: Course, profile: StudentLearningProfile | None) -> tuple[float, list[str]]:
    if profile is None:
        return 1.0, []

    topics = _split_csv(profile.skills_to_learn)
    formats = _split_csv(profile.preferred_formats)
    reasons: list[str] = []
    score = 0.0

    matched_topics = [topic for topic in topics if _topic_matches_course(topic, course)]
    if matched_topics:
        score += 40.0 * min(len(matched_topics), 2)
        reasons.append(matched_topics[0])

    matched_formats = [fmt for fmt in formats if _format_matches_course(fmt, course)]
    if matched_formats:
        score += 12.0
        if not reasons:
            reasons.append(matched_formats[0])

    level_pts = _level_score(profile.education_level, course.level)
    score += level_pts
    if level_pts >= 12 and course.level == CourseLevel.BEGINNER:
        reasons.append("Beginner friendly")

    dur_pts = _duration_fit_score(profile.weekly_hours, course.duration_minutes)
    score += dur_pts
    if dur_pts >= 15 and "Fits your schedule" not in reasons:
        reasons.append("Fits your schedule")

    if course.is_free:
        score += 3.0

    if not reasons and topics:
        reasons.append(topics[0])

    return score, reasons[:3]


def _enrolled_course_ids(db: Session, user_id: UUID) -> set[UUID]:
    rows = db.execute(
        select(Enrollment.course_id).where(
            Enrollment.user_id == user_id,
            Enrollment.status == EnrollmentStatus.ENROLLED,
        )
    ).scalars().all()
    return set(rows)


def list_recommendations(db: Session, user_id: UUID, *, limit: int = DEFAULT_LIMIT) -> list[RecommendedCourseOut]:
    limit = min(max(limit, 1), 24)
    profile = get_student_profile(db, user_id)
    enrolled_ids = _enrolled_course_ids(db, user_id)

    courses = db.execute(
        select(Course)
        .where(Course.status == CourseStatus.PUBLISHED)
        .order_by(Course.published_at.desc().nullslast(), Course.created_at.desc())
    ).scalars().all()

    candidates = [c for c in courses if c.id not in enrolled_ids]
    logger.info(
        "Building recommendations user_id=%s profile=%s published=%s enrolled_skip=%s",
        user_id,
        "yes" if profile else "no",
        len(courses),
        len(enrolled_ids),
    )

    scored: list[tuple[float, Course, list[str]]] = []
    for course in candidates:
        score, reasons = _score_course(course, profile)
        scored.append((score, course, reasons))

    scored.sort(
        key=lambda row: (
            -row[0],
            row[1].duration_minutes if profile and profile.weekly_hours else 0,
            row[1].title.lower(),
        )
    )

    top = scored[:limit]
    if profile and top and top[0][0] <= 0:
        logger.info("No strong profile matches for user_id=%s — falling back to catalog order", user_id)
        top = [(0.0, c, []) for c in candidates[:limit]]

    out: list[RecommendedCourseOut] = []
    for score, course, reasons in top:
        base: CourseOut = course_to_out(course)
        out.append(
            RecommendedCourseOut(
                **base.model_dump(),
                match_score=round(score, 2),
                match_reasons=reasons,
            )
        )

    logger.info(
        "Recommendations ready user_id=%s count=%s top_slugs=%s",
        user_id,
        len(out),
        [item.slug for item in out[:3]],
    )
    return out
