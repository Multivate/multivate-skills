from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.role import UserRole
from app.models.user import User
from app.schemas.analytics import InstructorDashboardOut, InstructorStudentRow
from app.services import analytics_service

router = APIRouter(prefix="/instructor", tags=["instructor"])


@router.get("/dashboard", response_model=InstructorDashboardOut)
def read_instructor_dashboard(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR))],
) -> InstructorDashboardOut:
    return analytics_service.instructor_dashboard(db, user.id)


@router.get("/students", response_model=list[InstructorStudentRow])
def list_instructor_students(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR))],
    limit: int = Query(200, ge=1, le=500),
) -> list[InstructorStudentRow]:
    return analytics_service.instructor_students(db, user.id, limit=limit)
