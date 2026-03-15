from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import get_attendance_service, get_current_user, require_roles
from app.core.exceptions import ForbiddenError
from app.domain.enums import MemberRole
from app.domain.models.member import Member
from app.schemas.attendance_schema import AttendanceCreate, AttendanceRead
from app.services.attendance_service import AttendanceService

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post(
    "",
    response_model=AttendanceRead,
    dependencies=[Depends(require_roles(MemberRole.ADMIN, MemberRole.INSTRUCTOR))],
)
async def mark_attendance(
    payload: AttendanceCreate,
    current_user: Member = Depends(get_current_user),
    service: AttendanceService = Depends(get_attendance_service),
) -> AttendanceRead:
    return await service.mark_attendance(payload, current_user)


@router.get(
    "/class/{class_id}",
    response_model=list[AttendanceRead],
    dependencies=[Depends(require_roles(MemberRole.ADMIN, MemberRole.INSTRUCTOR))],
)
async def get_class_attendance(
    class_id: UUID,
    service: AttendanceService = Depends(get_attendance_service),
) -> list[AttendanceRead]:
    return await service.list_by_class(class_id)


@router.get("/member/{member_id}", response_model=list[AttendanceRead])
async def get_member_attendance(
    member_id: UUID,
    current_user: Member = Depends(get_current_user),
    service: AttendanceService = Depends(get_attendance_service),
) -> list[AttendanceRead]:
    if current_user.role not in {MemberRole.ADMIN, MemberRole.INSTRUCTOR} and current_user.id != member_id:
        raise ForbiddenError("You can only access your own attendance history")
    return await service.list_by_member(member_id)

