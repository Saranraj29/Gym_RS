"""Business rules shared by the routers: membership status, balances, settings, photos."""
import json
import secrets
from datetime import date, timedelta
from io import BytesIO

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .database import PHOTO_DIR
from .models import Location, Member, MemberEvent, Membership, Payment, Plan, Setting

DUE_WINDOW_DAYS = 7
LAPSED_DAYS = 60  # expired this long ago and never renewed -> suggest marking inactive
MAX_PHOTO_BYTES = 8 * 1024 * 1024
PAYMENT_MODES = ("Cash", "UPI", "Card", "Bank transfer")

DEFAULT_SETTINGS = {
    "gym_name": "RS Arnold Gym",
    "whatsapp_number": "",
    "address": "",
    "upi_id": "",
    "country_code": "91",
    "reminder_method": "click",
    "rule_before_expiry": True,
    "rule_on_expiry": True,
    "rule_fee_balance": False,
}


def today() -> date:
    return date.today()


# ---------- settings ----------
def get_settings(db: Session) -> dict:
    out = dict(DEFAULT_SETTINGS)
    for row in db.scalars(select(Setting)):
        try:
            out[row.key] = json.loads(row.value)
        except ValueError:
            out[row.key] = row.value
    return out


def save_settings(db: Session, values: dict) -> dict:
    for key, value in values.items():
        if key not in DEFAULT_SETTINGS:
            continue
        row = db.get(Setting, key)
        if row is None:
            row = Setting(key=key, value="")
            db.add(row)
        row.value = json.dumps(value)
    db.commit()
    return get_settings(db)


# ---------- membership maths ----------
def status_of(end: date | None, now: date) -> tuple[str, int | None]:
    if end is None:
        return "expired", None
    days_left = (end - now).days
    if days_left < 0:
        return "expired", days_left
    if days_left <= DUE_WINDOW_DAYS:
        return "due", days_left
    return "active", days_left


def current_membership(member: Member) -> Membership | None:
    return max(member.memberships, key=lambda m: (m.end_date, m.id), default=None)


def money(member: Member) -> tuple[int, int, int]:
    total = sum(m.fee for m in member.memberships)
    paid = sum(p.amount for p in member.payments)
    return total, paid, max(0, total - paid)


def photo_url(member: Member) -> str | None:
    return f"/media/photos/{member.photo}" if member.photo else None


def member_summary(member: Member, now: date | None = None) -> dict:
    now = now or today()
    ms = current_membership(member)
    membership_status, days_left = status_of(ms.end_date if ms else None, now)
    status = "inactive" if member.inactive else membership_status
    total, paid, balance = money(member)
    return {
        "id": member.id,
        "code": f"#{member.id:04d}",
        "name": member.name,
        "phone": member.phone,
        "gender": member.gender,
        "photo_url": photo_url(member),
        "plan_name": ms.plan_name if ms else None,
        "joined_on": member.joined_on,
        "start_date": ms.start_date if ms else None,
        "end_date": ms.end_date if ms else None,
        "days_left": days_left,
        "status": status,
        "membership_status": membership_status,
        "lapsed": (
            not member.inactive
            and membership_status == "expired"
            and days_left is not None
            and days_left <= -LAPSED_DAYS
        ),
        "location_id": member.location_id,
        "location_name": member.location.name if member.location else None,
        "inactive_on": member.inactive_on,
        "inactive_reason": member.inactive_reason,
        "fee_total": total,
        "paid": paid,
        "balance": balance,
    }


def members_with_relations(db: Session) -> list[Member]:
    stmt = select(Member).options(selectinload(Member.memberships), selectinload(Member.payments), selectinload(Member.location))
    return list(db.scalars(stmt))


def load_member(db: Session, member_id: int) -> Member:
    stmt = (
        select(Member)
        .where(Member.id == member_id)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Member.memberships),
            selectinload(Member.payments),
            selectinload(Member.reminders),
            selectinload(Member.events),
            selectinload(Member.location),
        )
    )
    member = db.scalars(stmt).first()
    if member is None:
        raise HTTPException(404, "Member not found")
    return member


def default_location(db: Session) -> Location:
    loc = db.scalars(select(Location).where(Location.active).order_by(Location.id)).first()
    if loc is None:
        loc = Location(name="Main location")
        db.add(loc)
        db.flush()
    return loc


def get_location(db: Session, location_id: int | None) -> Location:
    if location_id is None:
        return default_location(db)
    loc = db.get(Location, location_id)
    if loc is None or not loc.active:
        raise HTTPException(404, "Location not found")
    return loc


def log_event(db: Session, member: Member, kind: str, on_date: date, note: str | None = None) -> None:
    db.add(MemberEvent(member_id=member.id, kind=kind, on_date=on_date, note=note))


def add_membership(db: Session, member: Member, plan: Plan, start: date) -> Membership:
    ms = Membership(
        member=member,
        plan_id=plan.id,
        plan_name=plan.name,
        start_date=start,
        end_date=start + timedelta(days=plan.duration_days - 1),
        fee=plan.price,
    )
    db.add(ms)
    db.flush()
    return ms


def add_payment(
    db: Session, member: Member, amount: int, mode: str, paid_on: date, membership: Membership | None
) -> Payment:
    if mode not in PAYMENT_MODES:
        raise HTTPException(422, f"Payment mode must be one of {', '.join(PAYMENT_MODES)}")
    pay = Payment(
        member=member,
        membership_id=membership.id if membership else None,
        amount=amount,
        mode=mode,
        paid_on=paid_on,
    )
    db.add(pay)
    db.flush()
    return pay


def get_active_plan(db: Session, plan_id: int) -> Plan:
    plan = db.get(Plan, plan_id)
    if plan is None or not plan.active:
        raise HTTPException(404, "Plan not found")
    return plan


# ---------- photos ----------
def save_photo(member: Member, upload: UploadFile) -> str:
    raw = upload.file.read(MAX_PHOTO_BYTES + 1)
    if len(raw) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "Photo is too large (max 8 MB)")
    try:
        img = Image.open(BytesIO(raw))
        img = ImageOps.exif_transpose(img).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(422, "That file is not a valid image")
    img = ImageOps.fit(img, (640, 640), Image.LANCZOS, centering=(0.5, 0.35))
    name = f"m{member.id}_{secrets.token_hex(4)}.jpg"
    img.save(PHOTO_DIR / name, "JPEG", quality=86, optimize=True)
    remove_photo_file(member.photo)
    return name


def remove_photo_file(name: str | None) -> None:
    if not name:
        return
    path = (PHOTO_DIR / name).resolve()
    if path.parent == PHOTO_DIR.resolve() and path.exists():
        path.unlink()
