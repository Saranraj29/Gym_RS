from datetime import date, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import services as svc
from ..database import get_db
from ..models import Member
from ..schemas import MemberCreate, MemberUpdate, PaymentCreate, RenewRequest

router = APIRouter(prefix="/api/members", tags=["members"])

SORTS = {
    "joined": (lambda m: (m["joined_on"], m["id"]), True),
    "name": (lambda m: m["name"].lower(), False),
    "ends": (lambda m: (m["end_date"] or date.min, m["id"]), False),
    "balance": (lambda m: m["balance"], True),
}


def member_detail(member: Member) -> dict:
    now = svc.today()
    out = svc.member_summary(member, now)
    ms = svc.current_membership(member)
    out.update(
        dob=member.dob,
        batch=member.batch,
        trainer=member.trainer,
        emergency_name=member.emergency_name,
        emergency_phone=member.emergency_phone,
        notes=member.notes,
    )
    if ms:
        total_days = (ms.end_date - ms.start_date).days + 1
        used = max(0, min(total_days, (now - ms.start_date).days + 1))
        paid_for = sum(p.amount for p in member.payments if p.membership_id == ms.id)
        out["current_membership"] = {
            "id": ms.id,
            "plan_name": ms.plan_name,
            "start_date": ms.start_date,
            "end_date": ms.end_date,
            "fee": ms.fee,
            "paid": paid_for,
            "total_days": total_days,
            "days_used": used,
        }
    else:
        out["current_membership"] = None
    names = {m.id: m for m in member.memberships}
    out["payments"] = [
        {
            "id": p.id,
            "paid_on": p.paid_on,
            "amount": p.amount,
            "mode": p.mode,
            "receipt": f"#R-{p.id:04d}",
            "period_start": names[p.membership_id].start_date if p.membership_id in names else None,
            "period_end": names[p.membership_id].end_date if p.membership_id in names else None,
            "plan_name": names[p.membership_id].plan_name if p.membership_id in names else None,
        }
        for p in sorted(member.payments, key=lambda p: (p.paid_on, p.id), reverse=True)
    ]
    out["reminders"] = [
        {"id": r.id, "kind": r.kind, "channel": r.channel, "sent_on": r.sent_on, "lang": r.lang}
        for r in sorted(member.reminders, key=lambda r: (r.sent_on, r.id), reverse=True)
    ][:20]
    return out


@router.get("")
def list_members(
    q: str = "",
    status: str = Query("all", pattern="^(all|active|due|expired|pending)$"),
    plan: str = "all",
    sort: str = Query("joined", pattern="^(joined|name|ends|balance)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    now = svc.today()
    rows = [svc.member_summary(m, now) for m in svc.members_with_relations(db)]
    counts = {
        "all": len(rows),
        "active": sum(r["status"] == "active" for r in rows),
        "due": sum(r["status"] == "due" for r in rows),
        "expired": sum(r["status"] == "expired" for r in rows),
        "pending": sum(r["balance"] > 0 for r in rows),
    }
    needle = q.strip().lower()
    # Only treat the query as a phone number when it is made of digits (and separators).
    digits = "".join(ch for ch in needle if ch.isdigit()) if needle.replace(" ", "").replace("+", "").replace("-", "").isdigit() else ""

    def keep(r: dict) -> bool:
        if needle:
            hit = needle in r["name"].lower() or needle in r["code"].lower() or (digits and digits in r["phone"])
            if not hit:
                return False
        if plan != "all" and r["plan_name"] != plan:
            return False
        if status == "pending":
            return r["balance"] > 0
        return status == "all" or r["status"] == status

    rows = [r for r in rows if keep(r)]
    key, reverse = SORTS[sort]
    rows.sort(key=key, reverse=reverse)
    total = len(rows)
    start = (page - 1) * page_size
    return {
        "items": rows[start : start + page_size],
        "total": total,
        "page": page,
        "page_size": page_size,
        "counts": counts,
    }


@router.post("", status_code=201)
def create_member(body: MemberCreate, db: Session = Depends(get_db)):
    plan = svc.get_active_plan(db, body.plan_id)
    joined = body.join_date or svc.today()
    member = Member(
        **body.model_dump(exclude={"plan_id", "join_date", "paid_amount", "payment_mode"}),
        joined_on=joined,
    )
    db.add(member)
    db.flush()
    ms = svc.add_membership(db, member, plan, joined)
    if body.paid_amount > 0:
        svc.add_payment(db, member, min(body.paid_amount, plan.price), body.payment_mode, joined, ms)
    db.commit()
    return member_detail(svc.load_member(db, member.id))


@router.get("/{member_id}")
def get_member(member_id: int, db: Session = Depends(get_db)):
    return member_detail(svc.load_member(db, member_id))


@router.put("/{member_id}")
def update_member(member_id: int, body: MemberUpdate, db: Session = Depends(get_db)):
    member = svc.load_member(db, member_id)
    for key, value in body.model_dump().items():
        setattr(member, key, value)
    db.commit()
    return member_detail(svc.load_member(db, member_id))


@router.delete("/{member_id}", status_code=204)
def delete_member(member_id: int, db: Session = Depends(get_db)):
    member = svc.load_member(db, member_id)
    svc.remove_photo_file(member.photo)
    db.delete(member)
    db.commit()


@router.post("/{member_id}/photo")
def upload_photo(member_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    member = svc.load_member(db, member_id)
    member.photo = svc.save_photo(member, file)
    db.commit()
    return {"photo_url": svc.photo_url(member)}


@router.delete("/{member_id}/photo", status_code=204)
def delete_photo(member_id: int, db: Session = Depends(get_db)):
    member = svc.load_member(db, member_id)
    svc.remove_photo_file(member.photo)
    member.photo = None
    db.commit()


@router.post("/{member_id}/payments", status_code=201)
def record_payment(member_id: int, body: PaymentCreate, db: Session = Depends(get_db)):
    member = svc.load_member(db, member_id)
    _, _, balance = svc.money(member)
    if balance <= 0:
        raise HTTPException(409, "This member has no pending balance")
    if body.amount > balance:
        raise HTTPException(422, f"Amount is more than the pending balance (₹{balance})")
    # Settle the oldest membership that still owes money first.
    paid_by_ms: dict[int, int] = {}
    for p in member.payments:
        if p.membership_id:
            paid_by_ms[p.membership_id] = paid_by_ms.get(p.membership_id, 0) + p.amount
    target = next(
        (m for m in member.memberships if m.fee - paid_by_ms.get(m.id, 0) > 0),
        svc.current_membership(member),
    )
    pay = svc.add_payment(db, member, body.amount, body.mode, body.paid_on or svc.today(), target)
    db.commit()
    return {"receipt": f"#R-{pay.id:04d}", "member": member_detail(svc.load_member(db, member_id))}


@router.post("/{member_id}/renew", status_code=201)
def renew(member_id: int, body: RenewRequest, db: Session = Depends(get_db)):
    member = svc.load_member(db, member_id)
    plan = svc.get_active_plan(db, body.plan_id)
    now = svc.today()
    current = svc.current_membership(member)
    start = body.start_date
    if start is None:
        # Renewing early continues straight after the current period.
        start = current.end_date + timedelta(days=1) if current and current.end_date >= now else now
    ms = svc.add_membership(db, member, plan, start)
    if body.paid_amount > 0:
        svc.add_payment(db, member, min(body.paid_amount, plan.price), body.mode, now, ms)
    db.commit()
    return member_detail(svc.load_member(db, member_id))
