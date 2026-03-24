from fastapi import APIRouter, Depends, Header

from app.api.dependencies import get_current_user, get_revenuecat_service
from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError, UnauthorizedError
from app.domain.models.member import Member
from app.schemas.billing_schema import (
    BillingSyncResponse,
    RevenueCatWebhookRequest,
    RevenueCatWebhookResponse,
)
from app.services.revenuecat_service import RevenueCatService

router = APIRouter(prefix="/billing", tags=["billing"])
settings = get_settings()


@router.post("/sync", response_model=BillingSyncResponse)
async def sync_billing(
    current_user: Member = Depends(get_current_user),
    service: RevenueCatService = Depends(get_revenuecat_service),
) -> BillingSyncResponse:
    state = await service.sync_member(current_user)
    return BillingSyncResponse(
        entitlement_id=state.entitlement_id,
        is_premium=state.is_premium,
        product_id=state.product_id,
        expires_at=state.expires_at,
        store=state.store,
    )


@router.post("/webhooks/revenuecat", response_model=RevenueCatWebhookResponse)
async def revenuecat_webhook(
    payload: RevenueCatWebhookRequest,
    authorization: str | None = Header(default=None),
    service: RevenueCatService = Depends(get_revenuecat_service),
) -> RevenueCatWebhookResponse:
    expected_authorization = settings.revenuecat_webhook_authorization
    if not expected_authorization:
        raise ServiceUnavailableError("RevenueCat webhook authorization is not configured")
    if authorization != expected_authorization:
        raise UnauthorizedError("Invalid RevenueCat webhook authorization")

    state = await service.sync_member_by_app_user_id(payload.event.app_user_id)
    return RevenueCatWebhookResponse(status="processed" if state is not None else "ignored")
