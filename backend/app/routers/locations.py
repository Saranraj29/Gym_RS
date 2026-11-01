from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Location, Member
from ..schemas import LocationIn

router = APIRouter(prefix="/api/locations", tags=["locations"])


def _out(loc: Location, members: int) -> dict:
    return {"id": loc.id, "name": loc.name, "address": loc.address, "phone": loc.phone, "members": members}


def _counts(db: Session) -> dict[int, int]:
    rows = db.execute(select(Member.location_id, func.count()).group_by(Member.location_id)).all()
    return {lid: n for lid, n in rows}


@router.get("")
def list_locations(db: Session = Depends(get_db)):
    counts = _counts(db)
    locs = db.scalars(select(Location).where(Location.active).order_by(Location.id)).all()
    return [_out(l, counts.get(l.id, 0)) for l in locs]


@router.post("", status_code=201)
def create_location(body: LocationIn, db: Session = Depends(get_db)):
    loc = Location(**body.model_dump())
    db.add(loc)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A location with this name already exists")
    return _out(loc, 0)


@router.put("/{location_id}")
def update_location(location_id: int, body: LocationIn, db: Session = Depends(get_db)):
    loc = db.get(Location, location_id)
    if loc is None or not loc.active:
        raise HTTPException(404, "Location not found")
    for k, v in body.model_dump().items():
        setattr(loc, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A location with this name already exists")
    return _out(loc, _counts(db).get(loc.id, 0))


@router.delete("/{location_id}", status_code=204)
def delete_location(location_id: int, db: Session = Depends(get_db)):
    loc = db.get(Location, location_id)
    if loc is None:
        raise HTTPException(404, "Location not found")
    n = _counts(db).get(location_id, 0)
    if n:
        raise HTTPException(409, f"Move its {n} member{'s' if n != 1 else ''} to another location first")
    if db.scalar(select(func.count()).select_from(Location).where(Location.active)) <= 1:
        raise HTTPException(409, "You need at least one location")
    db.delete(loc)
    db.commit()
