from collections import defaultdict
from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import services as svc
from ..database import get_db
from ..models import Payment

router = APIRouter(prefix="/api/fees", tags=["fees"])


@router.get("")
def pending_fees(db: Session = Depends(get_db)):
    now = svc.today()
    items = []
    for m in svc.members_with_relations(db):
        s = svc.member_summary(m, now)
        if s["balance"] <= 0:
            continue
        # "Since": when the oldest unpaid membership started.
        paid_by_ms: dict[int, int] = defaultdict(int)
        for p in m.payments:
            if p.membership_id:
                paid_by_ms[p.membership_id] += p.amount
        unpaid = [ms for ms in m.memberships if ms.fee - paid_by_ms[ms.id] > 0]
        s["since"] = min((ms.start_date for ms in unpaid), default=s["start_date"])
        items.append(s)
    items.sort(key=lambda r: r["balance"], reverse=True)

    recent_pay = db.scalars(select(Payment).where(Payment.paid_on >= now - timedelta(days=29))).all()
    collected = sum(p.amount for p in recent_pay)
    by_mode: dict[str, int] = defaultdict(int)
    for p in recent_pay:
        by_mode[p.mode] += p.amount
    return {
        "summary": {
            "total_pending": sum(i["balance"] for i in items),
            "pending_count": len(items),
            "part_paid_count": sum(1 for i in items if i["paid"] > 0),
            "collected_30d": collected,
            "by_mode": dict(by_mode),
        },
        "items": items,
    }


@router.get("/recent")
def recent_payments(limit: int = 8, db: Session = Depends(get_db)):
    rows = db.scalars(select(Payment).order_by(Payment.paid_on.desc(), Payment.id.desc()).limit(limit)).all()
    return [
        {
            "id": p.id,
            "receipt": f"#R-{p.id:04d}",
            "member_id": p.member_id,
            "member_name": p.member.name,
            "amount": p.amount,
            "mode": p.mode,
            "paid_on": p.paid_on,
        }
        for p in rows
    ]
