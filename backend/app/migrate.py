"""Tiny forward-only migration so databases created by an earlier version keep working."""
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from .models import Location, Member

NEW_MEMBER_COLUMNS = [
    ("location_id", "INTEGER REFERENCES locations(id) ON DELETE SET NULL"),
    ("inactive", "BOOLEAN NOT NULL DEFAULT 0"),
    ("inactive_on", "DATE"),
    ("inactive_reason", "VARCHAR(60)"),
]


def add_missing_columns(engine: Engine) -> None:
    with engine.begin() as conn:
        existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(members)")}
        for name, ddl in NEW_MEMBER_COLUMNS:
            if existing and name not in existing:
                conn.exec_driver_sql(f"ALTER TABLE members ADD COLUMN {name} {ddl}")


def ensure_locations(db: Session) -> None:
    """Gym has two locations by default (rename them in Plans & settings). Orphan members go to the first."""
    if not db.scalars(select(Location)).first():
        db.add_all([Location(name="Location 1"), Location(name="Location 2")])
        db.flush()
    first = db.scalars(select(Location).order_by(Location.id)).first()
    for m in db.scalars(select(Member).where(Member.location_id.is_(None))):
        m.location_id = first.id
    db.commit()
