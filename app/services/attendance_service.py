from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.domain.enums import BookingStatus, MemberRole
from app.domain.models.attendance import Attendance
from app.domain.models.member import Member
from app.repositories.attendance_repository import AttendanceRepository
from app.repositories.booking_repository import BookingRepository
from app.repositories.class_repository import ClassRepository
from app.repositories.member_repository import MemberRepository
from app.schemas.attendance_schema import AttendanceCreate, AttendanceRead


class AttendanceService:
    def __init__(
        self,
        session: AsyncSession,
        class_repository: ClassRepository,
        member_repository: MemberRepository,
        booking_repository: BookingRepository,
        attendance_repository: AttendanceRepository,
    ) -> None:
        self.session = session
        self.class_repository = class_repository
        self.member_repository = member_repository
        self.booking_repository = booking_repository
        self.attendance_repository = attendance_repository

    async def mark_attendance(self, payload: AttendanceCreate, actor: Member) -> AttendanceRead:
        actor_role = actor.role
        actor_instructor_id = actor.instructor_profile.id if actor.instructor_profile is not None else None
        marked_by_instructor_id = actor_instructor_id
        now = datetime.now(timezone.utc)

        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            member = await self.member_repository.get_by_id(payload.member_id, for_update=True)
            if member is None:
                raise NotFoundError("Member not found")

            gym_class = await self.class_repository.get_by_id(payload.class_id, for_update=True)
            if gym_class is None:
                raise NotFoundError("Class not found")

            if actor_role == MemberRole.INSTRUCTOR:
                if actor_instructor_id is None or gym_class.instructor_id != actor_instructor_id:
                    raise ForbiddenError("Instructors can only mark attendance for their own classes")

            booking = await self.booking_repository.get_by_member_and_class(
                payload.member_id,
                payload.class_id,
                for_update=True,
            )
            if booking is None or booking.status != BookingStatus.CONFIRMED:
                raise ConflictError("Attendance can only be marked for confirmed bookings")

            attendance = await self.attendance_repository.get_by_member_and_class(
                payload.member_id,
                payload.class_id,
                for_update=True,
            )
            if attendance is None:
                attendance = Attendance(
                    member_id=payload.member_id,
                    class_id=payload.class_id,
                    marked_by_instructor_id=marked_by_instructor_id,
                    status=payload.status,
                    notes=payload.notes,
                    mark_source="manual",
                    marked_at=now,
                )
                await self.attendance_repository.add(attendance)
            else:
                attendance.marked_by_instructor_id = marked_by_instructor_id
                attendance.status = payload.status
                attendance.notes = payload.notes
                attendance.marked_at = now

        refreshed = await self.attendance_repository.get_by_member_and_class(payload.member_id, payload.class_id)
        assert refreshed is not None
        return AttendanceRead.model_validate(refreshed)

    async def list_by_class(self, class_id: UUID) -> list[AttendanceRead]:
        if not await self.class_repository.exists_by_id(class_id):
            raise NotFoundError("Class not found")
        items = await self.attendance_repository.list_by_class(class_id)
        return [AttendanceRead.model_validate(item) for item in items]

    async def list_by_member(self, member_id: UUID) -> list[AttendanceRead]:
        if not await self.member_repository.exists_by_id(member_id):
            raise NotFoundError("Member not found")
        items = await self.attendance_repository.list_by_member(member_id)
        return [AttendanceRead.model_validate(item) for item in items]
