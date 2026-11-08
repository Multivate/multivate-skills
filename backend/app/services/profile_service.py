from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import PublicStudentProfile


def get_public_profile(db: Session, slug: str) -> PublicStudentProfile:
    needle = slug.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.public_slug) == needle))
    if not user or not user.profile_public or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return PublicStudentProfile(
        slug=user.public_slug or slug,
        name=(user.name or "").strip() or "Member",
        headline=user.public_headline or "",
        bio=user.public_bio or "",
        avatar_url=user.avatar_url,
        created_at=user.created_at,
    )
