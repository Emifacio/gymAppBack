from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user, get_integration_service
from app.core.config import get_settings
from app.domain.models.member import Member
from app.schemas.integration_schema import (
    ActivityShareResponse,
    ActivitySyncRequest,
    IntegrationAccountRead,
    StravaCallbackRequest,
    StravaConnectRequest,
    TaskEnqueueResponse,
)
from app.services.integration_service import IntegrationService
from uuid import UUID

router = APIRouter(tags=["integrations"])
settings = get_settings()


@router.get("/integrations/strava/authorize")
async def get_strava_authorize_url() -> dict[str, str]:
    if not settings.strava_client_id or not settings.strava_redirect_uri:
        from app.core.exceptions import ServiceUnavailableError
        raise ServiceUnavailableError("Strava integration is not fully configured on the server")
    
    url = (
        f"{settings.strava_oauth_base_url}/authorize"
        f"?client_id={settings.strava_client_id}"
        f"&redirect_uri={settings.strava_redirect_uri}"
        f"&response_type=code"
        f"&scope=activity:write,read"
    )
    return {"url": url}


@router.post("/integrations/strava/connect", response_model=IntegrationAccountRead)
async def connect_strava(
    payload: StravaConnectRequest,
    current_user: Member = Depends(get_current_user),
    service: IntegrationService = Depends(get_integration_service),
) -> IntegrationAccountRead:
    return await service.connect_strava(current_user.id, payload, current_user)


@router.get("/integrations/strava/callback")
async def strava_callback(
    code: str,
    state: str | None = None,
    current_user: Member = Depends(get_current_user),
    service: IntegrationService = Depends(get_integration_service),
) -> IntegrationAccountRead:
    return await service.complete_strava_auth(current_user.id, code)


@router.post("/activities/sync", response_model=TaskEnqueueResponse)
async def enqueue_activity_sync(
    payload: ActivitySyncRequest,
    current_user: Member = Depends(get_current_user),
    service: IntegrationService = Depends(get_integration_service),
) -> TaskEnqueueResponse:
    member_id = payload.member_id or current_user.id
    return await service.enqueue_activity_sync(member_id, current_user)


@router.post("/activities/{booking_id}/share", response_model=ActivityShareResponse)
async def share_workout_to_strava(
    booking_id: UUID,
    current_user: Member = Depends(get_current_user),
    service: IntegrationService = Depends(get_integration_service),
) -> ActivityShareResponse:
    result = await service.share_workout_to_strava(current_user.id, booking_id)
    return ActivityShareResponse(
        activity_id=str(result.get("id", "")),
        status="shared",
        external_url=f"https://www.strava.com/activities/{result.get('id', '')}"
    )

