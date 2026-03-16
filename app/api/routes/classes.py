from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.dependencies import (
    get_booking_service,
    get_class_service,
    get_current_user,
    get_optional_user,
    require_roles,
)
from app.core.exceptions import ForbiddenError
from app.domain.enums import ClassStatus, MemberRole
from app.domain.models.member import Member
from app.schemas.booking_schema import BookingActionResponse, BookingCreate
from app.schemas.class_schema import ClassAssignmentCreate, ClassCreate, ClassMemberRead, ClassRead, ClassUpdate
from app.services.booking_service import BookingService
from app.services.class_service import ClassService

router = APIRouter(prefix="/classes", tags=["classes"])


def _ensure_class_mutation_access(current_user: Member, instructor_id: UUID | None) -> None:
    if current_user.role == MemberRole.ADMIN:
        return
    if current_user.role != MemberRole.INSTRUCTOR:
        raise ForbiddenError("Only admins and instructors can manage classes")
    if current_user.instructor_profile is None:
        raise ForbiddenError("Instructor profile is required to manage classes")
    if instructor_id is not None and current_user.instructor_profile.id != instructor_id:
        raise ForbiddenError("Instructors can only manage their own classes")


def _ensure_class_roster_access(current_user: Member, instructor_id: UUID | None) -> None:
    if current_user.role == MemberRole.ADMIN:
        return
    if current_user.role != MemberRole.INSTRUCTOR:
        raise ForbiddenError("Only admins and instructors can access class members")
    if current_user.instructor_profile is None or current_user.instructor_profile.id != instructor_id:
        raise ForbiddenError("Instructors can only access their own classes")


@router.post("", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
async def create_class(
    payload: ClassCreate,
    current_user: Member = Depends(get_current_user),
    service: ClassService = Depends(get_class_service),
) -> ClassRead:
    _ensure_class_mutation_access(current_user, payload.instructor_id)
    if current_user.role == MemberRole.INSTRUCTOR and payload.instructor_id is None:
        payload = payload.model_copy(update={"instructor_id": current_user.instructor_profile.id})
    return await service.create_class(payload)


@router.get("", response_model=list[ClassRead])
async def list_classes(
    status_filter: ClassStatus | None = Query(default=None, alias="status"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: Member | None = Depends(get_optional_user),
    service: ClassService = Depends(get_class_service),
) -> list[ClassRead]:
    return await service.list_classes(status=status_filter, offset=offset, limit=limit, viewer=current_user)


@router.get("/{class_id}", response_model=ClassRead)
async def get_class(
    class_id: UUID,
    current_user: Member | None = Depends(get_optional_user),
    service: ClassService = Depends(get_class_service),
) -> ClassRead:
    return await service.get_class(class_id, viewer=current_user)


@router.patch("/{class_id}", response_model=ClassRead)
async def update_class(
    class_id: UUID,
    payload: ClassUpdate,
    current_user: Member = Depends(get_current_user),
    service: ClassService = Depends(get_class_service),
) -> ClassRead:
    existing = await service.get_class_model(class_id)
    instructor_id = payload.instructor_id if payload.instructor_id is not None else existing.instructor_id
    _ensure_class_mutation_access(current_user, instructor_id)
    return await service.update_class(class_id, payload)


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(
    class_id: UUID,
    current_user: Member = Depends(get_current_user),
    service: ClassService = Depends(get_class_service),
) -> Response:
    existing = await service.get_class_model(class_id)
    _ensure_class_mutation_access(current_user, existing.instructor_id)
    await service.delete_class(class_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{class_id}/members",
    response_model=list[ClassMemberRead],
    dependencies=[Depends(require_roles(MemberRole.ADMIN, MemberRole.INSTRUCTOR))],
)
async def get_class_members(
    class_id: UUID,
    current_user: Member = Depends(get_current_user),
    service: ClassService = Depends(get_class_service),
) -> list[ClassMemberRead]:
    gym_class = await service.get_class_model(class_id)
    _ensure_class_roster_access(current_user, gym_class.instructor_id)
    return await service.list_class_members(class_id)


@router.post(
    "/{class_id}/assign-member",
    response_model=BookingActionResponse,
    dependencies=[Depends(require_roles(MemberRole.ADMIN, MemberRole.INSTRUCTOR))],
)
async def assign_member_to_class(
    class_id: UUID,
    payload: ClassAssignmentCreate,
    current_user: Member = Depends(get_current_user),
    class_service: ClassService = Depends(get_class_service),
    booking_service: BookingService = Depends(get_booking_service),
) -> BookingActionResponse:
    gym_class = await class_service.get_class_model(class_id)
    _ensure_class_roster_access(current_user, gym_class.instructor_id)
    return await booking_service.create_booking(
        BookingCreate(class_id=class_id, member_id=payload.member_id),
        current_user,
        allow_staff_override=True,
    )
