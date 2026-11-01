from datetime import date

from pydantic import BaseModel, Field, field_validator


def _digits(v: str) -> str:
    return "".join(ch for ch in v if ch.isdigit())


class MemberBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=20)
    gender: str | None = None
    dob: date | None = None
    batch: str | None = Field(default=None, max_length=40)
    trainer: str | None = Field(default=None, max_length=80)
    emergency_name: str | None = Field(default=None, max_length=120)
    emergency_phone: str | None = Field(default=None, max_length=20)
    notes: str | None = None
    location_id: int | None = None

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Name is too short")
        return v

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        digits = _digits(v)
        if not 7 <= len(digits) <= 15:
            raise ValueError("Enter a valid phone number")
        return digits[-10:] if len(digits) > 10 else digits


class MemberCreate(MemberBase):
    plan_id: int
    join_date: date | None = None
    paid_amount: int = Field(default=0, ge=0)
    payment_mode: str = "Cash"


class MemberUpdate(MemberBase):
    pass


class PaymentCreate(BaseModel):
    amount: int = Field(gt=0)
    mode: str = "Cash"
    paid_on: date | None = None


class RenewRequest(BaseModel):
    plan_id: int
    paid_amount: int = Field(default=0, ge=0)
    mode: str = "Cash"
    start_date: date | None = None


class PlanIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    price: int = Field(ge=0)
    duration_days: int = Field(ge=1, le=3650)


class SettingsIn(BaseModel):
    gym_name: str | None = Field(default=None, max_length=120)
    whatsapp_number: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=300)
    upi_id: str | None = Field(default=None, max_length=80)
    country_code: str | None = Field(default=None, max_length=4)
    reminder_method: str | None = Field(default=None, pattern="^(click|api)$")
    rule_before_expiry: bool | None = None
    rule_on_expiry: bool | None = None
    rule_fee_balance: bool | None = None
    reminder_language: str | None = Field(default=None, pattern="^(en|ta)$")


class SendRemindersIn(BaseModel):
    member_ids: list[int] = Field(min_length=1, max_length=500)
    kind: str = Field(pattern="^(renewal|fee|expired|welcome|receipt)$")
    lang: str | None = Field(default=None, pattern="^(en|ta)$")


class ReminderLogIn(BaseModel):
    member_ids: list[int] = Field(min_length=1)
    kind: str = Field(pattern="^(renewal|fee|expired|welcome|receipt)$")
    lang: str = Field(default="en", pattern="^(en|ta)$")
    message: str | None = None


INACTIVE_REASONS = ("Not attending", "Moved away", "Medical", "Financial", "Other")


class InactiveRequest(BaseModel):
    reason: str = Field(default="Not attending", max_length=60)
    on_date: date | None = None


class BulkInactiveRequest(BaseModel):
    member_ids: list[int] = Field(min_length=1)
    reason: str = Field(default="Not attending", max_length=60)


class LocationIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    address: str | None = Field(default=None, max_length=300)
    phone: str | None = Field(default=None, max_length=20)
