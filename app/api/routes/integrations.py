from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user, get_integration_service
from app.domain.models.member import Member
from app.schemas.integration_schema import (
    ActivitySyncRequest,
    IntegrationAccountRead,
    StravaConnectRequest,
    TaskEnqueueResponse,
)
from app.services.integration_service import IntegrationService

router = APIRouter(tags=["integrations"])


@router.post("/integrations/strava/connect", response_model=IntegrationAccountRead)
async def connect_strava(
    payload: StravaConnectRequest,
    current_user: Member = Depends(get_current_user),
    service: IntegrationService = Depends(get_integration_service),
) -> IntegrationAccountRead:
    return await service.connect_strava(current_user.id, payload, current_user)


@router.post("/activities/sync", response_model=TaskEnqueueResponse)
async def enqueue_activity_sync(
    payload: ActivitySyncRequest,
    current_user: Member = Depends(get_current_user),
    service: IntegrationService = Depends(get_integration_service),
) -> TaskEnqueueResponse:
    member_id = payload.member_id or current_user.id
    return await service.enqueue_activity_sync(member_id, current_user)

