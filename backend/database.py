import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import settings
import logging

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
connect_args = {}

try:
    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        engine = create_engine(db_url, connect_args=connect_args)
    else:
        engine = create_engine(db_url, connect_args=connect_args, pool_size=20, max_overflow=10)
    # Test connection
    conn = engine.connect()
    conn.close()
except Exception as e:
    logger.warning(f"Failed to connect to primary database {db_url}: {e}. Falling back to SQLite local db.")
    db_url = "sqlite:///./discoveryos.db"
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all database tables on startup if not present
try:
    from models import Base
    Base.metadata.create_all(bind=engine)
    
    # Simple migration: add owner_id column if not present
    from sqlalchemy import text
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE workspaces ADD COLUMN owner_id VARCHAR(36);"))
        except Exception:
            pass  # Already exists or database handles it
except Exception as e:
    logger.error(f"Error creating database tables: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
