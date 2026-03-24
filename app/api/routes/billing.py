import hashlib
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import (
    get_current_user,
    get_revenuecat_service,
    get_revenuecat_webhook_event_repository,
)
from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError, UnauthorizedError
from app.domain.models.member import Member
from app.repositories.revenuecat_webhook_event_repository import RevenueCatWebhookEventRepository
from app.schemas.billing_schema import (
    BillingSyncResponse,
    RevenueCatWebhookRequest,
    RevenueCatWebhookResponse,
)
from app.services.revenuecat_service import RevenueCatService

router = APIRouter(prefix="/billing", tags=["billing"])
settings = get_settings()
logger = logging.getLogger(__name__)


def _build_webhook_event_id(payload: RevenueCatWebhookRequest) -> str:
    if payload.event.id:
        return payload.event.id

    raw_payload = json.dumps(payload.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()


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
        last_synced_at=state.last_synced_at or datetime.now(timezone.utc),
        store=state.store,
    )


@router.post("/webhooks/revenuecat", response_model=RevenueCatWebhookResponse)
async def revenuecat_webhook(
    payload: RevenueCatWebhookRequest,
    authorization: str | None = Header(default=None),
    service: RevenueCatService = Depends(get_revenuecat_service),
    webhook_event_repository: RevenueCatWebhookEventRepository = Depends(get_revenuecat_webhook_event_repository),
) -> RevenueCatWebhookResponse:
    expected_authorization = settings.revenuecat_webhook_authorization
    if not expected_authorization:
        raise ServiceUnavailableError("RevenueCat webhook authorization is not configured")
    if authorization != expected_authorization:
        raise UnauthorizedError("Invalid RevenueCat webhook authorization")

    event_id = _build_webhook_event_id(payload)
    event_type = payload.event.type or "unknown"
    app_user_id = payload.event.app_user_id

    if await webhook_event_repository.exists_by_event_id(event_id):
        logger.info(
            "revenuecat_webhook event_id=%s event_type=%s app_user_id=%s result=duplicate",
            event_id,
            event_type,
            app_user_id,
        )
        return RevenueCatWebhookResponse(status="processed")

    try:
        await webhook_event_repository.create(
            event_id=event_id,
            app_user_id=app_user_id,
            event_type=event_type,
        )
    except IntegrityError:
        await webhook_event_repository.session.rollback()
        logger.info(
            "revenuecat_webhook event_id=%s event_type=%s app_user_id=%s result=duplicate",
            event_id,
            event_type,
            app_user_id,
        )
        return RevenueCatWebhookResponse(status="processed")

    try:
        sync_result = await service.sync_member_by_app_user_id(app_user_id)
        await webhook_event_repository.session.commit()
    except Exception:
        await webhook_event_repository.session.rollback()
        raise

    logger.info(
        "revenuecat_webhook event_id=%s event_type=%s app_user_id=%s result=%s",
        event_id,
        event_type,
        app_user_id,
        sync_result.result,
    )
    return RevenueCatWebhookResponse(status="processed")
