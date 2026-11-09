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
from app.models.user import User
from app.schemas.course import CourseOut
from app.schemas.learning import LearningPathOut, LearningPathStepOut, RecommendedCourseOut
from app.services.course_service import course_to_out
from app.services.learning_intent import LearningIntent, intent_from_profile, path_summary
from app.services.learning_service import get_student_profile

logger = logging.getLogger(__name__)

DEFAULT_LIMIT = 8

_GERMAN_KEYS = (
    "german",
    "deutsch",
    "goethe",
    "testdaf",
    "test daf",
    "dsh",
    "a1",
    "a2",
    "b1",
    "b2",
    "c1",
    "integration",
)
_TECH_KEYS = (
    "technolog",
    "coding",
    "program",
    "software",
    "data",
    "cloud",
    "digital",
    "computer",
    "cyber",
    "it ",
    "web",
    "python",
    "excel",
    "network",
)
_GOAL_KEYWORDS: dict[str, tuple[str, ...]] = {
    "work": ("work", "job", "career", "beruf", "workplace", "professional", "visa", "skilled"),
    "study": ("study", "university", "studien", "academic", "campus", "exam", "studienkolleg"),
    "train": ("ausbildung", "vocational", "apprentice", "trade", "berufsschule", "training"),
    "live": ("everyday", "daily", "conversation", "life", "integration", "anmeldung", "wohn"),
    "explore": ("intro", "overview", "start", "orientation", "beginner", "foundation"),
}
_GOAL_REASON = {
    "work": "Matches skilled work in Germany",
    "study": "Matches university study in Germany",
    "train": "Matches Ausbildung in Germany",
    "live": "Matches everyday life in Germany",
    "explore": "A clear starting path",
}
_CEFR_TO_LEVEL = {
    "none": CourseLevel.BEGINNER,
    "a1": CourseLevel.BEGINNER,
    "a2": CourseLevel.BEGINNER,
    "b1": CourseLevel.INTERMEDIATE,
    "b2": CourseLevel.INTERMEDIATE,
    "c1": CourseLevel.ADVANCED,
    "c2": CourseLevel.ADVANCED,
}


def _split_csv(value: str | None) -> list[str]:
    if not value or not value.strip():
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _course_blob(course: Course) -> str:
    parts = [
        course.category or "",
        course.title or "",
        course.subtitle or "",
        course.description or "",
        course.tags or "",
        course.learning_objectives or "",
    ]
    return _norm(" ".join(parts))


def _course_track(course: Course) -> str:
    category = _norm(course.category or "")
    blob = _course_blob(course)
    german = any(key in category or key in blob for key in _GERMAN_KEYS)
    tech = any(key in category or key in blob for key in _TECH_KEYS)
    if "german" in category or "deutsch" in category:
        german = True
    if german and not tech:
        return "german"
    if tech and not german:
        return "technology"
    if german and tech:
        return "german" if "german" in category or "deutsch" in category else "technology"
    return "other"


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
    words = [w for w in re.split(r"[^a-z0-9]+", t) if len(w) > 2]
    if words and sum(1 for w in words if w in blob) >= max(1, len(words) // 2):
        return True
    return False


def _duration_fit_score(week_minutes: int, duration_minutes: int) -> float:
    if duration_minutes <= 0:
        return 4.0
    cap = max(week_minutes * 4, 120)
    if duration_minutes <= cap:
        ratio = duration_minutes / cap
        return 16.0 * max(0.0, 1.0 - abs(ratio - 0.45) / 0.55)
    over = (duration_minutes - cap) / cap
    return max(-20.0, -10.0 * over)


def _cefr_level_score(level: str, course_level: CourseLevel) -> float:
    target = _CEFR_TO_LEVEL.get(level, CourseLevel.BEGINNER)
    if course_level == target:
        return 18.0
    order = {CourseLevel.BEGINNER: 0, CourseLevel.INTERMEDIATE: 1, CourseLevel.ADVANCED: 2}
    distance = abs(order[course_level] - order[target])
    if distance == 1:
        return 6.0
    return -12.0


def _goal_matches(goal: str, course: Course) -> bool:
    blob = _course_blob(course)
    return any(word in blob for word in _GOAL_KEYWORDS.get(goal, ()))


def _score_course(course: Course, intent: LearningIntent) -> tuple[float, list[str], str]:
    track = _course_track(course)
    reasons: list[str] = []
    score = 2.0

    wants_track = (track == "german" and intent.wants_german) or (track == "technology" and intent.wants_tech)
    if track == "other":
        topics = _split_csv(intent.topic)
        if any(_topic_matches_course(topic, course) for topic in topics):
            wants_track = True
            track = "technology" if intent.wants_tech and not intent.wants_german else track
            score += 28.0
            reasons.append(topics[0] if topics else intent.topic)
        else:
            score -= 8.0
    elif wants_track:
        score += 48.0
        reasons.append("German" if track == "german" else "Technology")
    else:
        score -= 24.0

    if intent.german_first:
        if track == "german":
            score += 22.0
        elif track == "technology":
            score -= 8.0

    if track == "german" and intent.wants_german:
        score += _cefr_level_score(intent.german_level, course.level)
        if course.level == _CEFR_TO_LEVEL.get(intent.german_level, CourseLevel.BEGINNER):
            reasons.append("Right German level")
    elif track == "technology" and intent.wants_tech:
        if intent.german_first and course.level == CourseLevel.BEGINNER:
            score += 8.0
        elif course.level == CourseLevel.BEGINNER:
            score += 6.0

    if _goal_matches(intent.goal, course):
        score += 20.0
        reasons.append(_GOAL_REASON[intent.goal])

    course_lang = (course.language or course.source_language or "en").lower()
    if course_lang == intent.locale:
        score += 8.0

    score += _duration_fit_score(intent.week_minutes, course.duration_minutes)
    if course.is_free:
        score += 3.0
    if not reasons:
        reasons.append(intent.topic)
    return score, reasons[:3], track


def _enrolled_course_ids(db: Session, user_id: UUID) -> set[UUID]:
    rows = db.execute(
        select(Enrollment.course_id).where(
            Enrollment.user_id == user_id,
            Enrollment.status == EnrollmentStatus.ENROLLED,
        )
    ).scalars().all()
    return set(rows)


def _to_recommended(course: Course, score: float, reasons: list[str]) -> RecommendedCourseOut:
    base: CourseOut = course_to_out(course)
    return RecommendedCourseOut(
        **base.model_dump(),
        match_score=round(score, 2),
        match_reasons=reasons,
    )


def _assign_role(index: int, track: str, intent: LearningIntent) -> str:
    if index == 0:
        return "now"
    if intent.german_first and track == "technology":
        return "later"
    if index == 1:
        return "next"
    return "later"


def build_learning_path(db: Session, user_id: UUID, *, limit: int = DEFAULT_LIMIT) -> LearningPathOut:
    limit = min(max(limit, 1), 24)
    profile = get_student_profile(db, user_id)
    user = db.get(User, user_id)
    intent = intent_from_profile(profile, learn_with=getattr(user, "learn_with", None))
    enrolled_ids = _enrolled_course_ids(db, user_id)
    courses = db.execute(
        select(Course)
        .where(Course.status == CourseStatus.PUBLISHED)
        .order_by(Course.published_at.desc().nullslast(), Course.created_at.desc())
    ).scalars().all()
    candidates = [course for course in courses if course.id not in enrolled_ids]
    scored: list[tuple[float, Course, list[str], str]] = []
    for course in candidates:
        score, reasons, track = _score_course(course, intent)
        scored.append((score, course, reasons, track))
    scored.sort(key=lambda row: (-row[0], row[1].title.lower()))

    strong = [row for row in scored if row[0] > 0]
    ordered = strong or scored
    top = ordered[:limit]
    steps: list[LearningPathStepOut] = []
    for index, (score, course, reasons, track) in enumerate(top):
        steps.append(
            LearningPathStepOut(
                order=index + 1,
                track=track,
                role=_assign_role(index, track, intent),
                reason=reasons[0] if reasons else intent.topic,
                course=_to_recommended(course, score, reasons),
            )
        )
    logger.info(
        "Learning path user_id=%s goal=%s topic=%s german=%s steps=%s",
        user_id,
        intent.goal,
        intent.topic,
        intent.german_level,
        [step.course.slug for step in steps[:3]],
    )
    return LearningPathOut(
        goal_code=intent.goal,
        topic=intent.topic,
        german_level=intent.german_level,
        instruction_locale=intent.locale,
        weekly_hours=intent.weekly_hours,
        session_minutes=intent.session_minutes,
        week_minutes=intent.week_minutes,
        week_days=intent.week_days,
        summary=path_summary(intent),
        has_catalog=bool(courses),
        steps=steps,
    )


def list_recommendations(db: Session, user_id: UUID, *, limit: int = DEFAULT_LIMIT) -> list[RecommendedCourseOut]:
    path = build_learning_path(db, user_id, limit=limit)
    return [step.course for step in path.steps]
