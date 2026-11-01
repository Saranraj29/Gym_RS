"""SQLite setup. The database file and uploaded member photos live in the
top-level ``DB/`` folder (override with the ``DB_DIR`` environment variable)."""
import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

REPO_ROOT = Path(__file__).resolve().parents[2]
DB_DIR = Path(os.getenv("DB_DIR", REPO_ROOT / "DB")).resolve()
PHOTO_DIR = DB_DIR / "photos"
DB_DIR.mkdir(parents=True, exist_ok=True)
PHOTO_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{DB_DIR / 'gym.db'}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _sqlite_pragmas(dbapi_conn, _record):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.execute("PRAGMA journal_mode=WAL")
    cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
