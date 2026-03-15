from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import IntegrationProvider, IntegrationStatus


class StravaConnectRequest(BaseModel):
    access_token: str = Field(min_length=1, max_length=255)
    refresh_token: str | None = Field(default=None, max_length=255)
    token_expires_at: datetime | None = None
    external_account_id: str | None = Field(default=None, max_length=128)


class IntegrationAccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    provider: IntegrationProvider
    external_account_id: str | None = None
    token_expires_at: datetime | None = None
    status: IntegrationStatus
    provider_metadata: dict
    last_synced_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ActivitySyncRequest(BaseModel):
    member_id: UUID | None = None


class TaskEnqueueResponse(BaseModel):
    task_id: str
    status: str
