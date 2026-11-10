from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.models.audio_phrase import AudioPhrase
from app.models.course import Course
from app.models.course_section import CourseSection
from app.models.course_status import CourseFormat
from app.models.enrollment import Enrollment
from app.models.enrollment_status import EnrollmentStatus
from app.models.role import UserRole
from app.models.lesson import Lesson
from app.models.student_learning_profile import StudentLearningProfile
from app.models.user import User
from app.schemas.learning import (
    MyCourseItem,
    ProgressUpdate,
    StudentPortalOut,
    StudentPortalCourseOut,
    StudentPortalPaymentOut,
    WeeklyCourseTargetOut,
)
from app.schemas.student_profile import (
    AdminStudentPlacementIn,
    StudentLearningProfileAdminRow,
    StudentLearningProfileOut,
    StudentLearningProfileUpsert,
)


def _week_fields(db: Session, course: Course, enr: Enrollment) -> dict:
    sections = list(
        db.scalars(
            select(CourseSection).where(CourseSection.course_id == course.id).order_by(CourseSection.position)
        ).all()
    )
    duration = course.duration_minutes if course.duration_minutes > 0 else max(0, course.lessons_count)
    if not sections:
        return {
            "duration_minutes": duration,
            "weeks_total": 1,
            "current_week": 1,
            "current_week_title": "Week 1",
            "current_week_lessons": course.lessons_count,
            "current_week_done": min(enr.lesson_done, course.lessons_count),
        }

    if course.format == CourseFormat.AUDIO:
        counts = [
            int(
                db.execute(
                    select(func.count()).select_from(AudioPhrase).where(AudioPhrase.section_id == section.id)
                ).scalar_one()
            )
            for section in sections
        ]
    else:
        counts = [
            int(
                db.execute(select(func.count()).select_from(Lesson).where(Lesson.section_id == section.id)).scalar_one()
            )
            for section in sections
        ]

    remaining = max(0, enr.lesson_done)
    current_idx = 0
    week_done = 0
    for i, count in enumerate(counts):
        if remaining < count or i == len(counts) - 1:
            current_idx = i
            week_done = min(remaining, count)
            break
        remaining -= count

    if enr.progress_pct >= 100:
        current_idx = len(sections) - 1
        week_done = counts[current_idx] if counts else 0

    section = sections[current_idx]
    return {
        "duration_minutes": duration,
        "weeks_total": len(sections),
        "current_week": current_idx + 1,
        "current_week_title": section.title,
        "current_week_lessons": counts[current_idx] if counts else 0,
        "current_week_done": week_done,
    }


def _my_course_item(db: Session, course: Course, enr: Enrollment, instructor: User | None) -> MyCourseItem:
    if enr.progress_pct >= 100:
        status_label = "Completed"
    elif enr.lesson_done == 0 and enr.progress_pct == 0:
        status_label = "Not Started"
    else:
        status_label = "In Progress"
    weeks = _week_fields(db, course, enr)
    return MyCourseItem(
        slug=course.slug,
        title=course.title,
        description=course.description,
        image_url=course.image_url,
        image_alt=course.title,
        lessons=course.lessons_count,
        lesson_done=enr.lesson_done,
        progress_pct=enr.progress_pct,
        status=status_label,
        instructor_name=instructor.name if instructor else None,
        instructor_email=str(instructor.email) if instructor else None,
        **weeks,
    )


def list_my_courses(db: Session, user_id: UUID) -> list[MyCourseItem]:
    instructor_user = aliased(User)
    stmt = (
        select(Course, Enrollment, instructor_user)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .outerjoin(instructor_user, instructor_user.id == Course.instructor_id)
        .where(Enrollment.user_id == user_id, Enrollment.status == EnrollmentStatus.ENROLLED)
        .order_by(Enrollment.created_at.desc())
    )
    rows = db.execute(stmt).all()
    return [_my_course_item(db, course, enr, instr) for course, enr, instr in rows]


def _max_lessons_for_course(db: Session, course: Course) -> int:
    n = db.execute(select(func.count()).select_from(Lesson).where(Lesson.course_id == course.id)).scalar_one()
    return max(int(n), course.lessons_count)


def update_progress(db: Session, user_id: UUID, course_slug: str, payload: ProgressUpdate) -> MyCourseItem:
    """Progress is automatic from watched lessons. Manual edits are ignored; values are recalculated."""
    from app.services.player_service import _recalc_enrollment_progress

    course = db.execute(select(Course).where(Course.slug == course_slug)).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    enr = db.execute(
        select(Enrollment).where(Enrollment.user_id == user_id, Enrollment.course_id == course.id)
    ).scalar_one_or_none()
    if not enr or enr.status != EnrollmentStatus.ENROLLED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not enrolled in this course")

    _recalc_enrollment_progress(db, user_id, course)
    db.commit()
    db.refresh(enr)
    instr = (
        db.execute(select(User).where(User.id == course.instructor_id)).scalar_one_or_none()
        if course.instructor_id
        else None
    )
    return _my_course_item(db, course, enr, instr)


def get_student_profile(db: Session, user_id: UUID) -> StudentLearningProfile | None:
    return db.execute(
        select(StudentLearningProfile).where(StudentLearningProfile.user_id == user_id)
    ).scalar_one_or_none()


def serialize_student_profile(user_id: UUID, row: StudentLearningProfile | None) -> StudentLearningProfileOut:
    if row is None:
        return StudentLearningProfileOut(
            user_id=user_id,
            education_level=None,
            current_skills=None,
            skills_to_learn=None,
            learning_goals=None,
            preferred_formats=None,
            weekly_hours=None,
            weekly_course_target=1,
            career_direction=None,
            extra_notes=None,
            goal_code=None,
            german_level=None,
            instruction_locale=None,
            study_mode=None,
            campus_location=None,
            cohort_name=None,
            updated_at=None,
        )
    return StudentLearningProfileOut.model_validate(row)


def list_student_profiles_for_admin(db: Session, limit: int = 200) -> list[StudentLearningProfileAdminRow]:
    stmt = (
        select(StudentLearningProfile, User.name, User.email)
        .join(User, User.id == StudentLearningProfile.user_id)
        .order_by(StudentLearningProfile.updated_at.desc())
        .limit(min(max(limit, 1), 500))
    )
    rows = db.execute(stmt).all()
    return [
        StudentLearningProfileAdminRow(
            user_id=profile.user_id,
            user_name=name,
            user_email=email,
            education_level=profile.education_level,
            current_skills=profile.current_skills,
            skills_to_learn=profile.skills_to_learn,
            learning_goals=profile.learning_goals,
            preferred_formats=profile.preferred_formats,
            weekly_hours=profile.weekly_hours,
            weekly_course_target=getattr(profile, "weekly_course_target", 1) or 1,
            career_direction=profile.career_direction,
            extra_notes=profile.extra_notes,
            goal_code=getattr(profile, "goal_code", None),
            german_level=getattr(profile, "german_level", None),
            instruction_locale=getattr(profile, "instruction_locale", None),
            study_mode=getattr(profile, "study_mode", None),
            campus_location=getattr(profile, "campus_location", None),
            cohort_name=getattr(profile, "cohort_name", None),
            updated_at=profile.updated_at,
        )
        for profile, name, email in rows
    ]


def upsert_student_profile(
    db: Session, user_id: UUID, payload: StudentLearningProfileUpsert
) -> StudentLearningProfileOut:
    data = payload.model_dump()
    row = get_student_profile(db, user_id)
    if row is None:
        row = StudentLearningProfile(user_id=user_id, **data)
        db.add(row)
    else:
        for key, val in data.items():
            setattr(row, key, val)
    db.commit()
    db.refresh(row)
    return StudentLearningProfileOut.model_validate(row)


def get_weekly_course_target(db: Session, user_id: UUID) -> WeeklyCourseTargetOut:
    row = get_student_profile(db, user_id)
    target = int(getattr(row, "weekly_course_target", 1) or 1) if row else 1
    return WeeklyCourseTargetOut(weekly_course_target=max(1, min(8, target)))


def set_weekly_course_target(db: Session, user_id: UUID, target: int) -> WeeklyCourseTargetOut:
    value = max(1, min(8, int(target)))
    row = get_student_profile(db, user_id)
    if row is None:
        row = StudentLearningProfile(user_id=user_id, weekly_course_target=value)
        db.add(row)
    else:
        row.weekly_course_target = value
        db.add(row)
    db.commit()
    return WeeklyCourseTargetOut(weekly_course_target=value)


def get_student_portal(db: Session, user: User) -> StudentPortalOut:
    from datetime import date

    from app.models.payment import PaymentStatus
    from app.services.bank_transfer_service import ensure_student_code, list_student_payments
    from app.services.learning_habit_service import get_habits
    from app.services.learning_intent import DEFAULT_CAMPUS, intent_from_profile, normalize_study_mode

    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")

    code = ensure_student_code(db, user)
    profile = get_student_profile(db, user.id)
    if profile is None:
        profile = StudentLearningProfile(user_id=user.id, study_mode="online")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    if not getattr(profile, "study_mode", None):
        profile.study_mode = "online"
        db.add(profile)
        db.commit()

    intent = intent_from_profile(profile, learn_with=getattr(user, "learn_with", None))
    mode = normalize_study_mode(getattr(profile, "study_mode", None))
    campus = getattr(profile, "campus_location", None)
    if mode != "online" and not campus:
        campus = DEFAULT_CAMPUS
        profile.campus_location = campus
        db.add(profile)
        db.commit()
    courses = list_my_courses(db, user.id)
    payments = list_student_payments(db, user.id)
    def payment_status(row) -> str:
        raw = getattr(row, "status", "")
        return str(getattr(raw, "value", raw))

    outstanding = [
        row
        for row in payments
        if payment_status(row) in {PaymentStatus.PENDING.value, PaymentStatus.AWAITING_REVIEW.value, "pending", "awaiting_review"}
    ]
    habits = get_habits(db, user.id, date.today().isoformat())
    return StudentPortalOut(
        student_code=code,
        name=user.name,
        email=user.email,
        study_mode=mode,
        campus_location=campus,
        cohort_name=getattr(profile, "cohort_name", None),
        goal_code=intent.goal,
        topic=intent.topic,
        german_level=intent.german_level,
        weekly_hours=intent.weekly_hours,
        enrolled_count=len(courses),
        outstanding_payments=len(outstanding),
        courses=[
            StudentPortalCourseOut(slug=row.slug, title=row.title, progress_pct=row.progress_pct, status=row.status)
            for row in courses
        ],
        payments=[
            StudentPortalPaymentOut(
                status=payment_status(row),
                amount_cents=row.amount_cents,
                currency=row.currency,
                course_title=getattr(row, "course_title", None),
                payment_reference=getattr(row, "payment_reference", None),
            )
            for row in payments[:8]
        ],
        visits_this_week=habits.visits_this_week,
        visit_goal=habits.visit_goal,
        minutes_this_week=habits.minutes_this_week,
        minutes_goal=habits.minutes_goal,
        visited_today=habits.visited_today,
    )


def admin_patch_student_placement(
    db: Session, user_id: UUID, payload: AdminStudentPlacementIn
) -> StudentLearningProfileAdminRow:
    from app.services.learning_intent import DEFAULT_CAMPUS, STUDY_MODE_FORMATS, normalize_study_mode

    student = db.get(User, user_id)
    if student is None or student.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    row = get_student_profile(db, user_id)
    if row is None:
        row = StudentLearningProfile(user_id=user_id, study_mode="online")
        db.add(row)
        db.flush()
    if payload.study_mode is not None:
        row.study_mode = normalize_study_mode(payload.study_mode)
        row.preferred_formats = STUDY_MODE_FORMATS[row.study_mode]
        if row.study_mode == "online":
            row.campus_location = None
            row.cohort_name = None
    if payload.campus_location is not None and (payload.study_mode is None or normalize_study_mode(payload.study_mode) != "online"):
        value = payload.campus_location.strip()
        row.campus_location = value or None
    if getattr(row, "study_mode", None) in {"hybrid", "physical"} and not getattr(row, "campus_location", None):
        row.campus_location = DEFAULT_CAMPUS
    if payload.cohort_name is not None and (payload.study_mode is None or normalize_study_mode(payload.study_mode) != "online"):
        value = payload.cohort_name.strip()
        row.cohort_name = value or None
    db.add(row)
    db.commit()
    db.refresh(row)
    return StudentLearningProfileAdminRow(
        user_id=row.user_id,
        user_name=student.name,
        user_email=student.email,
        education_level=row.education_level,
        current_skills=row.current_skills,
        skills_to_learn=row.skills_to_learn,
        learning_goals=row.learning_goals,
        preferred_formats=row.preferred_formats,
        weekly_hours=row.weekly_hours,
        weekly_course_target=getattr(row, "weekly_course_target", 1) or 1,
        career_direction=row.career_direction,
        extra_notes=row.extra_notes,
        goal_code=getattr(row, "goal_code", None),
        german_level=getattr(row, "german_level", None),
        instruction_locale=getattr(row, "instruction_locale", None),
        study_mode=getattr(row, "study_mode", None),
        campus_location=getattr(row, "campus_location", None),
        cohort_name=getattr(row, "cohort_name", None),
        updated_at=row.updated_at,
    )
