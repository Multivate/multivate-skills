from __future__ import annotations

import logging
import re
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audio_phrase import AudioPhrase
from app.models.audio_phrase_progress import AudioPhraseProgress
from app.models.audio_module_assessment import AudioModuleAssessment
from app.models.course import Course
from app.models.course_section import CourseSection
from app.models.course_status import AudioSource, CourseFormat, CourseStatus, LessonType, VideoSource
from app.models.enrollment import Enrollment
from app.models.enrollment_status import EnrollmentStatus
from app.models.lesson import Lesson
from app.models.lesson_resource import LessonResource
from app.models.role import UserRole
from app.models.user import User
from app.models.video_watch_history import VideoWatchHistory
from app.schemas.studio import (
    AudioModuleAssessmentIn,
    AudioModuleAssessmentOut,
    AudioModuleAssessmentSubmitOut,
    AudioPhraseLearnedIn,
    AudioPhraseLearnedOut,
    PlayerCurriculumOut,
    PlayerLessonOut,
    PlayerPhrasebookOut,
    PlayerPhraseOut,
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


def _is_quiz(lesson: Lesson) -> bool:
    return lesson.lesson_type == LessonType.QUIZ or lesson.lesson_type == "quiz"


def _content_lessons(lessons: list[Lesson]) -> list[Lesson]:
    return [l for l in lessons if not _is_quiz(l)]


def _assessment_unlock_state(
    *,
    lesson: Lesson,
    all_lessons: list[Lesson],
    progress_map: dict[UUID, VideoWatchHistory],
    preview_mode: bool,
    is_staff: bool,
) -> tuple[bool, str | None]:
    """Assessments unlock only after every non-assessment lesson/session is completed."""
    if not _is_quiz(lesson):
        return False, None
    if preview_mode or is_staff:
        return False, None
    required = _content_lessons(all_lessons)
    if not required:
        return False, None
    missing = [l for l in required if not (progress_map.get(l.id) and progress_map[l.id].completed)]
    if not missing:
        return False, None
    return True, f"Complete all {len(required)} lessons first ({len(required) - len(missing)}/{len(required)} done)."


def _recalc_enrollment_progress(db: Session, user_id: UUID, course: Course) -> int:
    enrollment = db.scalar(
        select(Enrollment).where(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course.id,
            Enrollment.status == EnrollmentStatus.ENROLLED,
        )
    )
    if not enrollment:
        return 0

    fmt = getattr(course, "format", None)
    is_audio = fmt == CourseFormat.AUDIO or fmt == "audio"
    if is_audio:
        total_phrases = int(
            db.scalar(
                select(func.count()).select_from(AudioPhrase).where(AudioPhrase.course_id == course.id)
            )
            or 0
        )
        learned_count = int(
            db.scalar(
                select(func.count())
                .select_from(AudioPhraseProgress)
                .join(AudioPhrase, AudioPhrase.id == AudioPhraseProgress.phrase_id)
                .where(
                    AudioPhraseProgress.user_id == user_id,
                    AudioPhrase.course_id == course.id,
                    AudioPhraseProgress.learned.is_(True),
                )
            )
            or 0
        )
        enrollment.lesson_done = learned_count
        enrollment.progress_pct = (
            min(100, round((learned_count / total_phrases) * 100)) if total_phrases else 0
        )
        db.add(enrollment)
        return enrollment.progress_pct

    total_lessons = int(
        db.scalar(select(func.count()).select_from(Lesson).where(Lesson.course_id == course.id)) or 0
    )
    completed_count = int(
        db.scalar(
            select(func.count())
            .select_from(VideoWatchHistory)
            .join(Lesson, Lesson.id == VideoWatchHistory.lesson_id)
            .where(
                VideoWatchHistory.user_id == user_id,
                Lesson.course_id == course.id,
                VideoWatchHistory.completed.is_(True),
            )
        )
        or 0
    )
    enrollment.lesson_done = completed_count
    enrollment.progress_pct = min(100, round((completed_count / total_lessons) * 100)) if total_lessons else 0
    db.add(enrollment)
    return enrollment.progress_pct


def _require_audio_course_access(db: Session, slug: str, user: User) -> Course:
    course = course_service.get_course_or_404(db, slug, user=user)
    fmt = getattr(course, "format", None)
    is_audio = fmt == CourseFormat.AUDIO or fmt == "audio"
    if not is_audio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This is not an audio course")
    if not can_access_course_content(db, user, course) and not (
        user.role == UserRole.ADMIN
        or (user.role == UserRole.INSTRUCTOR and course.instructor_id == user.id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Enroll to access this course")
    return course


AUDIO_PASS_MARK = 70


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
    """External MP4/WebM links (not YouTube/Vimeo) - use HTML5 video, not iframe."""
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
    is_staff = bool(
        user
        and (
            user.role == UserRole.ADMIN
            or (user.role == UserRole.INSTRUCTOR and course.instructor_id == user.id)
        )
    )
    for lesson in lessons:
        hist = progress_map.get(lesson.id)
        locked, unlock_hint = _assessment_unlock_state(
            lesson=lesson,
            all_lessons=list(lessons),
            progress_map=progress_map,
            preview_mode=preview,
            is_staff=is_staff,
        )
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
                locked=locked,
                unlock_hint=unlock_hint,
            )
        )

    if user and enrollment:
        enrollment.progress_pct = _recalc_enrollment_progress(db, user.id, course)
        db.commit()
        db.refresh(enrollment)

    return PlayerCurriculumOut(
        course_slug=course.slug,
        course_title=course.title,
        image_url=course.image_url,
        progress_pct=enrollment.progress_pct if enrollment else 0,
        sections=[PlayerSectionOut(id=s.id, title=s.title, position=s.position) for s in sections],
        lessons=lesson_rows,
    )


def get_player_phrasebook(
    db: Session, slug: str, user: User | None, *, preview: bool = False
) -> PlayerPhrasebookOut:
    course = course_service.get_course_or_404(db, slug, user=user)
    fmt = getattr(course, "format", None)
    is_audio = fmt == CourseFormat.AUDIO or fmt == "audio"
    if not is_audio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This is not an audio course")

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
    phrases = db.scalars(
        select(AudioPhrase).where(AudioPhrase.course_id == course.id).order_by(AudioPhrase.position, AudioPhrase.created_at)
    ).all()

    enrollment = None
    learned_ids: list[UUID] = []
    module_assessments: list[AudioModuleAssessmentOut] = []
    if user and not preview:
        enrollment = db.scalar(
            select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id)
        )
        phrase_ids = [p.id for p in phrases]
        if phrase_ids:
            learned_ids = list(
                db.scalars(
                    select(AudioPhraseProgress.phrase_id).where(
                        AudioPhraseProgress.user_id == user.id,
                        AudioPhraseProgress.phrase_id.in_(phrase_ids),
                        AudioPhraseProgress.learned.is_(True),
                    )
                ).all()
            )
        for row in db.scalars(
            select(AudioModuleAssessment).where(
                AudioModuleAssessment.user_id == user.id,
                AudioModuleAssessment.course_id == course.id,
            )
        ).all():
            module_assessments.append(
                AudioModuleAssessmentOut(
                    module_key=row.module_key,
                    score_pct=row.score_pct,
                    passed=row.passed,
                    at=row.attempted_at.isoformat() if row.attempted_at else "",
                )
            )
    elif user:
        enrollment = db.scalar(
            select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id)
        )

    phrase_rows: list[PlayerPhraseOut] = []
    for p in phrases:
        audio_url = None
        if p.audio_url:
            if p.audio_source == AudioSource.UPLOAD or (
                p.audio_url and not p.audio_url.startswith("http")
            ):
                audio_url = f"/api/media/public/{p.audio_url}"
            else:
                audio_url = p.audio_url
        phrase_rows.append(
            PlayerPhraseOut(
                id=p.id,
                section_id=p.section_id,
                position=p.position,
                source_text=p.source_text,
                target_text=p.target_text,
                audio_url=audio_url,
                stream_token=None,
                audio_duration_seconds=p.audio_duration_seconds,
            )
        )

    return PlayerPhrasebookOut(
        course_slug=course.slug,
        course_title=course.title,
        image_url=course.image_url,
        format="audio",
        source_language=getattr(course, "source_language", "en") or "en",
        target_language=getattr(course, "target_language", "de") or "de",
        progress_pct=enrollment.progress_pct if enrollment else 0,
        sections=[PlayerSectionOut(id=s.id, title=s.title, position=s.position) for s in sections],
        phrases=phrase_rows,
        learned_phrase_ids=learned_ids,
        module_assessments=module_assessments,
    )


def mark_audio_phrase_learned(
    db: Session, user: User, payload: AudioPhraseLearnedIn
) -> AudioPhraseLearnedOut:
    course = _require_audio_course_access(db, payload.course_slug, user)
    phrase = db.get(AudioPhrase, payload.phrase_id)
    if not phrase or phrase.course_id != course.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phrase not found")

    row = db.scalar(
        select(AudioPhraseProgress).where(
            AudioPhraseProgress.user_id == user.id,
            AudioPhraseProgress.phrase_id == phrase.id,
        )
    )
    if not row:
        row = AudioPhraseProgress(user_id=user.id, phrase_id=phrase.id, learned=True)
    else:
        row.learned = True
    db.add(row)
    db.flush()
    progress_pct = _recalc_enrollment_progress(db, user.id, course)
    db.commit()
    return AudioPhraseLearnedOut(phrase_id=phrase.id, learned=True, progress_pct=progress_pct)


def submit_audio_module_assessment(
    db: Session, user: User, payload: AudioModuleAssessmentIn
) -> AudioModuleAssessmentSubmitOut:
    course = _require_audio_course_access(db, payload.course_slug, user)
    module_key = payload.module_key.strip()
    if not module_key:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="module_key required")

    passed = payload.score_pct >= AUDIO_PASS_MARK
    row = db.scalar(
        select(AudioModuleAssessment).where(
            AudioModuleAssessment.user_id == user.id,
            AudioModuleAssessment.course_id == course.id,
            AudioModuleAssessment.module_key == module_key,
        )
    )
    if not row:
        row = AudioModuleAssessment(
            user_id=user.id,
            course_id=course.id,
            module_key=module_key,
            score_pct=payload.score_pct,
            passed=passed,
            attempt_count=1,
        )
    else:
        row.attempt_count = int(row.attempt_count or 0) + 1
        # Keep best score / pass if already passed
        if payload.score_pct >= row.score_pct:
            row.score_pct = payload.score_pct
        if passed:
            row.passed = True
        from datetime import datetime, timezone

        row.attempted_at = datetime.now(timezone.utc)
    db.add(row)
    db.flush()
    progress_pct = _recalc_enrollment_progress(db, user.id, course)
    db.commit()
    return AudioModuleAssessmentSubmitOut(
        module_key=module_key,
        score_pct=row.score_pct,
        passed=row.passed,
        progress_pct=progress_pct,
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

    all_lessons = list(
        db.scalars(select(Lesson).where(Lesson.course_id == course.id).order_by(Lesson.position)).all()
    )
    progress_map: dict[UUID, VideoWatchHistory] = {}
    if user and all_lessons:
        for row in db.scalars(
            select(VideoWatchHistory).where(
                VideoWatchHistory.user_id == user.id,
                VideoWatchHistory.lesson_id.in_([l.id for l in all_lessons]),
            )
        ).all():
            progress_map[row.lesson_id] = row

    is_staff = bool(
        user
        and (
            user.role == UserRole.ADMIN
            or (user.role == UserRole.INSTRUCTOR and course.instructor_id == user.id)
        )
    )
    locked, unlock_hint = _assessment_unlock_state(
        lesson=lesson,
        all_lessons=all_lessons,
        progress_map=progress_map,
        preview_mode=preview,
        is_staff=is_staff,
    )
    if locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=unlock_hint or "Complete all lessons before this assessment.",
        )

    hist = progress_map.get(lesson.id)

    stream_token = None
    if user and lesson.video_source == VideoSource.UPLOAD and lesson.video_url:
        stream_token = create_stream_token(user_id=user.id, lesson_id=lesson.id)

    resources = [
        {"id": str(r.id), "title": r.title, "file_type": r.file_type}
        for r in db.scalars(select(LessonResource).where(LessonResource.lesson_id == lesson.id)).all()
    ]

    # For students taking a quiz, hide correct answers until they submit (graded client-side then verified).
    quiz_payload = lesson.quiz_json
    if _is_quiz(lesson) and quiz_payload and not is_staff and not preview:
        try:
            import json

            raw = json.loads(quiz_payload)
            safe_qs = []
            for q in raw.get("questions") or []:
                safe_qs.append(
                    {
                        "id": q.get("id"),
                        "prompt": q.get("prompt"),
                        "options": [{"id": o.get("id"), "text": o.get("text")} for o in (q.get("options") or [])],
                    }
                )
            quiz_payload = json.dumps(
                {"passing_score_pct": int(raw.get("passing_score_pct") or 70), "questions": safe_qs}
            )
        except Exception:
            pass

    next_lesson = None
    ordered = sorted(all_lessons, key=lambda l: (l.position, str(l.id)))
    for idx, cand in enumerate(ordered):
        if cand.id == lesson.id and idx + 1 < len(ordered):
            next_lesson = ordered[idx + 1]
            break

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
            "quiz_json": quiz_payload,
            "live_url": lesson.live_url,
            "resources": resources,
            "locked": False,
            "unlock_hint": None,
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

    if _is_quiz(lesson) and payload.completed:
        all_lessons = list(db.scalars(select(Lesson).where(Lesson.course_id == course.id)).all())
        progress_map: dict[UUID, VideoWatchHistory] = {}
        for row in db.scalars(
            select(VideoWatchHistory).where(
                VideoWatchHistory.user_id == user.id,
                VideoWatchHistory.lesson_id.in_([l.id for l in all_lessons]),
            )
        ).all():
            progress_map[row.lesson_id] = row
        locked, unlock_hint = _assessment_unlock_state(
            lesson=lesson,
            all_lessons=all_lessons,
            progress_map=progress_map,
            preview_mode=False,
            is_staff=False,
        )
        if locked:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=unlock_hint or "Assessment locked")
        # Verify score against quiz_json when provided
        if lesson.quiz_json and payload.quiz_score_pct is not None:
            import json

            try:
                raw = json.loads(lesson.quiz_json)
                passing = int(raw.get("passing_score_pct") or 70)
            except Exception:
                passing = 70
            if payload.quiz_score_pct < passing:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Score {payload.quiz_score_pct}% is below the pass mark ({passing}%).",
                )

    row = db.scalar(
        select(VideoWatchHistory).where(
            VideoWatchHistory.user_id == user.id, VideoWatchHistory.lesson_id == lesson.id
        )
    )
    if not row:
        row = VideoWatchHistory(user_id=user.id, lesson_id=lesson.id)
    row.position_seconds = max(0, payload.position_seconds)
    row.watch_time_seconds = max(row.watch_time_seconds, payload.watch_time_seconds)
    row.completed = payload.completed or row.completed
    db.add(row)
    db.flush()

    progress_pct = _recalc_enrollment_progress(db, user.id, course)

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
        progress_pct=progress_pct,
    )


def submit_quiz(
    db: Session,
    user: User,
    *,
    lesson_id: UUID,
    answers: dict[str, str],
) -> dict:
    """Grade assessment answers server-side and mark complete when passing."""
    import json

    lesson = db.get(Lesson, lesson_id)
    if not lesson or not _is_quiz(lesson):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    course = db.get(Course, lesson.course_id)
    if not course or not can_access_lesson(db, user, course, lesson):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot submit assessment")

    all_lessons = list(db.scalars(select(Lesson).where(Lesson.course_id == course.id)).all())
    progress_map: dict[UUID, VideoWatchHistory] = {}
    for row in db.scalars(
        select(VideoWatchHistory).where(
            VideoWatchHistory.user_id == user.id,
            VideoWatchHistory.lesson_id.in_([l.id for l in all_lessons]),
        )
    ).all():
        progress_map[row.lesson_id] = row
    locked, unlock_hint = _assessment_unlock_state(
        lesson=lesson,
        all_lessons=all_lessons,
        progress_map=progress_map,
        preview_mode=False,
        is_staff=user.role == UserRole.ADMIN or course.instructor_id == user.id,
    )
    if locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=unlock_hint or "Assessment locked")

    try:
        raw = json.loads(lesson.quiz_json or "{}")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid assessment data") from exc

    questions = raw.get("questions") or []
    if not questions:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Assessment has no questions")
    passing = int(raw.get("passing_score_pct") or 70)
    correct = 0
    for q in questions:
        qid = str(q.get("id") or "")
        expected = str(q.get("correct_option_id") or "")
        if qid and expected and str(answers.get(qid) or "") == expected:
            correct += 1
    score_pct = round((correct / len(questions)) * 100)
    passed = score_pct >= passing

    if passed:
        row = progress_map.get(lesson.id)
        if not row:
            row = VideoWatchHistory(user_id=user.id, lesson_id=lesson.id)
        row.completed = True
        row.position_seconds = max(row.position_seconds, 1)
        db.add(row)
        db.flush()
        progress_pct = _recalc_enrollment_progress(db, user.id, course)
        db.commit()
    else:
        progress_pct = _recalc_enrollment_progress(db, user.id, course)
        db.commit()

    return {
        "passed": passed,
        "score_pct": score_pct,
        "passing_score_pct": passing,
        "correct": correct,
        "total": len(questions),
        "completed": passed,
        "progress_pct": progress_pct,
    }


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
