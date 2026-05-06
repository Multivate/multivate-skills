from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import Base, SessionLocal, apply_sqlite_schema_patches, engine
from app.core.logging import configure_logging
from app.middleware.request_id import RequestIdMiddleware
from app.models.course import Course  # noqa: F401 — register ORM metadata
from app.models.enrollment import Enrollment  # noqa: F401
from app.models.lesson import Lesson  # noqa: F401
from app.models.payment import Payment  # noqa: F401
from app.models.user import User  # noqa: F401

logger = logging.getLogger(__name__)
_settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging(_settings.log_level)
    if _settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
        apply_sqlite_schema_patches()
        logger.info("Schema bootstrap: create_all() finished (development mode).")
    else:
        logger.info("Schema bootstrap skipped (AUTO_CREATE_TABLES=false).")
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
    """Never swallow HTTPException — preserve status codes for API clients."""
    rid = getattr(request.state, "request_id", None)
    if isinstance(exc, HTTPException):
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
    """Readiness: verify database connectivity before receiving traffic."""
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("Readiness check failed: %s", exc)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "database": "unavailable"}
    finally:
        db.close()
    return {"status": "ready", "database": "ok"}
