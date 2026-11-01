"""First-run data: default plans, plus (unless SEED_DEMO=false) sample members so the
app doesn't open empty. Demo phone numbers are placeholders — replace before messaging."""
import os
import random
from datetime import timedelta

from PIL import Image, ImageDraw
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import services as svc
from .database import PHOTO_DIR
from .models import Location, Member, MemberEvent, Membership, Payment, Plan, ReminderLog, Setting

DEFAULT_PLANS = [("Monthly", 1200, 30), ("Quarterly", 3300, 90), ("Half-yearly", 6000, 180), ("Yearly", 10000, 365)]

NAMES = [
    ("Karthik Raja", "M"), ("Priya Sundar", "F"), ("Suresh Babu", "M"), ("Anitha Jayaraman", "F"),
    ("Rahul Thomas", "M"), ("Divya Mohan", "F"), ("Vignesh Prabhu", "M"), ("Meena Krishnan", "F"),
    ("Lakshmi Narayanan", "F"), ("Arun Kumar", "M"), ("Kavya Ramesh", "F"), ("Dinesh Selvam", "M"),
    ("Harini Venkat", "F"), ("Naveen Chandran", "M"), ("Swetha Murali", "F"), ("Gokul Anand", "M"),
    ("Pooja Iyer", "F"), ("Manoj Kannan", "M"), ("Nandhini Raj", "F"), ("Bharath Sekar", "M"),
    ("Deepa Lakshman", "F"), ("Sathish Kumar", "M"), ("Revathi Gopal", "F"), ("Ajay Menon", "M"),
    ("Shalini Pillai", "F"), ("Ganesh Moorthy", "M"), ("Keerthana S", "F"), ("Ramesh Pandian", "M"),
    ("Janani Ashok", "F"), ("Vijay Anand", "M"), ("Sowmya Balan", "F"), ("Prakash Raj", "M"),
    ("Archana Dev", "F"), ("Mohan Das", "M"), ("Tamilselvi M", "F"), ("Yuvaraj K", "M"),
    ("Nisha Fernando", "F"), ("Sanjay Reddy", "M"), ("Bhavani Shankar", "F"), ("Hari Prasad", "M"),
    ("Ishwarya Rao", "F"), ("Kishore Kumar", "M"), ("Madhavi Nair", "F"), ("Tarun Joseph", "M"),
    ("Sandhya Paul", "F"), ("Ilango Raman", "M"), ("Balaji Subbu", "M"), ("Gayathri Nair", "F"),
    ("Rohit Verma", "M"), ("Preethi Anand", "F"),
]
INACTIVE_REASONS = ["Not attending", "Not attending", "Moved away", "Financial"]
BATCHES = ["6 – 7 AM", "7 – 8 AM", "6 – 7 PM", "7 – 8 PM"]
TRAINERS = ["Coach Arjun", "Coach Meera", "Coach Vikram"]
SKIN = [(236, 190, 156), (214, 160, 120), (190, 135, 98), (160, 108, 76), (128, 86, 60)]
HAIR = [(28, 22, 22), (45, 32, 26), (20, 16, 24), (66, 44, 30)]
SHIRT = [(124, 58, 237), (168, 85, 247), (59, 130, 246), (16, 185, 129), (244, 114, 182), (251, 146, 60)]


def make_demo_avatar(path, idx: int, gender: str) -> None:
    """A small illustrated placeholder portrait so the photo feature is visible in the demo."""
    rnd = random.Random(idx * 31 + 5)
    S = 1280
    img = Image.new("RGB", (S, S), (30, 24, 54))
    d = ImageDraw.Draw(img)
    top, bot = rnd.choice([((52, 36, 112), (24, 18, 48)), ((30, 58, 112), (14, 22, 52)), ((88, 36, 108), (30, 16, 48))])
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    skin, hair, shirt = rnd.choice(SKIN), rnd.choice(HAIR), rnd.choice(SHIRT)
    cx = S // 2
    if gender == "F":
        d.ellipse([cx - 330, 330, cx + 330, 1100], fill=hair)  # long hair behind
    d.ellipse([cx - 520, 930, cx + 520, 1700], fill=shirt)  # shoulders
    d.rectangle([cx - 90, 760, cx + 90, 1010], fill=tuple(int(c * 0.88) for c in skin))  # neck
    d.ellipse([cx - 240, 300, cx + 240, 860], fill=skin)  # head
    if gender == "F":
        d.pieslice([cx - 270, 250, cx + 270, 800], 180, 360, fill=hair)
        d.ellipse([cx - 270, 290, cx - 120, 700], fill=hair)
        d.ellipse([cx + 120, 290, cx + 270, 700], fill=hair)
    else:
        d.pieslice([cx - 255, 262, cx + 255, 760], 185, 355, fill=hair)
    ey = 600
    for ex in (cx - 85, cx + 85):
        d.ellipse([ex - 18, ey - 18, ex + 18, ey + 18], fill=(28, 22, 28))
    d.arc([cx - 70, 640, cx + 70, 740], 20, 160, fill=(110, 50, 50), width=10)
    img.resize((640, 640), Image.LANCZOS).save(path, "JPEG", quality=88)


def seed_plans(db: Session) -> list[Plan]:
    if not db.scalars(select(Plan)).first():
        for name, price, days in DEFAULT_PLANS:
            db.add(Plan(name=name, price=price, duration_days=days))
        db.commit()
    return list(db.scalars(select(Plan).where(Plan.active).order_by(Plan.duration_days)))


def seed_demo(db: Session, plans: list[Plan]) -> None:
    rnd = random.Random(7)
    now = svc.today()
    by_name = {p.name: p for p in plans}
    locations = list(db.scalars(select(Location).where(Location.active).order_by(Location.id)))
    plan_order = ["Monthly"] * 19 + ["Quarterly"] * 16 + ["Half-yearly"] * 9 + ["Yearly"] * 6
    rnd.shuffle(plan_order)

    # days_left of each member's current membership: 7 due, 6 expired, rest active
    left = [0, 2, 3, 4, 5, 6, 7] + [-3, -9, -14, -20, -28, -41] + [-72, -88] + [-95, -118, -140, -170]
    left += [rnd.randint(9, 29) for _ in range(len(NAMES) - len(left))]
    rnd.shuffle(left)
    inactive_idx = {i for i in range(len(NAMES)) if left[i] <= -95}  # long-lapsed members -> marked inactive
    partial = {i for i in rnd.sample(range(len(NAMES)), 11) if i not in inactive_idx}
    newcomers = {i for i in rnd.sample(range(len(NAMES)), 12) if left[i] > 8 and i not in partial}
    modes = ["Cash", "UPI", "UPI", "UPI", "Card", "Bank transfer"]

    for i, (name, gender) in enumerate(NAMES):
        plan = by_name.get(plan_order[i]) or plans[0]
        dl = min(left[i], plan.duration_days - 1)
        if plan.duration_days > 60 and dl > 29 and rnd.random() < 0.5:
            dl = rnd.randint(30, min(plan.duration_days - 1, 240))
        newcomer = i in newcomers and plan.duration_days <= 90
        if newcomer:  # joined within the last ~10 days
            dl = plan.duration_days - 1 - rnd.randint(0, 9)
        end = now + timedelta(days=dl)
        start = end - timedelta(days=plan.duration_days - 1)

        chain = [(plan, start, end)]
        s = start
        for _ in range(0 if newcomer else rnd.randint(2, 5)):
            prev = rnd.choice([p for p in plans if p.duration_days <= 90] or plans)
            p_end = s - timedelta(days=1)
            p_start = p_end - timedelta(days=prev.duration_days - 1)
            if (now - p_start).days > 200:
                break
            chain.append((prev, p_start, p_end))
            s = p_start
        joined = chain[-1][1]

        member = Member(
            name=name,
            phone=f"90000{i + 1:05d}",
            gender="Male" if gender == "M" else "Female",
            batch=rnd.choice(BATCHES),
            trainer=rnd.choice(TRAINERS),
            joined_on=joined,
            location_id=locations[0 if rnd.random() < 0.58 else 1].id,
        )
        db.add(member)
        db.flush()
        db.add(MemberEvent(member_id=member.id, kind="joined", on_date=joined, note=None))
        if rnd.random() < 0.68:
            fname = f"m{member.id}_demo.jpg"
            make_demo_avatar(PHOTO_DIR / fname, i, gender)
            member.photo = fname

        for n, (pl, st, en) in enumerate(chain):
            ms = Membership(member=member, plan_id=pl.id, plan_name=pl.name, start_date=st, end_date=en, fee=pl.price)
            db.add(ms)
            db.flush()
            paid = pl.price
            if n == 0 and i in partial:
                paid = rnd.choice([0, round(pl.price * 0.4, -2), round(pl.price * 0.55, -2), round(pl.price * 0.8, -2)])
            if paid:
                db.add(Payment(member=member, membership_id=ms.id, amount=int(paid), mode=rnd.choice(modes), paid_on=min(st, now)))

        if i in inactive_idx:
            member.inactive = True
            member.inactive_on = end + timedelta(days=rnd.randint(20, 45))
            member.inactive_reason = INACTIVE_REASONS[i % len(INACTIVE_REASONS)]
            db.add(MemberEvent(member_id=member.id, kind="inactive", on_date=member.inactive_on, note=member.inactive_reason))
        if dl <= 7 and rnd.random() < 0.7:
            db.add(ReminderLog(member_id=member.id, kind="renewal", sent_on=now - timedelta(days=3)))

    db.flush()
    # a little reminder history for the "recently sent" table
    ids = list(db.scalars(select(Member.id).order_by(Member.id)))
    for offset, kind, count in ((6, "fee", 8), (10, "expired", 5), (14, "renewal", 9)):
        for mid in ids[:count]:
            db.add(ReminderLog(member_id=mid, kind=kind, sent_on=now - timedelta(days=offset)))
    db.commit()


def seed_if_empty(db: Session) -> None:
    plans = seed_plans(db)
    if db.get(Setting, "seeded"):
        return
    db.add(Setting(key="seeded", value="true"))
    if os.getenv("SEED_DEMO", "true").lower() != "false" and not db.scalars(select(Member)).first():
        seed_demo(db, plans)
    db.commit()
