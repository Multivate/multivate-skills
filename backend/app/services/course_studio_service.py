from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.audio_phrase import AudioPhrase
from app.models.course import Course
from app.models.course_audit_log import CourseAuditLog
from app.models.course_review import CourseReview
from app.models.course_section import CourseSection
from app.models.course_status import AudioSource, CourseFormat, CourseLevel, CourseStatus, LessonType, VideoSource
from app.models.enrollment import Enrollment
from app.models.enrollment_status import EnrollmentStatus
from app.models.lesson import Lesson
from app.models.lesson_resource import LessonResource
from app.models.payment import Payment, PaymentStatus
from app.models.role import UserRole
from app.models.user import User
from app.models.video_watch_history import VideoWatchHistory
from app.schemas.studio import (
    AudioPhraseIn,
    AudioPhraseOut,
    AudioPhraseReorderIn,
    AudioPhraseUpdateIn,
    CourseStudioAnalyticsOut,
    CourseStudioBasicsIn,
    CourseStudioBasicsOut,
    CourseStudioDetailOut,
    LessonReorderIn,
    LessonResourceOut,
    LessonStudioIn,
    LessonStudioOut,
    ReorderSectionsIn,
    SectionCreateIn,
    SectionOut,
    SectionUpdateIn,
    StudioCourseListItem,
    StudioLessonUpdateIn,
)
from app.core.cache_service import invalidate_catalog_cache
from app.services import course_service, media_service

logger = logging.getLogger(__name__)
_settings = get_settings()

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _slugify(title: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return base[:96] or "course"


def _unique_slug(db: Session, base: str) -> str:
    candidate = base
    n = 2
    while course_service.get_course_by_slug(db, candidate):
        candidate = f"{base}-{n}"
        n += 1
    return candidate


def _basics_out(course: Course) -> CourseStudioBasicsOut:
    return CourseStudioBasicsOut(
        id=course.id,
        slug=course.slug,
        title=course.title,
        subtitle=course.subtitle,
        description=course.description,
        learning_objectives=course.learning_objectives,
        category=course.category,
        format=getattr(course, "format", CourseFormat.VIDEO).value
        if hasattr(getattr(course, "format", CourseFormat.VIDEO), "value")
        else str(getattr(course, "format", "video")),
        source_language=getattr(course, "source_language", "en") or "en",
        target_language=getattr(course, "target_language", "de") or "de",
        level=course.level.value,
        language=course.language,
        duration_minutes=course.duration_minutes,
        tags=course.tags,
        price_cents=course.price_cents,
        currency=course.currency,
        is_free=course.is_free,
        promo_video_url=course.promo_video_url,
        instructor_id=course.instructor_id,
        status=course.status.value,
        image_url=course.image_url,
        lessons_count=course.lessons_count,
        rejection_reason=course.rejection_reason,
    )


def _course_format(course: Course) -> CourseFormat:
    fmt = getattr(course, "format", None)
    if isinstance(fmt, CourseFormat):
        return fmt
    if fmt == "audio":
        return CourseFormat.AUDIO
    return CourseFormat.VIDEO


def _phrase_out(p: AudioPhrase) -> AudioPhraseOut:
    return AudioPhraseOut(
        id=p.id,
        section_id=p.section_id,
        position=p.position,
        source_text=p.source_text,
        target_text=p.target_text,
        audio_source=p.audio_source.value if p.audio_source else None,
        audio_url=p.audio_url,
        audio_duration_seconds=p.audio_duration_seconds,
    )


def _audit(db: Session, course_id: UUID, actor_id: UUID, action: str, detail: str | None = None) -> None:
    db.add(CourseAuditLog(course_id=course_id, actor_user_id=actor_id, action=action, detail=detail))
    logger.info("Course audit course_id=%s action=%s actor=%s detail=%s", course_id, action, actor_id, detail)


def _sync_lessons_count(db: Session, course_id: UUID) -> None:
    c = db.get(Course, course_id)
    if not c:
        return
    if _course_format(c) == CourseFormat.AUDIO:
        n = int(
            db.scalar(select(func.count()).select_from(AudioPhrase).where(AudioPhrase.course_id == course_id)) or 0
        )
    else:
        n = int(db.scalar(select(func.count()).select_from(Lesson).where(Lesson.course_id == course_id)) or 0)
    c.lessons_count = n
    db.add(c)


def _sync_duration_minutes(db: Session, course_id: UUID) -> None:
    c = db.get(Course, course_id)
    if not c:
        return
    if _course_format(c) == CourseFormat.AUDIO:
        total_seconds = int(
            db.scalar(
                select(func.coalesce(func.sum(AudioPhrase.audio_duration_seconds), 0)).where(
                    AudioPhrase.course_id == course_id
                )
            )
            or 0
        )
    else:
        total_seconds = int(
            db.scalar(
                select(func.coalesce(func.sum(Lesson.video_duration_seconds), 0)).where(Lesson.course_id == course_id)
            )
            or 0
        )
    c.duration_minutes = max(0, total_seconds // 60)
    db.add(c)


def list_instructor_studio_courses(db: Session, instructor_id: UUID) -> list[StudioCourseListItem]:
    rows = db.scalars(
        select(Course)
        .where(Course.instructor_id == instructor_id)
        .order_by(Course.updated_at.desc(), Course.created_at.desc())
    ).all()
    return [
        StudioCourseListItem(
            id=c.id,
            slug=c.slug,
            title=c.title,
            status=c.status.value,
            format=_course_format(c).value,
            lessons_count=c.lessons_count,
            image_url=c.image_url,
            updated_at=c.updated_at,
        )
        for c in rows
    ]


def create_studio_course(db: Session, payload: CourseStudioBasicsIn, actor: User) -> CourseStudioBasicsOut:
    slug = payload.slug.strip().lower() if payload.slug else _unique_slug(db, _slugify(payload.title))
    if not _SLUG_RE.match(slug):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid slug format")
    if course_service.get_course_by_slug(db, slug):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already in use")

    instructor_id = actor.id if actor.role == UserRole.INSTRUCTOR else payload.instructor_id
    if actor.role == UserRole.ADMIN and instructor_id is None:
        instructor_id = actor.id

    price_cents = payload.price_cents
    is_free = payload.is_free or price_cents <= 0
    course_format = payload.format or CourseFormat.VIDEO
    source_lang = (payload.source_language or "en").strip().lower()[:8]
    target_lang = (payload.target_language or payload.language or "de").strip().lower()[:8]

    course = Course(
        slug=slug,
        title=payload.title.strip(),
        subtitle=payload.subtitle.strip() if payload.subtitle else None,
        description=payload.description.strip(),
        learning_objectives=payload.learning_objectives.strip() if payload.learning_objectives else None,
        image_url="",
        category=payload.category,
        format=course_format,
        source_language=source_lang,
        target_language=target_lang,
        level=payload.level,
        language=payload.language if course_format == CourseFormat.VIDEO else target_lang,
        duration_minutes=payload.duration_minutes,
        tags=payload.tags.strip() if payload.tags else None,
        price_cents=0 if is_free else price_cents,
        currency=payload.currency.upper(),
        is_free=is_free,
        promo_video_url=payload.promo_video_url,
        status=CourseStatus.DRAFT,
        instructor_id=instructor_id,
    )
    db.add(course)
    db.flush()
    _audit(db, course.id, actor.id, "created", f"slug={slug} format={course_format.value}")
    db.commit()
    db.refresh(course)
    logger.info("Studio course created slug=%s id=%s format=%s", slug, course.id, course_format.value)
    return _basics_out(course)


def get_studio_course(db: Session, slug: str, actor: User) -> CourseStudioDetailOut:
    course = course_service.get_course_for_management(db, slug, actor)

    sections = db.scalars(
        select(CourseSection).where(CourseSection.course_id == course.id).order_by(CourseSection.position)
    ).all()
    lessons = db.scalars(
        select(Lesson).where(Lesson.course_id == course.id).order_by(Lesson.position, Lesson.created_at)
    ).all()
    lesson_ids = [l.id for l in lessons]
    resources_by_lesson: dict[UUID, list[LessonResourceOut]] = {lid: [] for lid in lesson_ids}
    if lesson_ids:
        for res in db.scalars(select(LessonResource).where(LessonResource.lesson_id.in_(lesson_ids))).all():
            resources_by_lesson[res.lesson_id].append(
                LessonResourceOut(
                    id=res.id,
                    title=res.title,
                    file_type=res.file_type,
                    file_size_bytes=res.file_size_bytes,
                )
            )

    lessons_out = [
        LessonStudioOut(
            id=l.id,
            section_id=l.section_id,
            position=l.position,
            title=l.title,
            body=l.body,
            lesson_type=l.lesson_type.value,
            video_source=l.video_source.value if l.video_source else None,
            video_url=l.video_url,
            video_duration_seconds=l.video_duration_seconds,
            quiz_json=l.quiz_json,
            live_url=l.live_url,
            is_previewable=l.is_previewable,
            duration_minutes=l.duration_minutes,
            resources=resources_by_lesson.get(l.id, []),
        )
        for l in lessons
    ]

    return CourseStudioDetailOut(
        **_basics_out(course).model_dump(),
        sections=[SectionOut(id=s.id, title=s.title, position=s.position) for s in sections],
        lessons=lessons_out,
        phrases=[
            _phrase_out(p)
            for p in db.scalars(
                select(AudioPhrase)
                .where(AudioPhrase.course_id == course.id)
                .order_by(AudioPhrase.position, AudioPhrase.created_at)
            ).all()
        ],
    )


def update_studio_basics(db: Session, slug: str, payload: CourseStudioBasicsIn, actor: User) -> CourseStudioBasicsOut:
    course = course_service.get_course_for_management(db, slug, actor)
    course_service.assert_can_manage_course(actor, course)

    course.title = payload.title.strip()
    course.subtitle = payload.subtitle.strip() if payload.subtitle else None
    course.description = payload.description.strip()
    course.learning_objectives = payload.learning_objectives.strip() if payload.learning_objectives else None
    course.category = payload.category
    # Format is locked after create if content exists; otherwise allow switch.
    existing_lessons = int(
        db.scalar(select(func.count()).select_from(Lesson).where(Lesson.course_id == course.id)) or 0
    )
    existing_phrases = int(
        db.scalar(select(func.count()).select_from(AudioPhrase).where(AudioPhrase.course_id == course.id)) or 0
    )
    if existing_lessons == 0 and existing_phrases == 0:
        course.format = payload.format or CourseFormat.VIDEO
    course.source_language = (payload.source_language or "en").strip().lower()[:8]
    course.target_language = (payload.target_language or payload.language or "de").strip().lower()[:8]
    course.level = payload.level
    course.language = (
        payload.language
        if _course_format(course) == CourseFormat.VIDEO
        else course.target_language
    )
    course.duration_minutes = payload.duration_minutes
    course.tags = payload.tags.strip() if payload.tags else None
    course.promo_video_url = payload.promo_video_url
    is_free = payload.is_free or payload.price_cents <= 0
    course.is_free = is_free
    course.price_cents = 0 if is_free else payload.price_cents
    course.currency = payload.currency.upper()

    db.add(course)
    _audit(db, course.id, actor.id, "basics_updated")
    db.commit()
    db.refresh(course)
    return _basics_out(course)


async def upload_thumbnail(db: Session, slug: str, file: UploadFile, actor: User) -> CourseStudioBasicsOut:
    course = course_service.get_course_for_management(db, slug, actor)
    course_service.assert_can_manage_course(actor, course)
    media = await media_service.upload_file(
        db,
        file=file,
        folder="courses",
        uploaded_by=actor.id,
        subfolder=str(course.id),
    )
    course.image_url = media.public_url
    db.add(course)
    _audit(db, course.id, actor.id, "thumbnail_uploaded")
    db.commit()
    db.refresh(course)
    return _basics_out(course)


def _validate_external_cover_url(raw: str) -> str:
    from urllib.parse import urlparse

    url = raw.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Use a link that starts with https://")
    host = (parsed.hostname or "").lower()
    path = parsed.path.lower()
    if host in {"images.unsplash.com", "img.youtube.com", "i.imgur.com", "cdn.pixabay.com"}:
        return url
    if re.search(r"\.(jpg|jpeg|png|webp|gif|avif)(\?|$)", path, re.I):
        return url
    if re.search(r"\.(jpg|jpeg|png|webp|gif|avif)(\?|$)", url, re.I):
        return url
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Paste a direct image link (jpg, png, or webp), for example from Unsplash.",
    )


def set_cover_image_url(db: Session, slug: str, image_url: str, actor: User) -> CourseStudioBasicsOut:
    course = course_service.get_course_for_management(db, slug, actor)
    course_service.assert_can_manage_course(actor, course)
    course.image_url = _validate_external_cover_url(image_url)
    db.add(course)
    _audit(db, course.id, actor.id, "cover_url_set")
    db.commit()
    db.refresh(course)
    logger.info("Studio cover URL set slug=%s", slug)
    return _basics_out(course)


def create_section(db: Session, slug: str, payload: SectionCreateIn, actor: User) -> SectionOut:
    course = course_service.get_course_for_management(db, slug, actor)
    course_service.assert_can_manage_course(actor, course)
    max_pos = db.scalar(
        select(func.max(CourseSection.position)).where(CourseSection.course_id == course.id)
    )
    pos = payload.position if payload.position is not None else int(max_pos or -1) + 1
    section = CourseSection(course_id=course.id, title=payload.title.strip(), position=pos)
    db.add(section)
    db.flush()
    _audit(db, course.id, actor.id, "section_created", section.title)
    db.commit()
    db.refresh(section)
    return SectionOut(id=section.id, title=section.title, position=section.position)


def update_section(db: Session, section_id: UUID, payload: SectionUpdateIn, actor: User) -> SectionOut:
    section = db.get(CourseSection, section_id)
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    course = db.get(Course, section.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course_service.assert_can_manage_course(actor, course)
    if payload.title is not None:
        section.title = payload.title.strip()
    if payload.position is not None:
        section.position = payload.position
    db.add(section)
    db.commit()
    db.refresh(section)
    return SectionOut(id=section.id, title=section.title, position=section.position)


def delete_section(db: Session, section_id: UUID, actor: User) -> None:
    section = db.get(CourseSection, section_id)
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    course = db.get(Course, section.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course_service.assert_can_manage_course(actor, course)
    for lesson in db.scalars(select(Lesson).where(Lesson.section_id == section.id)).all():
        lesson.section_id = None
        db.add(lesson)
    db.delete(section)
    _audit(db, course.id, actor.id, "section_deleted", str(section_id))
    db.commit()


def reorder_sections(db: Session, slug: str, payload: ReorderSectionsIn, actor: User) -> list[SectionOut]:
    course = course_service.get_course_for_management(db, slug, actor)
    course_service.assert_can_manage_course(actor, course)
    sections = {
        s.id: s
        for s in db.scalars(select(CourseSection).where(CourseSection.course_id == course.id)).all()
    }
    for idx, sid in enumerate(payload.section_ids):
        sec = sections.get(sid)
        if sec:
            sec.position = idx
            db.add(sec)
    db.commit()
    ordered = db.scalars(
        select(CourseSection).where(CourseSection.course_id == course.id).order_by(CourseSection.position)
    ).all()
    return [SectionOut(id=s.id, title=s.title, position=s.position) for s in ordered]


def create_lesson(db: Session, slug: str, payload: LessonStudioIn, actor: User) -> LessonStudioOut:
    course = course_service.get_course_for_management(db, slug, actor)
    course_service.assert_can_manage_course(actor, course)
    if payload.section_id:
        sec = db.get(CourseSection, payload.section_id)
        if not sec or sec.course_id != course.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    max_pos = db.scalar(select(func.max(Lesson.position)).where(Lesson.course_id == course.id))
    pos = payload.position if payload.position is not None else int(max_pos or -1) + 1
    lesson = Lesson(
        course_id=course.id,
        section_id=payload.section_id,
        position=pos,
        title=payload.title.strip(),
        body=payload.body,
        lesson_type=payload.lesson_type,
        video_source=payload.video_source,
        video_url=payload.video_url,
        video_duration_seconds=payload.video_duration_seconds,
        quiz_json=payload.quiz_json,
        live_url=payload.live_url,
        is_previewable=payload.is_previewable,
        duration_minutes=payload.duration_minutes,
    )
    db.add(lesson)
    db.flush()
    _sync_lessons_count(db, course.id)
    _sync_duration_minutes(db, course.id)
    _audit(db, course.id, actor.id, "lesson_created", lesson.title)
    db.commit()
    db.refresh(lesson)
    return LessonStudioOut(
        id=lesson.id,
        section_id=lesson.section_id,
        position=lesson.position,
        title=lesson.title,
        body=lesson.body,
        lesson_type=lesson.lesson_type.value,
        video_source=lesson.video_source.value if lesson.video_source else None,
        video_url=lesson.video_url,
        video_duration_seconds=lesson.video_duration_seconds,
        quiz_json=lesson.quiz_json,
        live_url=lesson.live_url,
        is_previewable=lesson.is_previewable,
        duration_minutes=lesson.duration_minutes,
        resources=[],
    )


def update_lesson(db: Session, lesson_id: UUID, payload: StudioLessonUpdateIn, actor: User) -> LessonStudioOut:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    course = db.get(Course, lesson.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course_service.assert_can_manage_course(actor, course)

    if payload.section_id is not None:
        if payload.section_id:
            sec = db.get(CourseSection, payload.section_id)
            if not sec or sec.course_id != course.id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
        lesson.section_id = payload.section_id
    if payload.position is not None:
        lesson.position = payload.position
    if payload.title is not None:
        lesson.title = payload.title.strip()
    if payload.body is not None:
        lesson.body = payload.body
    if payload.lesson_type is not None:
        lesson.lesson_type = payload.lesson_type
    if payload.video_source is not None:
        lesson.video_source = payload.video_source
    if payload.video_url is not None:
        lesson.video_url = payload.video_url
    if payload.video_duration_seconds is not None:
        lesson.video_duration_seconds = payload.video_duration_seconds
    if payload.quiz_json is not None:
        lesson.quiz_json = payload.quiz_json
    if payload.live_url is not None:
        lesson.live_url = payload.live_url
    if payload.is_previewable is not None:
        lesson.is_previewable = payload.is_previewable
    if payload.duration_minutes is not None:
        lesson.duration_minutes = payload.duration_minutes

    db.add(lesson)
    _sync_duration_minutes(db, course.id)
    db.commit()
    db.refresh(lesson)
    resources = [
        LessonResourceOut(id=r.id, title=r.title, file_type=r.file_type, file_size_bytes=r.file_size_bytes)
        for r in db.scalars(select(LessonResource).where(LessonResource.lesson_id == lesson.id)).all()
    ]
    return LessonStudioOut(
        id=lesson.id,
        section_id=lesson.section_id,
        position=lesson.position,
        title=lesson.title,
        body=lesson.body,
        lesson_type=lesson.lesson_type.value,
        video_source=lesson.video_source.value if lesson.video_source else None,
        video_url=lesson.video_url,
        video_duration_seconds=lesson.video_duration_seconds,
        quiz_json=lesson.quiz_json,
        live_url=lesson.live_url,
        is_previewable=lesson.is_previewable,
        duration_minutes=lesson.duration_minutes,
        resources=resources,
    )


def delete_lesson(db: Session, lesson_id: UUID, actor: User) -> None:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    course = db.get(Course, lesson.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course_service.assert_can_manage_course(actor, course)
    db.delete(lesson)
    _sync_lessons_count(db, course.id)
    _sync_duration_minutes(db, course.id)
    _audit(db, course.id, actor.id, "lesson_deleted", str(lesson_id))
    db.commit()


def reorder_lessons(db: Session, slug: str, payload: LessonReorderIn, actor: User) -> None:
    course = course_service.get_course_for_management(db, slug, actor)
    course_service.assert_can_manage_course(actor, course)
    lessons = {
        l.id: l for l in db.scalars(select(Lesson).where(Lesson.course_id == course.id)).all()
    }
    for idx, lid in enumerate(payload.lesson_ids):
        row = lessons.get(lid)
        if row:
            row.position = idx
            db.add(row)
    db.commit()


async def upload_lesson_video(db: Session, lesson_id: UUID, file: UploadFile, actor: User) -> LessonStudioOut:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    course = db.get(Course, lesson.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course_service.assert_can_manage_course(actor, course)

    media = await media_service.upload_file(
        db,
        file=file,
        folder="lessons",
        uploaded_by=actor.id,
        subfolder=f"{course.id}/{lesson.id}",
    )
    lesson.lesson_type = LessonType.VIDEO
    lesson.video_source = VideoSource.UPLOAD
    lesson.video_url = media.relative_path
    lesson.video_duration_seconds = 0
    lesson.video_metadata = json.dumps(
        {
            "file_size_bytes": media.size_bytes,
            "content_type": media.mime_type,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "streaming": "progressive",
            "hls_ready": False,
        }
    )
    db.add(lesson)
    _sync_duration_minutes(db, course.id)
    db.commit()
    db.refresh(lesson)
    logger.info("Lesson video uploaded lesson_id=%s size=%s", lesson_id, media.size_bytes)
    return _lesson_out(db, lesson)


async def upload_lesson_resource(
    db: Session, lesson_id: UUID, title: str, file: UploadFile, actor: User
) -> LessonResourceOut:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    course = db.get(Course, lesson.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course_service.assert_can_manage_course(actor, course)

    media = await media_service.upload_file(
        db,
        file=file,
        folder="resources",
        uploaded_by=actor.id,
        subfolder=f"{course.id}/{lesson.id}",
    )
    row = LessonResource(
        lesson_id=lesson.id,
        title=title.strip() or media.original_filename,
        file_path=media.relative_path,
        file_type=media.mime_type,
        file_size_bytes=media.size_bytes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return LessonResourceOut(
        id=row.id, title=row.title, file_type=row.file_type, file_size_bytes=row.file_size_bytes
    )


def _lesson_out(db: Session, lesson: Lesson) -> LessonStudioOut:
    resources = [
        LessonResourceOut(id=r.id, title=r.title, file_type=r.file_type, file_size_bytes=r.file_size_bytes)
        for r in db.scalars(select(LessonResource).where(LessonResource.lesson_id == lesson.id)).all()
    ]
    return LessonStudioOut(
        id=lesson.id,
        section_id=lesson.section_id,
        position=lesson.position,
        title=lesson.title,
        body=lesson.body,
        lesson_type=lesson.lesson_type.value,
        video_source=lesson.video_source.value if lesson.video_source else None,
        video_url=lesson.video_url,
        video_duration_seconds=lesson.video_duration_seconds,
        quiz_json=lesson.quiz_json,
        live_url=lesson.live_url,
        is_previewable=lesson.is_previewable,
        duration_minutes=lesson.duration_minutes,
        resources=resources,
    )


def delete_studio_course(db: Session, slug: str, actor: User) -> None:
    """Owner instructor or admin may permanently delete draft, review, or live courses."""
    course = course_service.get_course_for_management(db, slug, actor)
    course_service.assert_can_manage_course(actor, course)
    course_id = course.id
    logger.info(
        "Studio course deleted slug=%s id=%s title=%s status=%s by=%s",
        slug,
        course_id,
        course.title,
        course.status.value if hasattr(course.status, "value") else course.status,
        actor.id,
    )
    db.delete(course)
    db.commit()
    invalidate_catalog_cache()


def submit_for_review(db: Session, slug: str, actor: User) -> CourseStudioBasicsOut:
    course = course_service.get_course_for_management(db, slug, actor)
    course_service.assert_can_manage_course(actor, course)
    _sync_lessons_count(db, course.id)
    db.flush()
    if course.lessons_count < 1:
        detail = (
            "Add at least one phrase"
            if _course_format(course) == CourseFormat.AUDIO
            else "Add at least one lesson"
        )
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)
    if not course.image_url:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Upload a course cover image")
    course.status = CourseStatus.PENDING_REVIEW
    course.rejection_reason = None
    db.add(course)
    _audit(db, course.id, actor.id, "submitted_for_review")
    db.commit()
    db.refresh(course)
    return _basics_out(course)


def admin_list_pending(db: Session) -> list[StudioCourseListItem]:
    rows = db.scalars(
        select(Course)
        .where(Course.status == CourseStatus.PENDING_REVIEW)
        .order_by(Course.updated_at.desc())
    ).all()
    return [
        StudioCourseListItem(
            id=c.id,
            slug=c.slug,
            title=c.title,
            status=c.status.value,
            format=_course_format(c).value,
            lessons_count=c.lessons_count,
            image_url=c.image_url,
            updated_at=c.updated_at,
        )
        for c in rows
    ]


def create_audio_phrase(db: Session, slug: str, payload: AudioPhraseIn, actor: User) -> AudioPhraseOut:
    course = course_service.get_course_for_management(db, slug, actor)
    course_service.assert_can_manage_course(actor, course)
    if _course_format(course) != CourseFormat.AUDIO:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="This course is not an audio course")
    if payload.section_id:
        sec = db.get(CourseSection, payload.section_id)
        if not sec or sec.course_id != course.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    pos = payload.position
    if pos is None:
        pos = int(
            db.scalar(
                select(func.coalesce(func.max(AudioPhrase.position), -1)).where(AudioPhrase.course_id == course.id)
            )
            or -1
        ) + 1
    audio_source = None
    if payload.audio_source:
        try:
            audio_source = AudioSource(payload.audio_source)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid audio source") from exc
    phrase = AudioPhrase(
        course_id=course.id,
        section_id=payload.section_id,
        position=pos,
        source_text=payload.source_text.strip(),
        target_text=payload.target_text.strip(),
        audio_source=audio_source,
        audio_url=payload.audio_url.strip() if payload.audio_url else None,
        audio_duration_seconds=payload.audio_duration_seconds,
    )
    db.add(phrase)
    db.flush()
    _sync_lessons_count(db, course.id)
    _sync_duration_minutes(db, course.id)
    _audit(db, course.id, actor.id, "phrase_created", str(phrase.id))
    db.commit()
    db.refresh(phrase)
    return _phrase_out(phrase)


def update_audio_phrase(db: Session, phrase_id: UUID, payload: AudioPhraseUpdateIn, actor: User) -> AudioPhraseOut:
    phrase = db.get(AudioPhrase, phrase_id)
    if not phrase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phrase not found")
    course = db.get(Course, phrase.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course_service.assert_can_manage_course(actor, course)
    if payload.section_id is not None:
        if payload.section_id:
            sec = db.get(CourseSection, payload.section_id)
            if not sec or sec.course_id != course.id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
        phrase.section_id = payload.section_id
    if payload.position is not None:
        phrase.position = payload.position
    if payload.source_text is not None:
        phrase.source_text = payload.source_text.strip()
    if payload.target_text is not None:
        phrase.target_text = payload.target_text.strip()
    if payload.audio_source is not None:
        try:
            phrase.audio_source = AudioSource(payload.audio_source) if payload.audio_source else None
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid audio source") from exc
    if payload.audio_url is not None:
        phrase.audio_url = payload.audio_url.strip() or None
    if payload.audio_duration_seconds is not None:
        phrase.audio_duration_seconds = payload.audio_duration_seconds
    db.add(phrase)
    _sync_duration_minutes(db, course.id)
    _audit(db, course.id, actor.id, "phrase_updated", str(phrase.id))
    db.commit()
    db.refresh(phrase)
    return _phrase_out(phrase)


def delete_audio_phrase(db: Session, phrase_id: UUID, actor: User) -> None:
    phrase = db.get(AudioPhrase, phrase_id)
    if not phrase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phrase not found")
    course = db.get(Course, phrase.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course_service.assert_can_manage_course(actor, course)
    db.delete(phrase)
    _sync_lessons_count(db, course.id)
    _sync_duration_minutes(db, course.id)
    _audit(db, course.id, actor.id, "phrase_deleted", str(phrase_id))
    db.commit()


def clear_phrase_audio(db: Session, phrase_id: UUID, actor: User) -> AudioPhraseOut:
    """Remove voice only - keep the phrase text so a new file can be uploaded."""
    phrase = db.get(AudioPhrase, phrase_id)
    if not phrase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phrase not found")
    course = db.get(Course, phrase.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course_service.assert_can_manage_course(actor, course)
    phrase.audio_url = None
    phrase.audio_source = None
    phrase.audio_duration_seconds = 0
    db.add(phrase)
    _sync_duration_minutes(db, course.id)
    _audit(db, course.id, actor.id, "phrase_audio_cleared", str(phrase_id))
    db.commit()
    db.refresh(phrase)
    return _phrase_out(phrase)


def reorder_audio_phrases(db: Session, slug: str, payload: AudioPhraseReorderIn, actor: User) -> list[AudioPhraseOut]:
    course = course_service.get_course_for_management(db, slug, actor)
    course_service.assert_can_manage_course(actor, course)
    phrases = {
        p.id: p for p in db.scalars(select(AudioPhrase).where(AudioPhrase.course_id == course.id)).all()
    }
    for idx, pid in enumerate(payload.phrase_ids):
        phrase = phrases.get(pid)
        if not phrase:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phrase not found in this course")
        phrase.position = idx
        db.add(phrase)
    _audit(db, course.id, actor.id, "phrases_reordered")
    db.commit()
    return [
        _phrase_out(p)
        for p in db.scalars(
            select(AudioPhrase).where(AudioPhrase.course_id == course.id).order_by(AudioPhrase.position)
        ).all()
    ]


async def upload_phrase_audio(db: Session, phrase_id: UUID, file: UploadFile, actor: User) -> AudioPhraseOut:
    from app.services import media_storage_service

    phrase = db.get(AudioPhrase, phrase_id)
    if not phrase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phrase not found")
    course = db.get(Course, phrase.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course_service.assert_can_manage_course(actor, course)
    stored = await media_storage_service.save_phrase_audio(course.id, phrase.id, file)
    phrase.audio_source = AudioSource.UPLOAD
    phrase.audio_url = stored.storage_key
    phrase.audio_duration_seconds = stored.duration_seconds or phrase.audio_duration_seconds
    db.add(phrase)
    _sync_duration_minutes(db, course.id)
    _audit(db, course.id, actor.id, "phrase_audio_uploaded", str(phrase.id))
    db.commit()
    db.refresh(phrase)
    return _phrase_out(phrase)


def admin_approve_course(db: Session, slug: str, admin: User) -> CourseStudioBasicsOut:
    course = course_service.get_course_for_management(db, slug, admin)
    if course.status != CourseStatus.PENDING_REVIEW:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Course is not pending review")
    course.status = CourseStatus.PUBLISHED
    course.published_at = datetime.now(timezone.utc)
    course.rejection_reason = None
    db.add(course)
    _audit(db, course.id, admin.id, "approved")
    db.commit()
    db.refresh(course)
    invalidate_catalog_cache()
    return _basics_out(course)


def admin_reject_course(db: Session, slug: str, reason: str, admin: User) -> CourseStudioBasicsOut:
    course = course_service.get_course_for_management(db, slug, admin)
    if course.status != CourseStatus.PENDING_REVIEW:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Course is not pending review")
    course.status = CourseStatus.DRAFT
    course.rejection_reason = reason.strip() or "Changes needed before we can publish."
    db.add(course)
    _audit(db, course.id, admin.id, "rejected", course.rejection_reason)
    db.commit()
    db.refresh(course)
    return _basics_out(course)


def studio_analytics(db: Session, slug: str, actor: User) -> CourseStudioAnalyticsOut:
    course = course_service.get_course_for_management(db, slug, actor)

    total_students = int(
        db.scalar(
            select(func.count())
            .select_from(Enrollment)
            .where(
                Enrollment.course_id == course.id,
                Enrollment.status == EnrollmentStatus.ENROLLED,
            )
        )
        or 0
    )
    completed = int(
        db.scalar(
            select(func.count())
            .select_from(Enrollment)
            .where(
                Enrollment.course_id == course.id,
                Enrollment.status == EnrollmentStatus.ENROLLED,
                Enrollment.progress_pct >= 100,
            )
        )
        or 0
    )
    completion_rate = round((completed / total_students) * 100) if total_students else 0

    revenue_cents = int(
        db.scalar(
            select(func.coalesce(func.sum(Payment.amount_cents), 0))
            .where(
                Payment.course_id == course.id,
                Payment.status.in_([PaymentStatus.COMPLETED, PaymentStatus.PAID]),
            )
        )
        or 0
    )

    watch_seconds = int(
        db.scalar(
            select(func.coalesce(func.sum(VideoWatchHistory.watch_time_seconds), 0))
            .join(Lesson, Lesson.id == VideoWatchHistory.lesson_id)
            .where(Lesson.course_id == course.id)
        )
        or 0
    )

    top_lessons_rows = db.execute(
        select(Lesson.title, func.coalesce(func.sum(VideoWatchHistory.watch_time_seconds), 0))
        .outerjoin(VideoWatchHistory, VideoWatchHistory.lesson_id == Lesson.id)
        .where(Lesson.course_id == course.id)
        .group_by(Lesson.id)
        .order_by(func.coalesce(func.sum(VideoWatchHistory.watch_time_seconds), 0).desc())
        .limit(5)
    ).all()

    review_rows = db.scalars(
        select(CourseReview).where(CourseReview.course_id == course.id).order_by(CourseReview.created_at.desc()).limit(8)
    ).all()
    avg_rating = db.scalar(
        select(func.avg(CourseReview.rating)).where(CourseReview.course_id == course.id)
    )

    return CourseStudioAnalyticsOut(
        total_students=total_students,
        completion_rate=completion_rate,
        watch_time_hours=round(watch_seconds / 3600, 1),
        revenue_cents=revenue_cents,
        currency=course.currency,
        average_rating=float(avg_rating or 0),
        most_watched_lessons=[{"title": r[0], "watch_seconds": int(r[1] or 0)} for r in top_lessons_rows],
        recent_feedback=[
            {"rating": r.rating, "comment": r.comment, "created_at": r.created_at.isoformat()} for r in review_rows
        ],
    )
