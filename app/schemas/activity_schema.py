from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.domain.enums import IntegrationProvider


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    integration_account_id: UUID | None = None
    provider: IntegrationProvider
    external_id: str
    name: str
    activity_type: str
    distance_meters: float | None = None
    moving_time_seconds: int | None = None
    started_at: datetime | None = None
    payload: dict
    created_at: datetime
    updated_at: datetime

