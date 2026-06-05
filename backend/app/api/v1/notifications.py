from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationOut, NotificationUnreadOut
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/me", response_model=list[NotificationOut])
def list_my_notifications(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[NotificationOut]:
    return notification_service.list_notifications(db, user.id)


@router.get("/me/unread-count", response_model=NotificationUnreadOut)
def unread_notification_count(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> NotificationUnreadOut:
    return NotificationUnreadOut(unread_count=notification_service.unread_count(db, user.id))


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> NotificationOut:
    return notification_service.mark_read(db, user.id, notification_id)


@router.post("/read-all")
def mark_all_notifications_read(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, int]:
    count = notification_service.mark_all_read(db, user.id)
    return {"marked": count}
