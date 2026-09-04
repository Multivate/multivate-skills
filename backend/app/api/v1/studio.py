from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import UserRole
from app.models.user import User
from app.schemas.studio import (
    AdminCourseRejectIn,
    AudioPhraseIn,
    AudioPhraseOut,
    AudioPhraseReorderIn,
    AudioPhraseUpdateIn,
    CourseStudioAnalyticsOut,
    CourseStudioBasicsIn,
    CourseStudioBasicsOut,
    CourseStudioDetailOut,
    CoverImageUrlIn,
    LessonReorderIn,
    LessonResourceOut,
    LessonStudioIn,
    LessonStudioOut,
    PlayerCurriculumOut,
    PlayerPhrasebookOut,
    PlayerProgressIn,
    PlayerProgressOut,
    ReorderSectionsIn,
    SectionCreateIn,
    SectionOut,
    SectionUpdateIn,
    StreamTokenOut,
    StudioCourseListItem,
    StudioLessonUpdateIn,
)
from app.services import course_studio_service, player_service
from app.services.media_storage_service import resolve_storage_path

router = APIRouter(prefix="/studio", tags=["studio"])
player_router = APIRouter(prefix="/player", tags=["player"])
media_router = APIRouter(prefix="/media", tags=["media"])


@router.get("/courses", response_model=list[StudioCourseListItem])
def list_my_courses(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> list[StudioCourseListItem]:
    instructor_id = user.id
    return course_studio_service.list_instructor_studio_courses(db, instructor_id)


@router.post("/courses", response_model=CourseStudioBasicsOut, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseStudioBasicsIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> CourseStudioBasicsOut:
    return course_studio_service.create_studio_course(db, payload, user)


@router.get("/courses/{slug}", response_model=CourseStudioDetailOut)
def get_course(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> CourseStudioDetailOut:
    return course_studio_service.get_studio_course(db, slug, user)


@router.patch("/courses/{slug}", response_model=CourseStudioBasicsOut)
def update_basics(
    slug: str,
    payload: CourseStudioBasicsIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> CourseStudioBasicsOut:
    return course_studio_service.update_studio_basics(db, slug, payload, user)


@router.delete("/courses/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> None:
    course_studio_service.delete_studio_course(db, slug, user)


@router.post("/courses/{slug}/thumbnail", response_model=CourseStudioBasicsOut)
async def upload_thumbnail(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
    file: UploadFile = File(...),
) -> CourseStudioBasicsOut:
    return await course_studio_service.upload_thumbnail(db, slug, file, user)


@router.put("/courses/{slug}/cover-url", response_model=CourseStudioBasicsOut)
def set_cover_url(
    slug: str,
    payload: CoverImageUrlIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> CourseStudioBasicsOut:
    return course_studio_service.set_cover_image_url(db, slug, payload.image_url, user)


@router.post("/courses/{slug}/sections", response_model=SectionOut, status_code=status.HTTP_201_CREATED)
def add_section(
    slug: str,
    payload: SectionCreateIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> SectionOut:
    return course_studio_service.create_section(db, slug, payload, user)


@router.patch("/sections/{section_id}", response_model=SectionOut)
def patch_section(
    section_id: UUID,
    payload: SectionUpdateIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> SectionOut:
    return course_studio_service.update_section(db, section_id, payload, user)


@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_section(
    section_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> None:
    course_studio_service.delete_section(db, section_id, user)


@router.put("/courses/{slug}/sections/reorder", response_model=list[SectionOut])
def reorder_sections(
    slug: str,
    payload: ReorderSectionsIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> list[SectionOut]:
    return course_studio_service.reorder_sections(db, slug, payload, user)


@router.post("/courses/{slug}/lessons", response_model=LessonStudioOut, status_code=status.HTTP_201_CREATED)
def add_lesson(
    slug: str,
    payload: LessonStudioIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> LessonStudioOut:
    return course_studio_service.create_lesson(db, slug, payload, user)


@router.patch("/lessons/{lesson_id}", response_model=LessonStudioOut)
def patch_lesson(
    lesson_id: UUID,
    payload: StudioLessonUpdateIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> LessonStudioOut:
    return course_studio_service.update_lesson(db, lesson_id, payload, user)


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_lesson(
    lesson_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> None:
    course_studio_service.delete_lesson(db, lesson_id, user)


@router.put("/courses/{slug}/lessons/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_lessons(
    slug: str,
    payload: LessonReorderIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> None:
    course_studio_service.reorder_lessons(db, slug, payload, user)


@router.post("/lessons/{lesson_id}/video", response_model=LessonStudioOut)
async def upload_video(
    lesson_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
    file: UploadFile = File(...),
) -> LessonStudioOut:
    return await course_studio_service.upload_lesson_video(db, lesson_id, file, user)


@router.post("/lessons/{lesson_id}/resources", response_model=LessonResourceOut)
async def upload_resource(
    lesson_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
    file: UploadFile = File(...),
    title: str = Form(""),
) -> LessonResourceOut:
    return await course_studio_service.upload_lesson_resource(db, lesson_id, title, file, user)


@router.post("/courses/{slug}/submit", response_model=CourseStudioBasicsOut)
def submit_for_review(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> CourseStudioBasicsOut:
    return course_studio_service.submit_for_review(db, slug, user)


@router.get("/courses/{slug}/analytics", response_model=CourseStudioAnalyticsOut)
def course_analytics(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> CourseStudioAnalyticsOut:
    return course_studio_service.studio_analytics(db, slug, user)


@router.post("/courses/{slug}/phrases", response_model=AudioPhraseOut, status_code=status.HTTP_201_CREATED)
def add_phrase(
    slug: str,
    payload: AudioPhraseIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> AudioPhraseOut:
    return course_studio_service.create_audio_phrase(db, slug, payload, user)


@router.patch("/phrases/{phrase_id}", response_model=AudioPhraseOut)
def patch_phrase(
    phrase_id: UUID,
    payload: AudioPhraseUpdateIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> AudioPhraseOut:
    return course_studio_service.update_audio_phrase(db, phrase_id, payload, user)


@router.delete("/phrases/{phrase_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_phrase(
    phrase_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> None:
    course_studio_service.delete_audio_phrase(db, phrase_id, user)


@router.put("/courses/{slug}/phrases/reorder", response_model=list[AudioPhraseOut])
def reorder_phrases(
    slug: str,
    payload: AudioPhraseReorderIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> list[AudioPhraseOut]:
    return course_studio_service.reorder_audio_phrases(db, slug, payload, user)


@router.post("/phrases/{phrase_id}/audio", response_model=AudioPhraseOut)
async def upload_phrase_audio(
    phrase_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
    file: UploadFile = File(...),
) -> AudioPhraseOut:
    return await course_studio_service.upload_phrase_audio(db, phrase_id, file, user)


@player_router.get("/{slug}/curriculum", response_model=PlayerCurriculumOut)
def player_curriculum(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    preview: bool = Query(False),
) -> PlayerCurriculumOut:
    return player_service.get_player_curriculum(db, slug, user, preview=preview)


@player_router.get("/{slug}/phrasebook", response_model=PlayerPhrasebookOut)
def player_phrasebook(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    preview: bool = Query(False),
) -> PlayerPhrasebookOut:
    return player_service.get_player_phrasebook(db, slug, user, preview=preview)


@player_router.get("/{slug}/lessons/{lesson_id}")
def player_lesson(
    slug: str,
    lesson_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    preview: bool = Query(False),
) -> dict:
    return player_service.get_player_lesson(db, slug, lesson_id, user, preview=preview)


@player_router.post("/progress", response_model=PlayerProgressOut)
def save_progress(
    payload: PlayerProgressIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> PlayerProgressOut:
    return player_service.save_progress(db, user, payload)


@player_router.get("/stream/{lesson_id}/token", response_model=StreamTokenOut)
def stream_token(
    lesson_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> StreamTokenOut:
    return player_service.issue_stream_token(db, lesson_id, user)


@media_router.get("/stream")
def stream_video(token: str, db: Annotated[Session, Depends(get_db)]) -> FileResponse:
    path, media_type = player_service.resolve_stream_file(db, token)
    return FileResponse(
        path,
        media_type=media_type,
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Accept-Ranges": "bytes",
        },
    )


@media_router.get("/public/{storage_path:path}")
def public_media(storage_path: str) -> FileResponse:
    path = resolve_storage_path(storage_path)
    suffix = path.suffix.lower()
    media_type = "image/jpeg"
    if suffix == ".png":
        media_type = "image/png"
    elif suffix == ".webp":
        media_type = "image/webp"
    elif suffix == ".mp3":
        media_type = "audio/mpeg"
    elif suffix == ".wav":
        media_type = "audio/wav"
    elif suffix == ".ogg":
        media_type = "audio/ogg"
    elif suffix == ".m4a":
        media_type = "audio/mp4"
    elif suffix == ".aac":
        media_type = "audio/aac"
    elif suffix == ".webm":
        media_type = "audio/webm"
    return FileResponse(path, media_type=media_type)
