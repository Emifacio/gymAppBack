from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import PlanPeriodType


class PlanCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    credits_per_period: int = Field(ge=0)
    period_type: PlanPeriodType
    allows_free_pass: bool = False
    active: bool = True


class PlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    credits_per_period: int | None = Field(default=None, ge=0)
    period_type: PlanPeriodType | None = None
    allows_free_pass: bool | None = None
    active: bool | None = None


class PlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    credits_per_period: int
    period_type: PlanPeriodType
    allows_free_pass: bool
    active: bool
    created_at: datetime
