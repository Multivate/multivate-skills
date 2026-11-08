from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user import PublicStudentProfile
from app.services import profile_service

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/{slug}", response_model=PublicStudentProfile)
def read_public_profile(slug: str, db: Annotated[Session, Depends(get_db)]) -> PublicStudentProfile:
    return profile_service.get_public_profile(db, slug)
