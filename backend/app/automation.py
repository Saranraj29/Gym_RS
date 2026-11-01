"""Sending reminders through the WhatsApp API: on demand, and on a daily schedule driven by the reminder rules."""
import asyncio
import logging
import os
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import services as svc
from . import whatsapp
from .database import SessionLocal
from .models import Member, ReminderLog
from .templates import TEMPLATES

log = logging.getLogger("fittrack.automation")


def _fmt_date(d) -> str:
    return f"{d.day} {d.strftime('%b')}" if d else ""


def message_values(member: Member, kind: str, now, gym: str) -> dict:
    s = svc.member_summary(member, now)
    amount = s["balance"]
    if kind == "receipt" and member.payments:
        amount = max(member.payments, key=lambda p: (p.paid_on, p.id)).amount
    return {
        "name": member.name,
        "plan": s["plan_name"] or "",
        "date": _fmt_date(s["end_date"]),
        "amount": f"{amount:,}",
        "gym": gym,
    }


def send_to_members(db: Session, member_ids: list[int], kind: str, lang: str, settings: dict) -> list[dict]:
    now = svc.today()
    results = []
    for mid in dict.fromkeys(member_ids):
        try:
            member = svc.load_member(db, mid)
        except Exception:
            results.append({"member_id": mid, "ok": False, "error": "Member not found"})
            continue
        values = message_values(member, kind, now, settings["gym_name"])
        digits = "".join(ch for ch in member.phone if ch.isdigit())
        to = settings["country_code"] + digits if len(digits) == 10 else digits
        res = whatsapp.send_template(to, kind, lang, TEMPLATES[lang][kind], values)
        if res.ok:
            db.add(ReminderLog(member_id=mid, kind=kind, channel="whatsapp_api", lang=lang, sent_on=now, message=whatsapp.template_name(kind, lang)))
            db.commit()
        results.append({"member_id": mid, "name": member.name, "ok": res.ok, "error": res.error})
    return results


def candidates(db: Session, settings: dict, now) -> list[tuple[int, str]]:
    """Who should get an automatic message today, per the enabled rules, skipping anyone already messaged."""
    recent = {}
    for log_row in db.scalars(select(ReminderLog).where(ReminderLog.sent_on >= now - timedelta(days=10))):
        recent.setdefault((log_row.member_id, log_row.kind), []).append(log_row.sent_on)

    def sent_since(mid, kind, days):
        return any(d >= now - timedelta(days=days) for d in recent.get((mid, kind), []))

    out: list[tuple[int, str]] = []
    for m in svc.members_with_relations(db):
        s = svc.member_summary(m, now)
        if s["status"] == "inactive":
            continue
        dl = s["days_left"]
        if settings["rule_on_expiry"] and s["status"] == "due" and dl == 0 and not sent_since(m.id, "renewal", 0):
            out.append((m.id, "renewal"))
        elif settings["rule_before_expiry"] and s["status"] == "due" and dl is not None and 1 <= dl <= 7 and not sent_since(m.id, "renewal", 10):
            out.append((m.id, "renewal"))
        elif settings["rule_fee_balance"] and s["balance"] > 0 and s["start_date"] and s["start_date"] <= now - timedelta(days=3) and not sent_since(m.id, "fee", 7):
            out.append((m.id, "fee"))
    return out


def run_auto(db: Session, settings: dict) -> dict:
    now = svc.today()
    todo = candidates(db, settings, now)
    sent = failed = 0
    errors: list[str] = []
    for kind in ("renewal", "fee"):
        ids = [mid for mid, k in todo if k == kind]
        if not ids:
            continue
        for r in send_to_members(db, ids, kind, settings["reminder_language"], settings):
            if r["ok"]:
                sent += 1
            else:
                failed += 1
                errors.append(f"{r.get('name', r['member_id'])}: {r['error']}")
    log.info("automatic reminders: %s sent, %s failed", sent, failed)
    return {"sent": sent, "failed": failed, "errors": errors[:10]}


def run_if_due() -> None:
    hour = int(os.getenv("AUTO_REMINDER_HOUR", "9"))
    with SessionLocal() as db:
        settings = svc.get_settings(db)
        any_rule = settings["rule_before_expiry"] or settings["rule_on_expiry"] or settings["rule_fee_balance"]
        today = svc.today().isoformat()
        if settings["reminder_method"] != "api" or not whatsapp.available() or not any_rule:
            return
        if settings["last_auto_run"] == today or datetime.now().hour < hour:
            return
        svc.save_settings(db, {"last_auto_run": today})  # mark first so a crash can't cause a double send
        run_auto(db, settings)


async def scheduler() -> None:
    await asyncio.sleep(20)
    while True:
        try:
            await asyncio.to_thread(run_if_due)
        except Exception:  # keep the loop alive
            log.exception("automatic reminder run failed")
        await asyncio.sleep(600)
