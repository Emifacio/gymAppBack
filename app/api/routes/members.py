from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import (
    enforce_member_access,
    get_activity_service,
    get_booking_service,
    get_current_user,
    get_member_service,
    require_roles,
)
from app.domain.enums import MemberRole, MembershipStatus
from app.domain.models.member import Member
from app.schemas.activity_schema import ActivityRead
from app.schemas.booking_schema import MemberBookingsResponse
from app.schemas.member_schema import MemberCreate, MemberRead, MemberUpdate
from app.services.activity_service import ActivityService
from app.services.booking_service import BookingService
from app.services.member_service import MemberService

router = APIRouter(prefix="/members", tags=["members"])


@router.post(
    "",
    response_model=MemberRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(MemberRole.ADMIN))],
)
async def create_member(payload: MemberCreate, service: MemberService = Depends(get_member_service)) -> MemberRead:
    return await service.create_member(payload)


@router.get(
    "",
    response_model=list[MemberRead],
    dependencies=[Depends(require_roles(MemberRole.ADMIN, MemberRole.INSTRUCTOR))],
)
async def list_members(
    role: MemberRole | None = Query(default=None),
    membership_status: MembershipStatus | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    service: MemberService = Depends(get_member_service),
) -> list[MemberRead]:
    return await service.list_members(
        role=role,
        membership_status=membership_status,
        offset=offset,
        limit=limit,
    )


@router.get("/{member_id}", response_model=MemberRead)
async def get_member(
    member_id: UUID,
    current_user: Member = Depends(get_current_user),
    service: MemberService = Depends(get_member_service),
) -> MemberRead:
    enforce_member_access(current_user, member_id)
    return await service.get_member(member_id)


@router.patch("/{member_id}", response_model=MemberRead)
async def update_member(
    member_id: UUID,
    payload: MemberUpdate,
    current_user: Member = Depends(get_current_user),
    service: MemberService = Depends(get_member_service),
) -> MemberRead:
    enforce_member_access(current_user, member_id)
    return await service.update_member(
        member_id,
        payload,
        allow_admin_fields=current_user.role == MemberRole.ADMIN,
    )


@router.get("/{member_id}/bookings", response_model=MemberBookingsResponse)
async def get_member_bookings(
    member_id: UUID,
    current_user: Member = Depends(get_current_user),
    service: BookingService = Depends(get_booking_service),
) -> MemberBookingsResponse:
    enforce_member_access(current_user, member_id)
    return await service.list_member_bookings(member_id)


@router.get("/{member_id}/activities", response_model=list[ActivityRead])
async def get_member_activities(
    member_id: UUID,
    current_user: Member = Depends(get_current_user),
    service: ActivityService = Depends(get_activity_service),
) -> list[ActivityRead]:
    enforce_member_access(current_user, member_id)
    return await service.list_member_activities(member_id)

