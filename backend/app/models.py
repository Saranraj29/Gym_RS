from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), unique=True)
    price: Mapped[int] = mapped_column(Integer)
    duration_days: Mapped[int] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    address: Mapped[str | None] = mapped_column(String(300))
    phone: Mapped[str | None] = mapped_column(String(20))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), index=True)
    gender: Mapped[str | None] = mapped_column(String(10))
    dob: Mapped[date | None] = mapped_column(Date)
    batch: Mapped[str | None] = mapped_column(String(40))
    trainer: Mapped[str | None] = mapped_column(String(80))
    emergency_name: Mapped[str | None] = mapped_column(String(120))
    emergency_phone: Mapped[str | None] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text)
    photo: Mapped[str | None] = mapped_column(String(200))
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id", ondelete="SET NULL"), index=True)
    inactive: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    inactive_on: Mapped[date | None] = mapped_column(Date)
    inactive_reason: Mapped[str | None] = mapped_column(String(60))
    joined_on: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    location: Mapped["Location | None"] = relationship()
    events: Mapped[list["MemberEvent"]] = relationship(
        back_populates="member", cascade="all, delete-orphan", order_by="MemberEvent.on_date"
    )
    memberships: Mapped[list["Membership"]] = relationship(
        back_populates="member", cascade="all, delete-orphan", order_by="Membership.start_date"
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="member", cascade="all, delete-orphan", order_by="Payment.paid_on"
    )
    reminders: Mapped[list["ReminderLog"]] = relationship(
        back_populates="member", cascade="all, delete-orphan"
    )


class Membership(Base):
    """One purchased period of a plan. Plan name and fee are snapshotted so
    editing a plan later never rewrites history."""

    __tablename__ = "memberships"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("plans.id", ondelete="SET NULL"))
    plan_name: Mapped[str] = mapped_column(String(60))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date, index=True)
    fee: Mapped[int] = mapped_column(Integer)

    member: Mapped[Member] = relationship(back_populates="memberships")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    membership_id: Mapped[int | None] = mapped_column(
        ForeignKey("memberships.id", ondelete="SET NULL")
    )
    amount: Mapped[int] = mapped_column(Integer)
    mode: Mapped[str] = mapped_column(String(20))
    paid_on: Mapped[date] = mapped_column(Date, index=True)

    member: Mapped[Member] = relationship(back_populates="payments")


class ReminderLog(Base):
    __tablename__ = "reminder_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # renewal | fee | expired | welcome | receipt
    channel: Mapped[str] = mapped_column(String(20), default="whatsapp")
    lang: Mapped[str] = mapped_column(String(5), default="en")
    sent_on: Mapped[date] = mapped_column(Date)
    message: Mapped[str | None] = mapped_column(Text)

    member: Mapped[Member] = relationship(back_populates="reminders")


class MemberEvent(Base):
    """Status history: joined, inactive, reactivated, transferred."""

    __tablename__ = "member_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    on_date: Mapped[date] = mapped_column(Date)
    note: Mapped[str | None] = mapped_column(String(200))

    member: Mapped[Member] = relationship(back_populates="events")


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
