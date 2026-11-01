from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import services as svc
from ..database import get_db
from ..models import Member, ReminderLog
from ..schemas import ReminderLogIn

router = APIRouter(prefix="/api/reminders", tags=["reminders"])

TEMPLATES = {
    "en": {
        "renewal": (
            "Hi {name}, your {plan} membership at {gym} ends on {date}.\n"
            "Renew before then to keep training without a break.\n"
            "Reply here or visit the front desk to renew."
        ),
        "fee": (
            "Hi {name}, a balance of ₹{amount} is pending for your {plan} plan at {gym}.\n"
            "Please pay at the desk or by UPI.\nThank you!"
        ),
        "expired": (
            "Hi {name}, your {plan} membership at {gym} ended on {date}.\n"
            "We miss you! Renew this week and get back on track."
        ),
        "welcome": (
            "Welcome to {gym}, {name}! 💪\nYour {plan} membership is active till {date}.\n"
            "See you at the gym!"
        ),
        "receipt": "Hi {name}, we received ₹{amount} for your {plan} plan at {gym}. Thank you!",
    },
    "ta": {
        "renewal": (
            "வணக்கம் {name}, {gym}-ல் உங்கள் {plan} உறுப்பினர் காலம் {date} அன்று முடிகிறது.\n"
            "இடைவெளி இல்லாமல் பயிற்சியைத் தொடர, அதற்கு முன் புதுப்பித்துக் கொள்ளுங்கள்."
        ),
        "fee": (
            "வணக்கம் {name}, உங்கள் {plan} திட்டத்திற்கு ₹{amount} நிலுவையில் உள்ளது.\n"
            "தயவுசெய்து கவுண்டரில் அல்லது UPI மூலம் செலுத்தவும். நன்றி!"
        ),
        "expired": (
            "வணக்கம் {name}, {gym}-ல் உங்கள் {plan} உறுப்பினர் காலம் {date} அன்று முடிந்தது.\n"
            "இந்த வாரம் புதுப்பித்து மீண்டும் பயிற்சியைத் தொடங்குங்கள்!"
        ),
        "welcome": (
            "{gym}-க்கு வரவேற்கிறோம் {name}! 💪\nஉங்கள் {plan} உறுப்பினர் காலம் {date} வரை உள்ளது."
        ),
        "receipt": "வணக்கம் {name}, உங்கள் {plan} திட்டத்திற்கு ₹{amount} பெற்றோம். நன்றி!",
    },
}

LABELS = {
    "renewal": "Renewal due",
    "fee": "Fee pending",
    "expired": "Expired",
    "welcome": "Welcome",
    "receipt": "Receipt",
}


def _fmt_date(d) -> str:
    return f"{d.day} {d.strftime('%b')}" if d else ""


@router.get("/templates")
def templates():
    return TEMPLATES


@router.get("/audience")
def audience(kind: str = Query(pattern="^(renewal|fee|expired)$"), location_id: int | None = None, db: Session = Depends(get_db)):
    now = svc.today()
    settings = svc.get_settings(db)
    people = []
    for m in svc.members_with_relations(db):
        s = svc.member_summary(m, now)
        if location_id is not None and s["location_id"] != location_id:
            continue
        if kind == "renewal" and s["status"] != "due":
            continue
        if kind == "expired" and s["status"] != "expired":
            continue
        if kind == "fee" and s["balance"] <= 0:
            continue
        if kind == "renewal":
            tag = "Today" if s["days_left"] == 0 else f"{s['days_left']} day{'s' if s['days_left'] != 1 else ''}"
        elif kind == "fee":
            tag = f"₹{s['balance']:,}"
        else:
            tag = "Expired"
        people.append(
            {
                "id": s["id"],
                "name": s["name"],
                "phone": s["phone"],
                "photo_url": s["photo_url"],
                "location": s["location_name"],
                "inactive": s["status"] == "inactive",
                "plan": s["plan_name"] or "",
                "date": _fmt_date(s["end_date"]),
                "amount": f"{s['balance']:,}",
                "tag": tag,
                "sort": s["days_left"] if kind != "fee" else -s["balance"],
            }
        )
    people.sort(key=lambda p: (p["sort"] is None, p["sort"]))
    return {
        "kind": kind,
        "gym_name": settings["gym_name"],
        "country_code": settings["country_code"],
        "members": people,
    }


@router.post("/log", status_code=201)
def log_reminders(body: ReminderLogIn, db: Session = Depends(get_db)):
    found = set(db.scalars(select(Member.id).where(Member.id.in_(body.member_ids))))
    if not found:
        raise HTTPException(404, "No matching members")
    now = svc.today()
    for mid in found:
        db.add(ReminderLog(member_id=mid, kind=body.kind, lang=body.lang, sent_on=now, message=body.message))
    db.commit()
    return {"logged": len(found)}


@router.get("/history")
def history(limit: int = 12, location_id: int | None = None, db: Session = Depends(get_db)):
    logs = db.scalars(
        select(ReminderLog)
        .options(selectinload(ReminderLog.member).selectinload(Member.payments))
        .order_by(ReminderLog.sent_on.desc(), ReminderLog.id.desc())
    ).all()
    groups: dict[tuple, dict] = {}
    for log in logs:
        if location_id is not None and log.member.location_id != location_id:
            continue
        key = (log.sent_on, log.kind)
        g = groups.setdefault(key, {"date": log.sent_on, "kind": log.kind, "label": LABELS.get(log.kind, log.kind), "sent": 0, "paid_after": 0})
        g["sent"] += 1
        if any(p.paid_on >= log.sent_on for p in log.member.payments):
            g["paid_after"] += 1
    return sorted(groups.values(), key=lambda g: g["date"], reverse=True)[:limit]
