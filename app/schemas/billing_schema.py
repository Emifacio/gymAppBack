from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class BillingSyncResponse(BaseModel):
    entitlement_id: str = "premium"
    is_premium: bool
    product_id: str | None = None
    expires_at: datetime | None = None
    store: str | None = None
    source: Literal["revenuecat"] = "revenuecat"


class RevenueCatWebhookEvent(BaseModel):
    app_user_id: str = Field(min_length=1)
    type: str | None = None


class RevenueCatWebhookRequest(BaseModel):
    event: RevenueCatWebhookEvent


class RevenueCatWebhookResponse(BaseModel):
    status: Literal["processed", "ignored"]
