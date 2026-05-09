from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.instructor_teaching_profile import InstructorTeachingProfile
from app.models.user import User
from app.schemas.instructor_profile import (
    InstructorTeachingProfileAdminRow,
    InstructorTeachingProfileOut,
    InstructorTeachingProfileUpsert,
)


def get_instructor_profile(db: Session, user_id: UUID) -> InstructorTeachingProfile | None:
    return db.execute(
        select(InstructorTeachingProfile).where(InstructorTeachingProfile.user_id == user_id)
    ).scalar_one_or_none()


def serialize_instructor_profile(user_id: UUID, row: InstructorTeachingProfile | None) -> InstructorTeachingProfileOut:
    if row is None:
        return InstructorTeachingProfileOut(
            user_id=user_id,
            expertise_areas="",
            teaching_bio="",
            subjects_taught="",
            years_experience=None,
            teaching_formats=None,
            credentials_notes=None,
            professional_links=None,
            updated_at=None,
        )
    return InstructorTeachingProfileOut.model_validate(row)


def upsert_instructor_profile(
    db: Session, user_id: UUID, payload: InstructorTeachingProfileUpsert
) -> InstructorTeachingProfileOut:
    data = payload.model_dump()
    row = get_instructor_profile(db, user_id)
    if row is None:
        row = InstructorTeachingProfile(
            user_id=user_id,
            expertise_areas=data.get("expertise_areas") or "",
            teaching_bio=data.get("teaching_bio") or "",
            subjects_taught=data.get("subjects_taught") or "",
            years_experience=data.get("years_experience"),
            teaching_formats=data.get("teaching_formats"),
            credentials_notes=data.get("credentials_notes"),
            professional_links=data.get("professional_links"),
        )
        db.add(row)
    else:
        for key, val in data.items():
            setattr(row, key, val)
    db.commit()
    db.refresh(row)
    return InstructorTeachingProfileOut.model_validate(row)


def list_instructor_profiles_for_admin(db: Session, limit: int = 200) -> list[InstructorTeachingProfileAdminRow]:
    stmt = (
        select(InstructorTeachingProfile, User.name, User.email)
        .join(User, User.id == InstructorTeachingProfile.user_id)
        .order_by(InstructorTeachingProfile.updated_at.desc())
        .limit(min(max(limit, 1), 500))
    )
    rows = db.execute(stmt).all()
    return [
        InstructorTeachingProfileAdminRow(
            user_id=profile.user_id,
            user_name=name,
            user_email=email,
            expertise_areas=profile.expertise_areas,
            teaching_bio=profile.teaching_bio,
            subjects_taught=profile.subjects_taught,
            years_experience=profile.years_experience,
            teaching_formats=profile.teaching_formats,
            credentials_notes=profile.credentials_notes,
            professional_links=profile.professional_links,
            updated_at=profile.updated_at,
        )
        for profile, name, email in rows
    ]
