import calendar
import datetime
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/agentpatch")

# SQLite is single-threaded by default; FastAPI needs concurrent access.
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, future=True, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

Base = declarative_base()


def utc_now() -> datetime.datetime:
    """Timezone-aware UTC now. The single source of truth for ``now()``."""
    return datetime.datetime.now(datetime.timezone.utc)


def aware_utc(dt: datetime.datetime) -> datetime.datetime:
    """Treat a possibly-naive datetime as UTC and return it tz-aware.

    SQLite strips ``tzinfo`` on read even from ``DateTime(timezone=True)``
    columns, so ORM attributes like ``Span.started_at`` come back naive.
    Pair this with ``utc_now()`` writes before doing arithmetic on them.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=datetime.timezone.utc)
    return dt


def utc_ts(dt: datetime.datetime) -> int:
    """Epoch seconds for a naive-UTC or tz-aware datetime.

    PyJWT treats ``iat`` claims as UTC seconds, so JWT mint/verify must use
    this rather than ``dt.timestamp()`` (which interprets naive datetimes as
    local time and was the cause of the original ``ImmatureSignatureError``).
    """
    if dt.tzinfo is None:
        return calendar.timegm(dt.utctimetuple())
    return int(dt.timestamp())


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
