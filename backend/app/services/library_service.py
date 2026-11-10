from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from app.models.course import Course
from app.models.course_status import CourseStatus
from app.models.course_wishlist import CourseWishlist
from app.models.learning_list import LearningList, LearningListItem
from app.models.user import User
from app.schemas.learning import LearningListOut, LibraryCourseOut
from app.services.course_pricing import sale_price_cents

instructor_user = aliased(User)


def _course_out(course: Course, instructor: User | None) -> LibraryCourseOut:
    return LibraryCourseOut(
        slug=course.slug,
        title=course.title,
        image_url=course.image_url,
        instructor_name=instructor.name if instructor else None,
        price_cents=course.price_cents,
        currency=course.currency,
        is_free=course.is_free,
        discount_percent=int(getattr(course, "discount_percent", 0) or 0),
        discount_expires_at=getattr(course, "discount_expires_at", None),
        sale_price_cents=sale_price_cents(course),
    )


def _published_course(db: Session, slug: str) -> Course:
    course = db.scalar(select(Course).where(Course.slug == slug, Course.status == CourseStatus.PUBLISHED))
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


def list_wishlist(db: Session, user_id: UUID) -> list[LibraryCourseOut]:
    rows = db.execute(
        select(Course, instructor_user)
        .join(CourseWishlist, CourseWishlist.course_id == Course.id)
        .outerjoin(instructor_user, instructor_user.id == Course.instructor_id)
        .where(CourseWishlist.user_id == user_id, Course.status == CourseStatus.PUBLISHED)
        .order_by(CourseWishlist.created_at.desc())
    ).all()
    return [_course_out(course, instructor) for course, instructor in rows]


def add_wishlist(db: Session, user_id: UUID, course_slug: str) -> list[LibraryCourseOut]:
    course = _published_course(db, course_slug)
    row = db.scalar(
        select(CourseWishlist).where(CourseWishlist.user_id == user_id, CourseWishlist.course_id == course.id)
    )
    if not row:
        db.add(CourseWishlist(user_id=user_id, course_id=course.id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    else:
        db.commit()
    return list_wishlist(db, user_id)


def remove_wishlist(db: Session, user_id: UUID, course_slug: str) -> list[LibraryCourseOut]:
    course = db.scalar(select(Course).where(Course.slug == course_slug))
    if course:
        row = db.scalar(
            select(CourseWishlist).where(CourseWishlist.user_id == user_id, CourseWishlist.course_id == course.id)
        )
        if row:
            db.delete(row)
            db.commit()
    return list_wishlist(db, user_id)


def _list_or_404(db: Session, user_id: UUID, list_id: UUID) -> LearningList:
    row = db.scalar(select(LearningList).where(LearningList.id == list_id, LearningList.user_id == user_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    return row


def _serialize_list(db: Session, row: LearningList) -> LearningListOut:
    items = db.execute(
        select(Course, instructor_user)
        .join(LearningListItem, LearningListItem.course_id == Course.id)
        .outerjoin(instructor_user, instructor_user.id == Course.instructor_id)
        .where(LearningListItem.list_id == row.id, Course.status == CourseStatus.PUBLISHED)
        .order_by(LearningListItem.created_at.desc())
    ).all()
    return LearningListOut(
        id=row.id,
        title=row.title,
        courses=[_course_out(course, instructor) for course, instructor in items],
    )


def list_lists(db: Session, user_id: UUID) -> list[LearningListOut]:
    rows = list(
        db.scalars(select(LearningList).where(LearningList.user_id == user_id).order_by(LearningList.created_at.desc())).all()
    )
    return [_serialize_list(db, row) for row in rows]


def create_list(db: Session, user_id: UUID, title: str) -> LearningListOut:
    cleaned = title.strip()
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Title is required")
    row = LearningList(user_id=user_id, title=cleaned)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_list(db, row)


def rename_list(db: Session, user_id: UUID, list_id: UUID, title: str) -> LearningListOut:
    row = _list_or_404(db, user_id, list_id)
    cleaned = title.strip()
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Title is required")
    row.title = cleaned
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_list(db, row)


def delete_list(db: Session, user_id: UUID, list_id: UUID) -> None:
    row = _list_or_404(db, user_id, list_id)
    db.delete(row)
    db.commit()


def add_list_course(db: Session, user_id: UUID, list_id: UUID, course_slug: str) -> LearningListOut:
    row = _list_or_404(db, user_id, list_id)
    course = _published_course(db, course_slug)
    existing = db.scalar(
        select(LearningListItem).where(LearningListItem.list_id == row.id, LearningListItem.course_id == course.id)
    )
    if not existing:
        db.add(LearningListItem(list_id=row.id, course_id=course.id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    return _serialize_list(db, row)


def remove_list_course(db: Session, user_id: UUID, list_id: UUID, course_slug: str) -> LearningListOut:
    row = _list_or_404(db, user_id, list_id)
    course = db.scalar(select(Course).where(Course.slug == course_slug))
    if course:
        item = db.scalar(
            select(LearningListItem).where(LearningListItem.list_id == row.id, LearningListItem.course_id == course.id)
        )
        if item:
            db.delete(item)
            db.commit()
    return _serialize_list(db, row)
