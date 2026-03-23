from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.api.dependencies import (
    enforce_member_access,
    get_activity_service,
    get_booking_service,
    get_current_user,
    get_member_service,
    get_subscription_service,
    require_roles,
)
from app.core.exceptions import ForbiddenError
from app.domain.enums import MemberRole, MembershipStatus
from app.domain.models.member import Member
from app.schemas.activity_schema import ActivityRead
from app.schemas.booking_schema import MemberBookingsResponse
from app.schemas.member_schema import (
    AvatarUploadResponse,
    MemberCreate,
    MemberListRead,
    MemberRead,
    MemberUpdate,
)
from app.schemas.subscription_schema import (
    MemberSubscriptionRead,
    MemberSubscriptionStatusRead,
    SubscriptionAssign,
    SubscriptionPaymentRecord,
)
from app.services.activity_service import ActivityService
from app.services.booking_service import BookingService
from app.services.member_service import MemberService
from app.services.storage_service import storage_service
from app.services.subscription_service import SubscriptionService

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
    response_model=list[MemberListRead],
    dependencies=[Depends(require_roles(MemberRole.ADMIN, MemberRole.INSTRUCTOR))],
)
async def list_members(
    role: MemberRole | None = Query(default=None),
    membership_status: MembershipStatus | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    service: MemberService = Depends(get_member_service),
) -> list[MemberListRead]:
    return await service.list_members(
        role=role,
        membership_status=membership_status,
        offset=offset,
        limit=limit,
    )


@router.get("/me/subscription", response_model=MemberSubscriptionStatusRead)
async def get_my_subscription(
    current_user: Member = Depends(get_current_user),
    service: SubscriptionService = Depends(get_subscription_service),
) -> MemberSubscriptionStatusRead:
    return await service.get_member_subscription_status(current_user.id)


@router.post("/me/avatar", response_model=AvatarUploadResponse)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: Member = Depends(get_current_user),
) -> AvatarUploadResponse:
    url = await storage_service.upload_avatar(file)
    return AvatarUploadResponse(url=url)


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
    
    # Strictly enforce that only ADMIN can update other members.
    if current_user.id != member_id and current_user.role != MemberRole.ADMIN:
        raise ForbiddenError("You do not have permission to modify other members")
        
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


@router.post(
    "/{member_id}/subscription",
    response_model=MemberSubscriptionRead,
    dependencies=[Depends(require_roles(MemberRole.ADMIN))],
)
async def assign_member_subscription(
    member_id: UUID,
    payload: SubscriptionAssign,
    service: SubscriptionService = Depends(get_subscription_service),
) -> MemberSubscriptionRead:
    return await service.assign_subscription(member_id, payload.plan_id)


@router.post(
    "/{member_id}/assign-plan",
    response_model=MemberSubscriptionRead,
    dependencies=[Depends(require_roles(MemberRole.ADMIN))],
)
async def assign_plan_alias(
    member_id: UUID,
    payload: SubscriptionAssign,
    service: SubscriptionService = Depends(get_subscription_service),
) -> MemberSubscriptionRead:
    """Alias for assign_member_subscription as requested by mobile app."""
    return await service.assign_subscription(member_id, payload.plan_id)


@router.post(
    "/{member_id}/subscription/payment",
    response_model=MemberSubscriptionRead,
    dependencies=[Depends(require_roles(MemberRole.ADMIN))],
)
async def record_member_subscription_payment(
    member_id: UUID,
    payload: SubscriptionPaymentRecord,
    service: SubscriptionService = Depends(get_subscription_service),
) -> MemberSubscriptionRead:
    return await service.record_successful_payment(member_id, paid_at=payload.paid_at)


@router.get("/{member_id}/subscription", response_model=MemberSubscriptionRead | None)
async def get_member_subscription(
    member_id: UUID,
    current_user: Member = Depends(get_current_user),
    service: SubscriptionService = Depends(get_subscription_service),
) -> MemberSubscriptionRead | None:
    if current_user.role != MemberRole.ADMIN and current_user.id != member_id:
        raise ForbiddenError("You can only access your own subscription")
    return await service.get_member_subscription(member_id)


@router.delete(
    "/{member_id}/subscription",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles(MemberRole.ADMIN))],
)
async def cancel_member_subscription(
    member_id: UUID,
    service: SubscriptionService = Depends(get_subscription_service),
    booking_service: BookingService = Depends(get_booking_service),
) -> None:
    # 1. cancel subscription state and zero credits
    await service.cancel_subscription(member_id)

    # 2. cancel future bookings + waitlist entries
    await booking_service.cancel_member_future_bookings(member_id)
