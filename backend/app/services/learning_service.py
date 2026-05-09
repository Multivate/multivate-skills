from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.student_learning_profile import StudentLearningProfile
from app.models.user import User
from app.schemas.learning import MyCourseItem, ProgressUpdate
from app.schemas.student_profile import (
    StudentLearningProfileAdminRow,
    StudentLearningProfileOut,
    StudentLearningProfileUpsert,
)


def _my_course_item(course: Course, enr: Enrollment, instructor: User | None) -> MyCourseItem:
    if enr.progress_pct >= 100:
        status_label = "Completed"
    elif enr.lesson_done == 0 and enr.progress_pct == 0:
        status_label = "Not Started"
    else:
        status_label = "In Progress"
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
    )


def list_my_courses(db: Session, user_id: UUID) -> list[MyCourseItem]:
    instructor_user = aliased(User)
    stmt = (
        select(Course, Enrollment, instructor_user)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .outerjoin(instructor_user, instructor_user.id == Course.instructor_id)
        .where(Enrollment.user_id == user_id)
        .order_by(Enrollment.created_at.desc())
    )
    rows = db.execute(stmt).all()
    return [_my_course_item(course, enr, instr) for course, enr, instr in rows]


def _max_lessons_for_course(db: Session, course: Course) -> int:
    n = db.execute(select(func.count()).select_from(Lesson).where(Lesson.course_id == course.id)).scalar_one()
    return max(int(n), course.lessons_count)


def update_progress(db: Session, user_id: UUID, course_slug: str, payload: ProgressUpdate) -> MyCourseItem:
    course = db.execute(select(Course).where(Course.slug == course_slug)).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    enr = db.execute(
        select(Enrollment).where(Enrollment.user_id == user_id, Enrollment.course_id == course.id)
    ).scalar_one_or_none()
    if not enr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not enrolled in this course")

    cap = _max_lessons_for_course(db, course)
    if payload.lesson_done is not None:
        enr.lesson_done = min(max(payload.lesson_done, 0), cap)
    if payload.progress_pct is not None:
        enr.progress_pct = min(max(payload.progress_pct, 0), 100)

    db.add(enr)
    db.commit()
    db.refresh(enr)
    instr = (
        db.execute(select(User).where(User.id == course.instructor_id)).scalar_one_or_none()
        if course.instructor_id
        else None
    )
    return _my_course_item(course, enr, instr)


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
            career_direction=None,
            extra_notes=None,
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
            career_direction=profile.career_direction,
            extra_notes=profile.extra_notes,
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
