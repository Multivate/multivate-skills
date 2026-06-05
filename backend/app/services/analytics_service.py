from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.payment import Payment, PaymentStatus
from app.models.user import User
from app.schemas.analytics import (
    AdminDashboardOut,
    AdminTotals,
    InstructorCourseRow,
    InstructorDashboardOut,
    InstructorStudentRow,
    InstructorTotals,
    PaymentAdminRow,
    RecentEnrollmentRow,
    RecentPaymentRow,
    TopCourseRow,
)
from app.schemas.user import user_public_from_orm


def _recent_enrollment_rows(db: Session, limit: int) -> list[RecentEnrollmentRow]:
    instructor_user = aliased(User)
    enr_rows = db.execute(
        select(
            User.name,
            User.email,
            Course.title,
            Course.slug,
            Enrollment.created_at,
            instructor_user.name,
            instructor_user.email,
        )
        .join(Enrollment, Enrollment.user_id == User.id)
        .join(Course, Course.id == Enrollment.course_id)
        .outerjoin(instructor_user, instructor_user.id == Course.instructor_id)
        .order_by(Enrollment.created_at.desc())
        .limit(limit)
    ).all()
    return [
        RecentEnrollmentRow(
            user_name=r[0],
            user_email=str(r[1]),
            course_title=r[2],
            course_slug=r[3],
            created_at=r[4],
            instructor_name=r[5],
            instructor_email=str(r[6]) if r[6] is not None else None,
        )
        for r in enr_rows
    ]


def admin_enrollments_list(db: Session, limit: int = 200) -> list[RecentEnrollmentRow]:
    return _recent_enrollment_rows(db, min(limit, 500))


def admin_dashboard(db: Session) -> AdminDashboardOut:
    total_users = int(db.scalar(select(func.count()).select_from(User)) or 0)
    total_courses = int(db.scalar(select(func.count()).select_from(Course)) or 0)
    total_enrollments = int(db.scalar(select(func.count()).select_from(Enrollment)) or 0)
    revenue_completed_cents = int(
        db.scalar(
            select(func.coalesce(func.sum(Payment.amount_cents), 0)).where(
                Payment.status.in_([PaymentStatus.COMPLETED, PaymentStatus.PAID])
            )
        )
        or 0
    )
    payments_pending_count = int(
        db.scalar(select(func.count()).select_from(Payment).where(Payment.status == PaymentStatus.PENDING)) or 0
    )

    top_rows = db.execute(
        select(Course.slug, Course.title, Course.image_url, func.count(Enrollment.id).label("cnt"))
        .outerjoin(Enrollment, Enrollment.course_id == Course.id)
        .group_by(Course.id)
        .order_by(func.count(Enrollment.id).desc())
        .limit(8)
    ).all()
    top_courses = [
        TopCourseRow(slug=r[0], title=r[1], image_url=r[2], enrollment_count=int(r[3] or 0)) for r in top_rows
    ]

    recent_user_models = list(
        db.scalars(select(User).order_by(User.created_at.desc()).limit(8)).unique().all()
    )
    recent_users = [user_public_from_orm(u) for u in recent_user_models]

    recent_enrollments = _recent_enrollment_rows(db, 12)

    pay_rows = db.execute(
        select(Payment, User.email, Course.slug, Course.title)
        .join(User, User.id == Payment.user_id)
        .outerjoin(Course, Course.id == Payment.course_id)
        .order_by(Payment.created_at.desc())
        .limit(12)
    ).all()
    recent_payments: list[RecentPaymentRow] = []
    for p, email, cslug, ctitle in pay_rows:
        recent_payments.append(
            RecentPaymentRow(
                id=p.id,
                amount_cents=p.amount_cents,
                currency=p.currency,
                status=p.status,
                created_at=p.created_at,
                user_email=str(email),
                course_slug=cslug,
                course_title=ctitle,
            )
        )

    return AdminDashboardOut(
        totals=AdminTotals(
            total_users=total_users,
            total_courses=total_courses,
            total_enrollments=total_enrollments,
            revenue_completed_cents=revenue_completed_cents,
            payments_pending_count=payments_pending_count,
        ),
        top_courses=top_courses,
        recent_users=recent_users,
        recent_enrollments=recent_enrollments,
        recent_payments=recent_payments,
    )


def instructor_dashboard(db: Session, instructor_id: UUID) -> InstructorDashboardOut:
    course_rows = db.execute(
        select(Course, func.count(Enrollment.id))
        .outerjoin(Enrollment, Enrollment.course_id == Course.id)
        .where(Course.instructor_id == instructor_id)
        .group_by(Course.id)
        .order_by(Course.title.asc())
    ).all()

    courses: list[InstructorCourseRow] = []
    total_enrollments = 0
    for course, cnt in course_rows:
        n = int(cnt or 0)
        total_enrollments += n
        courses.append(
            InstructorCourseRow(
                slug=course.slug,
                title=course.title,
                image_url=course.image_url,
                lessons_count=course.lessons_count,
                enrollment_count=n,
            )
        )

    unique_learners = int(
        db.scalar(
            select(func.count(func.distinct(Enrollment.user_id)))
            .select_from(Enrollment)
            .join(Course, Course.id == Enrollment.course_id)
            .where(Course.instructor_id == instructor_id)
        )
        or 0
    )

    course_id_sq = select(Course.id).where(Course.instructor_id == instructor_id)
    revenue_completed_cents = int(
        db.scalar(
            select(func.coalesce(func.sum(Payment.amount_cents), 0)).where(
                Payment.status.in_([PaymentStatus.COMPLETED, PaymentStatus.PAID]),
                Payment.course_id.in_(course_id_sq),
            )
        )
        or 0
    )

    return InstructorDashboardOut(
        totals=InstructorTotals(
            total_courses=len(courses),
            total_enrollments=total_enrollments,
            unique_learners=unique_learners,
            revenue_completed_cents=revenue_completed_cents,
        ),
        courses=courses,
    )


def instructor_students(db: Session, instructor_id: UUID, limit: int = 200) -> list[InstructorStudentRow]:
    rows = db.execute(
        select(
            User.id,
            User.name,
            User.email,
            Course.slug,
            Course.title,
            Enrollment.created_at,
            Enrollment.lesson_done,
            Enrollment.progress_pct,
        )
        .join(Enrollment, Enrollment.user_id == User.id)
        .join(Course, Course.id == Enrollment.course_id)
        .where(Course.instructor_id == instructor_id)
        .order_by(Enrollment.created_at.desc())
        .limit(min(limit, 500))
    ).all()
    return [
        InstructorStudentRow(
            user_id=r[0],
            user_name=r[1],
            user_email=str(r[2]),
            course_slug=r[3],
            course_title=r[4],
            enrolled_at=r[5],
            lesson_done=int(r[6] or 0),
            progress_pct=int(r[7] or 0),
        )
        for r in rows
    ]


def admin_payments_page(db: Session, skip: int, limit: int) -> list[PaymentAdminRow]:
    lim = min(max(limit, 1), 100)
    sk = max(skip, 0)
    rows = db.execute(
        select(Payment, User.email, Course.slug, Course.title)
        .join(User, User.id == Payment.user_id)
        .outerjoin(Course, Course.id == Payment.course_id)
        .order_by(Payment.created_at.desc())
        .offset(sk)
        .limit(lim)
    ).all()
    out: list[PaymentAdminRow] = []
    for p, email, cslug, ctitle in rows:
        out.append(
            PaymentAdminRow(
                id=p.id,
                amount_cents=p.amount_cents,
                currency=p.currency,
                status=p.status,
                created_at=p.created_at,
                user_email=str(email),
                course_slug=cslug,
                course_title=ctitle,
            )
        )
    return out
