from __future__ import annotations

import logging
import re
import secrets
import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.mentor_conversation import MentorConversation
from app.models.mentor_message import MentorMessage
from app.models.mentor_profile import MentorApprovalStatus, MentorProfile
from app.models.role import UserRole
from app.models.user import User
from app.schemas.mentor import (
    MentorAdminFeatureIn,
    MentorConversationOut,
    MentorConversationStartIn,
    MentorConversationStartOut,
    MentorMessageOut,
    MentorProfileAdminRow,
    MentorProfilePublic,
    MentorProfileSelfOut,
    MentorProfileSelfUpdateIn,
)
from app.services.media_storage_service import save_mentor_photo
from app.core.config import get_settings
from app.services.mail_service import send_plain_email

logger = logging.getLogger(__name__)

_APPROVED = MentorApprovalStatus.APPROVED.value


def _slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return base[:80] or "mentor"


def _unique_slug(db: Session, name: str, exclude_id: UUID | None = None) -> str:
    base = _slugify(name)
    candidate = base
    n = 0
    while True:
        stmt = select(MentorProfile.id).where(MentorProfile.slug == candidate)
        if exclude_id:
            stmt = stmt.where(MentorProfile.id != exclude_id)
        if db.scalar(stmt) is None:
            return candidate
        n += 1
        candidate = f"{base}-{n}"


def _public_from_orm(
    row: MentorProfile,
    *,
    people_helped_count: int = 0,
    active_conversations_count: int = 0,
) -> MentorProfilePublic:
    return MentorProfilePublic(
        id=row.id,
        slug=row.slug,
        full_name=row.full_name,
        headline=row.headline,
        bio=row.bio,
        photo_url=row.photo_url,
        city=row.city,
        origin_country=row.origin_country,
        years_in_germany=row.years_in_germany,
        german_level=row.german_level,
        field_of_work=row.field_of_work,
        expertise_areas=row.expertise_areas,
        languages_spoken=row.languages_spoken,
        career_tips=row.career_tips,
        is_featured=row.is_featured,
        people_helped_count=people_helped_count,
        active_conversations_count=active_conversations_count,
    )


def _conversation_counts_for_mentors(
    db: Session, mentor_ids: list[UUID]
) -> tuple[dict[UUID, int], dict[UUID, int]]:
    helped = {mid: 0 for mid in mentor_ids}
    active = {mid: 0 for mid in mentor_ids}
    if not mentor_ids:
        return helped, active

    helped_rows = db.execute(
        select(MentorConversation.mentor_id, func.count(func.distinct(MentorConversation.id)))
        .join(MentorMessage, MentorMessage.conversation_id == MentorConversation.id)
        .where(MentorConversation.mentor_id.in_(mentor_ids))
        .where(MentorMessage.sender_kind == "mentor")
        .group_by(MentorConversation.mentor_id)
    ).all()
    for mentor_id, count in helped_rows:
        helped[mentor_id] = int(count)

    active_rows = db.execute(
        select(MentorConversation.mentor_id, func.count(MentorConversation.id))
        .where(MentorConversation.mentor_id.in_(mentor_ids))
        .where(MentorConversation.status == "open")
        .group_by(MentorConversation.mentor_id)
    ).all()
    for mentor_id, count in active_rows:
        active[mentor_id] = int(count)

    logger.info(
        "Mentor conversation counts loaded mentors=%s helped_total=%s active_total=%s",
        len(mentor_ids),
        sum(helped.values()),
        sum(active.values()),
    )
    return helped, active


def _self_from_orm(row: MentorProfile) -> MentorProfileSelfOut:
    return MentorProfileSelfOut(
        **_public_from_orm(row).model_dump(),
        approval_status=row.approval_status.value if hasattr(row.approval_status, "value") else str(row.approval_status),
        rejection_reason=row.rejection_reason,
        submitted_at=row.submitted_at,
        approved_at=row.approved_at,
        updated_at=row.updated_at,
    )


def _admin_row(db: Session, row: MentorProfile) -> MentorProfileAdminRow:
    user = db.get(User, row.user_id)
    return MentorProfileAdminRow(
        **_public_from_orm(row).model_dump(),
        approval_status=row.approval_status.value if hasattr(row.approval_status, "value") else str(row.approval_status),
        rejection_reason=row.rejection_reason,
        submitted_at=row.submitted_at,
        approved_at=row.approved_at,
        sort_order=row.sort_order,
        user_id=row.user_id,
        linked_user_email=user.email if user else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _is_approved(row: MentorProfile) -> bool:
    status_val = row.approval_status.value if hasattr(row.approval_status, "value") else str(row.approval_status)
    return status_val == _APPROVED


def create_draft_profile_for_user(db: Session, user: User) -> MentorProfile:
    existing = db.scalar(select(MentorProfile).where(MentorProfile.user_id == user.id))
    if existing:
        return existing
    row = MentorProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        slug=_unique_slug(db, user.name),
        full_name=user.name.strip(),
        approval_status=MentorApprovalStatus.DRAFT,
        is_featured=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    logger.info("Created draft mentor profile user_id=%s profile_id=%s", user.id, row.id)
    return row


def list_public_mentors(db: Session, *, featured_only: bool = False, limit: int = 50) -> list[MentorProfilePublic]:
    stmt = select(MentorProfile).where(MentorProfile.approval_status == MentorApprovalStatus.APPROVED)
    if featured_only:
        stmt = stmt.where(MentorProfile.is_featured.is_(True))
    stmt = stmt.order_by(
        MentorProfile.is_featured.desc(),
        MentorProfile.sort_order.asc(),
        MentorProfile.full_name.asc(),
    ).limit(limit)
    rows = list(db.scalars(stmt).all())
    mentor_ids = [r.id for r in rows]
    helped, active = _conversation_counts_for_mentors(db, mentor_ids)
    return [
        _public_from_orm(
            r,
            people_helped_count=helped.get(r.id, 0),
            active_conversations_count=active.get(r.id, 0),
        )
        for r in rows
    ]


def get_public_mentor_by_slug(db: Session, slug: str) -> MentorProfilePublic:
    row = db.scalar(
        select(MentorProfile).where(
            MentorProfile.slug == slug,
            MentorProfile.approval_status == MentorApprovalStatus.APPROVED,
        )
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor not found.")
    helped, active = _conversation_counts_for_mentors(db, [row.id])
    return _public_from_orm(
        row,
        people_helped_count=helped.get(row.id, 0),
        active_conversations_count=active.get(row.id, 0),
    )


def get_mentor_row_by_slug(db: Session, slug: str) -> MentorProfile:
    row = db.scalar(
        select(MentorProfile).where(
            MentorProfile.slug == slug,
            MentorProfile.approval_status == MentorApprovalStatus.APPROVED,
        )
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor not found.")
    return row


def list_admin_mentors(db: Session, limit: int = 200) -> list[MentorProfileAdminRow]:
    rows = list(
        db.scalars(
            select(MentorProfile).order_by(
                MentorProfile.approval_status.asc(),
                MentorProfile.submitted_at.desc().nullslast(),
                MentorProfile.updated_at.desc(),
            ).limit(limit)
        ).all()
    )
    return [_admin_row(db, r) for r in rows]


def get_mentor_for_user(db: Session, user: User) -> MentorProfile | None:
    return db.scalar(select(MentorProfile).where(MentorProfile.user_id == user.id))


def get_or_create_self_profile(db: Session, user: User) -> MentorProfileSelfOut:
    row = get_mentor_for_user(db, user) or create_draft_profile_for_user(db, user)
    return _self_from_orm(row)


def update_self_profile(db: Session, user: User, body: MentorProfileSelfUpdateIn) -> MentorProfileSelfOut:
    row = get_mentor_for_user(db, user) or create_draft_profile_for_user(db, user)
    if row.slug != _slugify(body.full_name):
        row.slug = _unique_slug(db, body.full_name, exclude_id=row.id)
    row.full_name = body.full_name.strip()
    row.headline = body.headline.strip()
    row.bio = body.bio.strip()
    row.city = body.city.strip()
    row.origin_country = (body.origin_country or "").strip() or None
    row.years_in_germany = body.years_in_germany
    row.german_level = (body.german_level or "").strip() or None
    row.field_of_work = (body.field_of_work or "").strip() or None
    row.expertise_areas = body.expertise_areas.strip()
    row.languages_spoken = body.languages_spoken.strip()
    row.career_tips = (body.career_tips or "").strip() or None
    if _is_approved(row):
        row.approval_status = MentorApprovalStatus.PENDING
        row.approved_at = None
    row.rejection_reason = None
    db.commit()
    db.refresh(row)
    logger.info("Mentor saved profile draft user_id=%s status=%s", user.id, row.approval_status)
    return _self_from_orm(row)


def _validate_submission(row: MentorProfile) -> None:
    missing: list[str] = []
    if not row.photo_url:
        missing.append("profile photo")
    if not row.headline.strip():
        missing.append("professional headline")
    if len(row.bio.strip()) < 80:
        missing.append("biography (at least 80 characters)")
    if not row.city.strip():
        missing.append("city in Germany")
    if row.years_in_germany is None:
        missing.append("years in Germany")
    if not row.expertise_areas.strip():
        missing.append("areas of expertise")
    if not row.languages_spoken.strip():
        missing.append("languages spoken")
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Complete these before submitting: {', '.join(missing)}.",
        )


def submit_self_profile(db: Session, user: User) -> MentorProfileSelfOut:
    row = get_mentor_for_user(db, user)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Create your profile first.")
    _validate_submission(row)
    now = datetime.now(timezone.utc)
    row.approval_status = MentorApprovalStatus.PENDING
    row.submitted_at = now
    row.rejection_reason = None
    db.commit()
    db.refresh(row)
    logger.info("Mentor submitted profile for review user_id=%s profile_id=%s", user.id, row.id)
    return _self_from_orm(row)


async def upload_self_photo(db: Session, user: User, file: UploadFile) -> MentorProfileSelfOut:
    row = get_mentor_for_user(db, user) or create_draft_profile_for_user(db, user)
    stored = await save_mentor_photo(row.id, file)
    row.photo_url = stored.public_path
    if _is_approved(row):
        row.approval_status = MentorApprovalStatus.PENDING
        row.approved_at = None
    db.commit()
    db.refresh(row)
    logger.info("Mentor uploaded photo user_id=%s", user.id)
    return _self_from_orm(row)


def admin_approve(db: Session, mentor_id: UUID) -> MentorProfileAdminRow:
    row = db.get(MentorProfile, mentor_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor profile not found.")
    now = datetime.now(timezone.utc)
    row.approval_status = MentorApprovalStatus.APPROVED
    row.approved_at = now
    row.rejection_reason = None
    db.commit()
    db.refresh(row)
    logger.info("Admin approved mentor profile id=%s", mentor_id)
    return _admin_row(db, row)


def admin_reject(db: Session, mentor_id: UUID, reason: str) -> MentorProfileAdminRow:
    row = db.get(MentorProfile, mentor_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor profile not found.")
    row.approval_status = MentorApprovalStatus.REJECTED
    row.rejection_reason = reason.strip()
    row.approved_at = None
    db.commit()
    db.refresh(row)
    logger.info("Admin rejected mentor profile id=%s", mentor_id)
    return _admin_row(db, row)


def admin_set_featured(db: Session, mentor_id: UUID, body: MentorAdminFeatureIn) -> MentorProfileAdminRow:
    row = db.get(MentorProfile, mentor_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor profile not found.")
    if body.is_featured and not _is_approved(row):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only approved mentors can be featured.")
    row.is_featured = body.is_featured
    if body.sort_order is not None:
        row.sort_order = body.sort_order
    db.commit()
    db.refresh(row)
    return _admin_row(db, row)


def require_mentor_profile(db: Session, user: User) -> MentorProfile:
    profile = get_mentor_for_user(db, user)
    if not profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Complete your mentor profile first.")
    return profile


def start_conversation(
    db: Session,
    mentor: MentorProfile,
    body: MentorConversationStartIn,
    *,
    visitor_user: User | None = None,
) -> MentorConversationStartOut:
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    conv = MentorConversation(
        id=uuid.uuid4(),
        mentor_id=mentor.id,
        visitor_name=body.visitor_name.strip(),
        visitor_email=(body.visitor_email or "").strip().lower() or None,
        guest_token=token,
        visitor_user_id=visitor_user.id if visitor_user else None,
        status="open",
        last_message_at=now,
    )
    db.add(conv)
    db.flush()
    msg = MentorMessage(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        sender_kind="guest" if not visitor_user else "user",
        sender_user_id=visitor_user.id if visitor_user else None,
        body=body.message.strip(),
    )
    db.add(msg)
    db.commit()
    logger.info("Started mentor conversation mentor_id=%s conversation_id=%s", mentor.id, conv.id)
    return MentorConversationStartOut(
        conversation_id=conv.id,
        guest_token=token,
        mentor_name=mentor.full_name,
    )


def _conversation_out(db: Session, conv: MentorConversation, *, include_token: bool = False) -> MentorConversationOut:
    mentor = db.get(MentorProfile, conv.mentor_id)
    last_msg = db.scalar(
        select(MentorMessage)
        .where(MentorMessage.conversation_id == conv.id)
        .order_by(MentorMessage.created_at.desc())
        .limit(1)
    )
    unread = db.scalar(
        select(func.count())
        .select_from(MentorMessage)
        .where(
            MentorMessage.conversation_id == conv.id,
            MentorMessage.sender_kind.in_(("guest", "user")),
            MentorMessage.read_at.is_(None),
        )
    )
    return MentorConversationOut(
        id=conv.id,
        mentor_id=conv.mentor_id,
        mentor_slug=mentor.slug if mentor else "",
        mentor_name=mentor.full_name if mentor else "",
        visitor_name=conv.visitor_name,
        visitor_email=conv.visitor_email,
        status=conv.status,
        guest_token=conv.guest_token if include_token else None,
        last_message_at=conv.last_message_at,
        created_at=conv.created_at,
        unread_count=int(unread or 0),
        last_message_preview=(last_msg.body[:120] if last_msg else None),
    )


def _authorize_guest(conv: MentorConversation, guest_token: str | None) -> None:
    if not guest_token or guest_token != conv.guest_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid conversation access.")


def list_conversation_messages(
    db: Session,
    conversation_id: UUID,
    *,
    guest_token: str | None = None,
    user: User | None = None,
) -> list[MentorMessageOut]:
    conv = db.get(MentorConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    if user:
        profile = get_mentor_for_user(db, user)
        if not profile or profile.id != conv.mentor_id:
            if user.role != UserRole.ADMIN:
                if conv.visitor_user_id != user.id:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    else:
        _authorize_guest(conv, guest_token)
    rows = list(
        db.scalars(
            select(MentorMessage)
            .where(MentorMessage.conversation_id == conversation_id)
            .order_by(MentorMessage.created_at.asc())
        ).all()
    )
    if user:
        profile = get_mentor_for_user(db, user)
        if profile and profile.id == conv.mentor_id:
            now = datetime.now(timezone.utc)
            for row in rows:
                if row.sender_kind in ("guest", "user") and row.read_at is None:
                    row.read_at = now
            db.commit()
    return [MentorMessageOut.model_validate(r) for r in rows]


def _notify_guest_of_mentor_reply(db: Session, conv: MentorConversation, reply_body: str) -> None:
    email = (conv.visitor_email or "").strip().lower()
    if not email:
        return
    mentor = db.get(MentorProfile, conv.mentor_id)
    if not mentor:
        return
    settings = get_settings()
    mentor_url = f"{settings.frontend_url.rstrip('/')}/en/mentors/{mentor.slug}"
    preview = reply_body[:240] + ("…" if len(reply_body) > 240 else "")
    subject = f"{mentor.full_name} replied on Multivate"
    body = (
        f"Hi {conv.visitor_name},\n\n"
        f"{mentor.full_name} replied to your message:\n\n"
        f"{preview}\n\n"
        f"Open your chat to read the full reply and continue the conversation:\n"
        f"{mentor_url}\n\n"
        f"Tap Message on {mentor.full_name}'s profile to pick up where you left off."
    )
    try:
        send_plain_email(email, subject, body)
        logger.info("Mentor reply email sent conversation_id=%s to=%s", conv.id, email)
    except Exception:
        logger.exception("Mentor reply email failed conversation_id=%s to=%s", conv.id, email)


def post_message(
    db: Session,
    conversation_id: UUID,
    body: str,
    *,
    guest_token: str | None = None,
    user: User | None = None,
) -> MentorMessageOut:
    conv = db.get(MentorConversation, conversation_id)
    if not conv or conv.status != "open":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    sender_kind = "guest"
    sender_user_id = None
    if user:
        profile = get_mentor_for_user(db, user)
        if profile and profile.id == conv.mentor_id:
            sender_kind = "mentor"
            sender_user_id = user.id
        elif conv.visitor_user_id == user.id:
            sender_kind = "user"
            sender_user_id = user.id
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    else:
        _authorize_guest(conv, guest_token)
    now = datetime.now(timezone.utc)
    msg = MentorMessage(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        sender_kind=sender_kind,
        sender_user_id=sender_user_id,
        body=body.strip(),
    )
    conv.last_message_at = now
    db.add(msg)
    db.commit()
    db.refresh(msg)
    if sender_kind == "mentor" and conv.visitor_email:
        _notify_guest_of_mentor_reply(db, conv, msg.body.strip())
    return MentorMessageOut.model_validate(msg)


def list_mentor_inbox(db: Session, user: User) -> list[MentorConversationOut]:
    profile = require_mentor_profile(db, user)
    rows = list(
        db.scalars(
            select(MentorConversation)
            .where(MentorConversation.mentor_id == profile.id)
            .order_by(MentorConversation.last_message_at.desc())
            .limit(200)
        ).all()
    )
    return [_conversation_out(db, c) for c in rows]
