from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.core.logging import configure_logging
from app.core.schema_patches import apply_schema_patches
from app.middleware.request_id import RequestIdMiddleware
from app.models.certificate import Certificate  # noqa: F401
from app.models.course import Course  # noqa: F401
from app.models.course_audit_log import CourseAuditLog  # noqa: F401
from app.models.course_section import CourseSection  # noqa: F401
from app.models.lesson_resource import LessonResource  # noqa: F401
from app.models.video_watch_history import VideoWatchHistory  # noqa: F401
from app.models.course_review import CourseReview  # noqa: F401
from app.models.enrollment import Enrollment  # noqa: F401
from app.models.inbox_message import InboxMessage  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.lesson import Lesson  # noqa: F401
from app.models.mfa_otp_challenge import MfaOtpChallenge  # noqa: F401
from app.models.payment import Payment  # noqa: F401
from app.models.payment_audit_log import PaymentAuditLog  # noqa: F401
from app.models.instructor_teaching_profile import InstructorTeachingProfile  # noqa: F401
from app.models.student_learning_profile import StudentLearningProfile  # noqa: F401
from app.models.user import User  # noqa: F401

logger = logging.getLogger(__name__)
_settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging(_settings.log_level)
    try:
        if _settings.auto_create_tables:
            Base.metadata.create_all(bind=engine)
            logger.info("Schema bootstrap: create_all() finished.")
        apply_schema_patches(engine, database_url=_settings.database_url)
    except OperationalError as exc:
        if _settings.auto_create_tables:
            dbu = _settings.database_url
            hint = (
                "Cannot reach the database. Start PostgreSQL (e.g. `docker compose up -d db` from the repo root) "
                "or your local instance, create the database if needed (see database/pgadmin/), and verify "
                "DATABASE_URL in backend/.env."
            )
            logger.error("%s URL=%s … %s", hint, dbu.split("@")[-1] if "@" in dbu else dbu[:48], exc)
            raise RuntimeError(
                "Database unreachable during startup (create_all). See log above for DATABASE_URL tail and fix."
            ) from exc
        raise
    if not _settings.auto_create_tables:
        logger.info("Schema bootstrap: create_all skipped (AUTO_CREATE_TABLES=false); patches applied.")

    db = SessionLocal()
    try:
        from app.services.admin_bootstrap import ensure_platform_admin

        outcome = ensure_platform_admin(db, sync_password=False)
        logger.info("Platform admin bootstrap: %s", outcome)
    except Exception:
        logger.exception("Platform admin bootstrap failed (API will still start).")
    finally:
        db.close()

    yield


def _cors_origins() -> list[str]:
    return [o.strip() for o in _settings.cors_origins.split(",") if o.strip()]


app = FastAPI(title="Multivate API", version="1.0.0", lifespan=lifespan)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    rid = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "message": "Request validation failed",
            "request_id": rid,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Preserve Starlette/FastAPI HTTPException responses (subclass check must use Starlette base)."""
    rid = getattr(request.state, "request_id", None)
    if isinstance(exc, StarletteHTTPException):
        detail: Any = exc.detail
        hdrs = getattr(exc, "headers", None)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": detail, "request_id": rid},
            headers=dict(hdrs) if hdrs else None,
        )

    logger.exception("Unhandled server error", extra={"request_id": rid})
    if _settings.environment == "development":
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Internal server error",
                "request_id": rid,
                "debug": repr(exc),
            },
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "request_id": rid},
    )


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness: process is running (use for load balancers that only need a cheap check)."""
    return {"status": "ok"}


@app.get("/health/ready")
def readiness(response: Response) -> dict[str, Any]:
    """Readiness: verify database connectivity and critical auth schema."""
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("Readiness check failed: %s", exc)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "database": "unavailable"}
    finally:
        db.close()
    return {"status": "ready", "database": "ok", "schema": "ok"}
