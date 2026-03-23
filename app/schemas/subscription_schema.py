from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.domain.enums import BillingStatus, SubscriptionStatus
from app.schemas.plan_schema import PlanRead


class SubscriptionAssign(BaseModel):
    plan_id: UUID


class SubscriptionPaymentRecord(BaseModel):
    paid_at: datetime | None = None


class BillingWarningRead(BaseModel):
    stage: str
    message: str


class MemberSubscriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    plan_id: UUID
    active_credits: int
    effective_credits: int
    period_start: datetime
    period_end: datetime
    status: SubscriptionStatus
    billing_status: BillingStatus
    next_due_date: date
    last_payment_date: datetime | None = None
    suspended_at: datetime | None = None
    billing_warning: BillingWarningRead | None = None
    created_at: datetime
    plan: PlanRead


class MemberSubscriptionStatusRead(BaseModel):
    active_plan: bool
    active_credits: int
    effective_credits: int
    period_end: datetime | None = None
    plan_name: str | None = None
    allows_free_pass: bool = False
    status: SubscriptionStatus | None = None
    billing_status: BillingStatus | None = None
    next_due_date: date | None = None
    last_payment_date: datetime | None = None
    suspended_at: datetime | None = None
    billing_warning: BillingWarningRead | None = None
    error_code: str | None = None
