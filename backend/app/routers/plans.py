from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import services as svc
from ..database import get_db
from ..models import Membership, Plan
from ..schemas import PlanIn

router = APIRouter(prefix="/api/plans", tags=["plans"])


def _out(plan: Plan, members: int) -> dict:
    return {
        "id": plan.id,
        "name": plan.name,
        "price": plan.price,
        "duration_days": plan.duration_days,
        "members": members,
    }


def _active_counts(db: Session) -> dict[int, int]:
    """Members whose *current* membership (latest end date) is on each plan."""
    out: dict[int, int] = {}
    for m in svc.members_with_relations(db):
        ms = svc.current_membership(m)
        if ms and ms.plan_id and svc.status_of(ms.end_date, svc.today())[0] != "expired":
            out[ms.plan_id] = out.get(ms.plan_id, 0) + 1
    return out


@router.get("")
def list_plans(db: Session = Depends(get_db)):
    counts = _active_counts(db)
    plans = db.scalars(select(Plan).where(Plan.active).order_by(Plan.duration_days)).all()
    return [_out(p, counts.get(p.id, 0)) for p in plans]


@router.post("", status_code=201)
def create_plan(body: PlanIn, db: Session = Depends(get_db)):
    plan = Plan(**body.model_dump())
    db.add(plan)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A plan with this name already exists")
    return _out(plan, 0)


@router.put("/{plan_id}")
def update_plan(plan_id: int, body: PlanIn, db: Session = Depends(get_db)):
    plan = db.get(Plan, plan_id)
    if plan is None or not plan.active:
        raise HTTPException(404, "Plan not found")
    for k, v in body.model_dump().items():
        setattr(plan, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A plan with this name already exists")
    return _out(plan, _active_counts(db).get(plan.id, 0))


@router.delete("/{plan_id}", status_code=204)
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(Plan, plan_id)
    if plan is None:
        raise HTTPException(404, "Plan not found")
    used = db.scalar(select(func.count()).select_from(Membership).where(Membership.plan_id == plan_id))
    if used:
        plan.active = False  # keep history intact, just hide it from new sign-ups
    else:
        db.delete(plan)
    db.commit()
