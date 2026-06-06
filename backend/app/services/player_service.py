from __future__ import annotations

import logging
import re
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.course_section import CourseSection
from app.models.course_status import CourseStatus, VideoSource
from app.models.enrollment import Enrollment
from app.models.enrollment_status import EnrollmentStatus
from app.models.lesson import Lesson
from app.models.lesson_resource import LessonResource
from app.models.role import UserRole
from app.models.user import User
from app.models.video_watch_history import VideoWatchHistory
from app.schemas.studio import (
    PlayerCurriculumOut,
    PlayerLessonOut,
    PlayerProgressIn,
    PlayerProgressOut,
    PlayerSectionOut,
    StreamTokenOut,
)
from app.services import course_service
from app.services.media_storage_service import create_stream_token, decode_stream_token, resolve_storage_path

logger = logging.getLogger(__name__)

_YT_RE = re.compile(
    r"(?:youtube\.com/(?:watch\?v=|embed/)|youtu\.be/)([A-Za-z0-9_-]{6,})",
    re.I,
)
_VIMEO_RE = re.compile(r"vimeo\.com/(?:video/)?(\d+)", re.I)


def _embed_url(lesson: Lesson) -> str | None:
    if not lesson.video_url:
        return None
    if lesson.video_source == VideoSource.YOUTUBE:
        m = _YT_RE.search(lesson.video_url)
        if m:
            return f"https://www.youtube-nocookie.com/embed/{m.group(1)}?rel=0&modestbranding=1&playsinline=1"
    if lesson.video_source == VideoSource.VIMEO:
        m = _VIMEO_RE.search(lesson.video_url)
        if m:
            return f"https://player.vimeo.com/video/{m.group(1)}"
    return None


def _direct_video_url(lesson: Lesson) -> str | None:
    """External MP4/WebM links (not YouTube/Vimeo) — use HTML5 video, not iframe."""
    if not lesson.video_url or lesson.video_source != VideoSource.URL:
        return None
    if _YT_RE.search(lesson.video_url) or _VIMEO_RE.search(lesson.video_url):
        return None
    lower = lesson.video_url.lower()
    if any(lower.endswith(ext) or f"{ext}?" in lower for ext in (".mp4", ".webm", ".mov", ".m4v")):
        return lesson.video_url
    return lesson.video_url if lesson.video_source == VideoSource.URL else None


def can_access_course_content(db: Session, user: User | None, course: Course, *, preview_ok: bool = False) -> bool:
    if user and user.role == UserRole.ADMIN:
        return True
    if user and course.instructor_id == user.id:
        return True
    if preview_ok and course.status in (CourseStatus.DRAFT, CourseStatus.PENDING_REVIEW):
        return bool(user and course.instructor_id == user.id)
    if course.status != CourseStatus.PUBLISHED and not preview_ok:
        if user and course.instructor_id == user.id:
            return True
        return False
    if user is None:
        return False
    enrolled = db.scalar(
        select(Enrollment.id).where(
            Enrollment.user_id == user.id,
            Enrollment.course_id == course.id,
            Enrollment.status == EnrollmentStatus.ENROLLED,
        )
    )
    return enrolled is not None


def can_access_lesson(
    db: Session, user: User | None, course: Course, lesson: Lesson, *, preview_mode: bool = False
) -> bool:
    if user and user.role == UserRole.ADMIN:
        return True
    if lesson.is_previewable and course.status == CourseStatus.PUBLISHED:
        return True
    if preview_mode and user and (
        user.role == UserRole.ADMIN or (course.instructor_id is not None and course.instructor_id == user.id)
    ):
        return True
    return can_access_course_content(db, user, course, preview_ok=preview_mode)


def get_player_curriculum(
    db: Session, slug: str, user: User | None, *, preview: bool = False
) -> PlayerCurriculumOut:
    course = course_service.get_course_or_404(db, slug, user=user)
    if preview:
        if not user or (user.role != UserRole.ADMIN and course.instructor_id != user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Preview not allowed")
    elif not can_access_course_content(db, user, course) and not (
        user
        and (
            user.role == UserRole.ADMIN
            or (user.role == UserRole.INSTRUCTOR and course.instructor_id == user.id)
        )
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Enroll to access this course")

    sections = db.scalars(
        select(CourseSection).where(CourseSection.course_id == course.id).order_by(CourseSection.position)
    ).all()
    lessons = db.scalars(
        select(Lesson).where(Lesson.course_id == course.id).order_by(Lesson.position, Lesson.created_at)
    ).all()

    progress_map: dict[UUID, VideoWatchHistory] = {}
    if user and lessons:
        lesson_ids = [l.id for l in lessons]
        for row in db.scalars(
            select(VideoWatchHistory).where(
                VideoWatchHistory.user_id == user.id,
                VideoWatchHistory.lesson_id.in_(lesson_ids),
            )
        ).all():
            progress_map[row.lesson_id] = row

    enrollment = None
    if user:
        enrollment = db.scalar(
            select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id)
        )

    lesson_rows = []
    for lesson in lessons:
        hist = progress_map.get(lesson.id)
        lesson_rows.append(
            PlayerLessonOut(
                id=lesson.id,
                section_id=lesson.section_id,
                position=lesson.position,
                title=lesson.title,
                lesson_type=lesson.lesson_type.value,
                duration_minutes=lesson.duration_minutes,
                is_previewable=lesson.is_previewable,
                completed=bool(hist.completed) if hist else False,
                position_seconds=hist.position_seconds if hist else 0,
            )
        )

    return PlayerCurriculumOut(
        course_slug=course.slug,
        course_title=course.title,
        image_url=course.image_url,
        progress_pct=enrollment.progress_pct if enrollment else 0,
        sections=[PlayerSectionOut(id=s.id, title=s.title, position=s.position) for s in sections],
        lessons=lesson_rows,
    )


def get_player_lesson(
    db: Session, slug: str, lesson_id: UUID, user: User | None, *, preview: bool = False
) -> dict:
    course = course_service.get_course_or_404(db, slug, user=user)
    lesson = db.get(Lesson, lesson_id)
    if not lesson or lesson.course_id != course.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    if not can_access_lesson(db, user, course, lesson, preview_mode=preview):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this lesson")

    hist = None
    if user:
        hist = db.scalar(
            select(VideoWatchHistory).where(
                VideoWatchHistory.user_id == user.id, VideoWatchHistory.lesson_id == lesson.id
            )
        )

    stream_token = None
    if user and lesson.video_source == VideoSource.UPLOAD and lesson.video_url:
        stream_token = create_stream_token(user_id=user.id, lesson_id=lesson.id)

    resources = [
        {"id": str(r.id), "title": r.title, "file_type": r.file_type}
        for r in db.scalars(select(LessonResource).where(LessonResource.lesson_id == lesson.id)).all()
    ]

    next_lesson = db.scalar(
        select(Lesson)
        .where(Lesson.course_id == course.id, Lesson.position > lesson.position)
        .order_by(Lesson.position.asc())
        .limit(1)
    )

    return {
        "course_slug": course.slug,
        "course_title": course.title,
        "lesson": {
            "id": str(lesson.id),
            "title": lesson.title,
            "body": lesson.body,
            "lesson_type": lesson.lesson_type.value,
            "video_source": lesson.video_source.value if lesson.video_source else None,
            "embed_url": _embed_url(lesson),
            "direct_video_url": _direct_video_url(lesson),
            "stream_token": stream_token,
            "video_duration_seconds": lesson.video_duration_seconds,
            "quiz_json": lesson.quiz_json,
            "live_url": lesson.live_url,
            "resources": resources,
        },
        "progress": {
            "position_seconds": hist.position_seconds if hist else 0,
            "completed": hist.completed if hist else False,
        },
        "next_lesson_id": str(next_lesson.id) if next_lesson else None,
    }


def save_progress(db: Session, user: User, payload: PlayerProgressIn) -> PlayerProgressOut:
    lesson = db.get(Lesson, payload.lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    course = db.get(Course, lesson.course_id)
    if not course or not can_access_lesson(db, user, course, lesson):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot save progress")

    row = db.scalar(
        select(VideoWatchHistory).where(
            VideoWatchHistory.user_id == user.id, VideoWatchHistory.lesson_id == lesson.id
        )
    )
    was_completed = bool(row and row.completed)
    if not row:
        row = VideoWatchHistory(user_id=user.id, lesson_id=lesson.id)
    row.position_seconds = max(0, payload.position_seconds)
    row.watch_time_seconds = max(row.watch_time_seconds, payload.watch_time_seconds)
    row.completed = payload.completed or row.completed
    db.add(row)

    enrollment = db.scalar(
        select(Enrollment).where(
            Enrollment.user_id == user.id,
            Enrollment.course_id == course.id,
            Enrollment.status == EnrollmentStatus.ENROLLED,
        )
    )
    if enrollment and row.completed and not was_completed:
        total_lessons = max(int(course.lessons_count or 0), 0)
        if total_lessons == 0:
            total_lessons = int(
                db.scalar(select(func.count()).select_from(Lesson).where(Lesson.course_id == course.id)) or 0
            )
        completed_count = int(
            db.scalar(
                select(func.count())
                .select_from(VideoWatchHistory)
                .join(Lesson, Lesson.id == VideoWatchHistory.lesson_id)
                .where(
                    VideoWatchHistory.user_id == user.id,
                    Lesson.course_id == course.id,
                    VideoWatchHistory.completed.is_(True),
                )
            )
            or 0
        )
        enrollment.lesson_done = completed_count
        enrollment.progress_pct = min(100, round((completed_count / total_lessons) * 100)) if total_lessons else 0
        db.add(enrollment)

    db.commit()
    logger.info(
        "Saved watch progress user=%s lesson=%s pos=%s completed=%s",
        user.id,
        lesson.id,
        row.position_seconds,
        row.completed,
    )
    return PlayerProgressOut(
        lesson_id=lesson.id,
        position_seconds=row.position_seconds,
        watch_time_seconds=row.watch_time_seconds,
        completed=row.completed,
    )


def issue_stream_token(db: Session, lesson_id: UUID, user: User) -> StreamTokenOut:
    lesson = db.get(Lesson, lesson_id)
    if not lesson or lesson.video_source != VideoSource.UPLOAD or not lesson.video_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No protected video")
    course = db.get(Course, lesson.course_id)
    if not course or not can_access_lesson(db, user, course, lesson):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    token = create_stream_token(user_id=user.id, lesson_id=lesson.id)
    return StreamTokenOut(token=token, expires_in_minutes=120)


def resolve_stream_file(db: Session, token: str) -> tuple[str, str]:
    user_id, lesson_id = decode_stream_token(token)
    lesson = db.get(Lesson, lesson_id)
    if not lesson or lesson.video_source != VideoSource.UPLOAD or not lesson.video_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    course = db.get(Course, lesson.course_id)
    user = db.get(User, user_id)
    if not course or not user or not can_access_lesson(db, user, course, lesson):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    path = resolve_storage_path(lesson.video_url)
    media_type = "video/mp4"
    if path.suffix.lower() == ".webm":
        media_type = "video/webm"
    elif path.suffix.lower() == ".mov":
        media_type = "video/quicktime"
    return str(path), media_type
