"""Database Engine and Session Configuration (Part 6).

Supports:
- PostgreSQL (Supabase) via DATABASE_URL
- SQLite for local development and lightning-fast test isolation
- Thread-safe connection handling and session dependency
"""

import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import settings

# Determine database engine URL and connect arguments
db_url = settings.DATABASE_URL or "sqlite:///./tatvik.db"

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Create SQLAlchemy engine
engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative Base
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes database tables."""
    # Import all models to register with Base.metadata
    from app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
