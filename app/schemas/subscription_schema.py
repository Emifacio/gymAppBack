from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.domain.enums import SubscriptionStatus
from app.schemas.plan_schema import PlanRead


class SubscriptionAssign(BaseModel):
    plan_id: UUID


class MemberSubscriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    plan_id: UUID
    active_credits: int
    period_start: datetime
    period_end: datetime
    status: SubscriptionStatus
    created_at: datetime
    plan: PlanRead
