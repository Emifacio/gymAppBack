from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.dependencies import get_current_user, get_plan_service, require_roles
from app.domain.enums import MemberRole
from app.domain.models.member import Member
from app.schemas.plan_schema import PlanCreate, PlanRead, PlanUpdate
from app.services.plan_service import PlanService

router = APIRouter(prefix="/plans", tags=["plans"])


@router.post(
    "",
    response_model=PlanRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(MemberRole.ADMIN))],
)
async def create_plan(payload: PlanCreate, service: PlanService = Depends(get_plan_service)) -> PlanRead:
    return await service.create_plan(payload)


@router.get("", response_model=list[PlanRead])
async def list_plans(
    active: bool | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: Member = Depends(get_current_user),
    service: PlanService = Depends(get_plan_service),
) -> list[PlanRead]:
    resolved_active = active
    if current_user.role != MemberRole.ADMIN and resolved_active is None:
        resolved_active = True
    return await service.list_plans(active=resolved_active, offset=offset, limit=limit)


@router.patch(
    "/{plan_id}",
    response_model=PlanRead,
    dependencies=[Depends(require_roles(MemberRole.ADMIN))],
)
async def update_plan(
    plan_id: UUID,
    payload: PlanUpdate,
    service: PlanService = Depends(get_plan_service),
) -> PlanRead:
    return await service.update_plan(plan_id, payload)


@router.delete(
    "/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles(MemberRole.ADMIN))],
)
async def deactivate_plan(plan_id: UUID, service: PlanService = Depends(get_plan_service)) -> Response:
    await service.deactivate_plan(plan_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
