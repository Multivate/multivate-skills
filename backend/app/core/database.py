import logging
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings

settings = get_settings()
_url = settings.database_url
_connect_args: dict = {}
_engine_kw: dict = {}
if _url.startswith("sqlite"):
    _connect_args["check_same_thread"] = False
    if ":memory:" in _url:
        # One shared in-memory DB across connections (tests + create_all + requests).
        _engine_kw["poolclass"] = StaticPool

engine = create_engine(
    _url,
    pool_pre_ping=not _url.startswith("sqlite"),
    connect_args=_connect_args,
    echo=False,
    **_engine_kw,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

_logger = logging.getLogger(__name__)


def apply_sqlite_schema_patches() -> None:
    """`create_all()` never ALTERs existing SQLite tables — recover common local drift safely.

    Production/staging should use Alembic (or equivalent); this only targets file-backed SQLite.
    """
    if not _url.startswith("sqlite") or ":memory:" in _url:
        return
    try:
        with engine.begin() as conn:
            rows = conn.execute(text("PRAGMA table_info(courses)")).fetchall()
            col_names = {r[1] for r in rows}
            if col_names and "instructor_id" not in col_names:
                _logger.warning(
                    "SQLite: courses.instructor_id missing — applying ALTER TABLE. "
                    "Prefer proper migrations for non-dev databases."
                )
                conn.execute(text("ALTER TABLE courses ADD COLUMN instructor_id TEXT"))
    except OSError as exc:
        _logger.error("SQLite schema patch skipped (database file issue): %s", exc)
    except Exception as exc:
        _logger.error("SQLite schema patch failed: %s", exc)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
