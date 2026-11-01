from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import services as svc
from ..database import get_db
from ..models import Location, Payment

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _shift_month(d: date, delta: int) -> date:
    idx = d.year * 12 + (d.month - 1) + delta
    return date(idx // 12, idx % 12 + 1, 1)


@router.get("")
def dashboard(location_id: int | None = None, db: Session = Depends(get_db)):
    now = svc.today()
    members = svc.members_with_relations(db)
    all_rows = [svc.member_summary(m, now) for m in members]
    rows = all_rows if location_id is None else [r for r in all_rows if r["location_id"] == location_id]
    member_ids = {r["id"] for r in rows}
    this_month = now.replace(day=1)

    due = sorted((r for r in rows if r["status"] == "due"), key=lambda r: r["days_left"])
    pending = sorted((r for r in rows if r["balance"] > 0), key=lambda r: r["balance"], reverse=True)

    payments = [p for p in db.scalars(select(Payment).where(Payment.paid_on >= _shift_month(this_month, -5))).all() if p.member_id in member_ids]
    series: dict[date, int] = defaultdict(int)
    for p in payments:
        series[p.paid_on.replace(day=1)] += p.amount
    joined: dict[date, int] = defaultdict(int)
    for r in rows:
        joined[r["joined_on"].replace(day=1)] += 1
    revenue = []
    for i in range(-5, 1):
        month = _shift_month(this_month, i)
        revenue.append({"month": MONTHS[month.month - 1], "collected": series[month], "joined": joined[month]})

    plan_counts: dict[str, int] = defaultdict(int)
    for r in rows:
        if r["status"] in ("active", "due") and r["plan_name"]:
            plan_counts[r["plan_name"]] += 1

    win_start = now - timedelta(days=29)
    prev_start = now - timedelta(days=59)
    last30 = [p for p in db.scalars(select(Payment).where(Payment.paid_on >= prev_start)).all() if p.member_id in member_ids]
    collected_30d = sum(p.amount for p in last30 if p.paid_on >= win_start)
    collected_prev_30d = sum(p.amount for p in last30 if p.paid_on < win_start)

    recent = sorted(rows, key=lambda r: (r["joined_on"], r["id"]), reverse=True)[:6]
    live = [r for r in rows if r["status"] in ("active", "due")]
    by_location = []
    for loc in db.scalars(select(Location).where(Location.active).order_by(Location.id)):
        lr = [r for r in all_rows if r["location_id"] == loc.id]
        by_location.append(
            {
                "id": loc.id,
                "name": loc.name,
                "live": sum(r["status"] in ("active", "due") for r in lr),
                "due": sum(r["status"] == "due" for r in lr),
                "inactive": sum(r["status"] == "inactive" for r in lr),
                "pending_total": sum(r["balance"] for r in lr),
            }
        )
    return {
        "today": now,
        "stats": {
            "active_members": len(live),
            "joined_30d": sum(1 for r in rows if r["joined_on"] >= win_start),
            "due_7_days": len(due),
            "first_due": due[0]["end_date"] if due else None,
            "expired": sum(r["status"] == "expired" for r in rows),
            "inactive": sum(r["status"] == "inactive" for r in rows),
            "lapsed": sum(r["lapsed"] for r in rows),
            "pending_total": sum(r["balance"] for r in pending),
            "pending_count": len(pending),
            "collected_30d": collected_30d,
            "collected_prev_30d": collected_prev_30d,
            "total_members": len(rows),
        },
        "revenue": revenue,
        "locations": by_location,
        "plans": sorted(
            ({"name": k, "count": v} for k, v in plan_counts.items()), key=lambda x: -x["count"]
        ),
        "renewals_due": due[:6],
        "pending_top": pending[:5],
        "recent_members": recent,
    }
