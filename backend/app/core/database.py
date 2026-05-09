from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()
_url = settings.database_url
# Render and some hosts still emit postgres://; SQLAlchemy expects postgresql:// for the psycopg2 dialect.
if _url.startswith("postgres://"):
    _url = "postgresql://" + _url.removeprefix("postgres://")

engine = create_engine(
    _url,
    pool_pre_ping=True,
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
