from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.certificate import Certificate
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.schemas.certificate import CertificateOut


def _code() -> str:
    return f"MV-{uuid4().hex[:14].upper()}"


def list_my_certificates(db: Session, user_id: UUID) -> list[CertificateOut]:
    stmt = (
        select(Certificate, Course)
        .join(Course, Course.id == Certificate.course_id)
        .where(Certificate.user_id == user_id)
        .order_by(Certificate.issued_at.desc())
    )
    rows = db.execute(stmt).all()
    return [
        CertificateOut(
            id=cert.id,
            course_slug=course.slug,
            course_title=course.title,
            code=cert.code,
            issued_at=cert.issued_at,
        )
        for cert, course in rows
    ]


def issue_for_course(db: Session, user_id: UUID, course_slug: str) -> CertificateOut:
    course = db.execute(select(Course).where(Course.slug == course_slug)).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    enr = db.execute(
        select(Enrollment).where(Enrollment.user_id == user_id, Enrollment.course_id == course.id)
    ).scalar_one_or_none()
    if not enr:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled in this course")
    if enr.progress_pct < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete the course (100% progress) before claiming your certificate.",
        )
    existing = db.execute(
        select(Certificate).where(Certificate.user_id == user_id, Certificate.course_id == course.id)
    ).scalar_one_or_none()
    if existing:
        return CertificateOut(
            id=existing.id,
            course_slug=course.slug,
            course_title=course.title,
            code=existing.code,
            issued_at=existing.issued_at,
        )
    cert = Certificate(user_id=user_id, course_id=course.id, code=_code())
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return CertificateOut(
        id=cert.id,
        course_slug=course.slug,
        course_title=course.title,
        code=cert.code,
        issued_at=cert.issued_at,
    )
