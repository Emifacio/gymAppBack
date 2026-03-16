from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.domain.models.gym_class import GymClass
from app.domain.models.member import Member
from app.infrastructure.cache.redis_client import RedisCache
from app.repositories.booking_repository import BookingRepository
from app.repositories.class_repository import ClassRepository
from app.repositories.instructor_repository import InstructorRepository
from app.repositories.waitlist_repository import WaitlistRepository
from app.schemas.class_schema import ClassCreate, ClassMemberRead, ClassRead, ClassUpdate


class ClassService:
    def __init__(
        self,
        session: AsyncSession,
        class_repository: ClassRepository,
        instructor_repository: InstructorRepository,
        booking_repository: BookingRepository,
        waitlist_repository: WaitlistRepository,
        cache: RedisCache,
    ) -> None:
        self.session = session
        self.class_repository = class_repository
        self.instructor_repository = instructor_repository
        self.booking_repository = booking_repository
        self.waitlist_repository = waitlist_repository
        self.cache = cache

    def _cache_key(self, class_id: UUID | str) -> str:
        return f"class:{class_id}"

    async def list_classes(self, *, viewer: Member | None = None, **filters: object) -> list[ClassRead]:
        classes = await self.class_repository.list(**filters)
        return await self._serialize_classes(classes, viewer=viewer)

    async def get_class_model(self, class_id: UUID) -> GymClass:
        gym_class = await self.class_repository.get_by_id(class_id)
        if gym_class is None:
            raise NotFoundError("Class not found")
        return gym_class

    async def get_class(self, class_id: UUID, *, viewer: Member | None = None) -> ClassRead:
        gym_class = await self.get_class_model(class_id)
        serialized = await self._serialize_classes([gym_class], viewer=viewer)
        return serialized[0]

    async def create_class(self, payload: ClassCreate) -> ClassRead:
        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            if payload.instructor_id is not None:
                instructor = await self.instructor_repository.get_by_id(payload.instructor_id)
                if instructor is None:
                    raise NotFoundError("Instructor not found")

            gym_class = GymClass(**payload.model_dump())
            await self.class_repository.add(gym_class)

        return await self.get_class(gym_class.id)

    async def update_class(self, class_id: UUID, payload: ClassUpdate) -> ClassRead:
        if self.session.in_transaction():
            await self.session.rollback()
        update_data = payload.model_dump(exclude_unset=True)

        async with self.session.begin():
            gym_class = await self.class_repository.get_by_id(class_id, for_update=True)
            if gym_class is None:
                raise NotFoundError("Class not found")

            if "instructor_id" in update_data and update_data["instructor_id"] is not None:
                instructor = await self.instructor_repository.get_by_id(update_data["instructor_id"])
                if instructor is None:
                    raise NotFoundError("Instructor not found")

            for field_name, value in update_data.items():
                setattr(gym_class, field_name, value)

        await self.cache.delete(self._cache_key(class_id))
        return await self.get_class(class_id)

    async def delete_class(self, class_id: UUID) -> None:
        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            gym_class = await self.class_repository.get_by_id(class_id, for_update=True)
            if gym_class is None:
                raise NotFoundError("Class not found")
            await self.class_repository.delete(gym_class)
        await self.cache.delete(self._cache_key(class_id))

    async def list_class_members(self, class_id: UUID) -> list[ClassMemberRead]:
        await self.get_class_model(class_id)
        bookings = await self.booking_repository.list_confirmed_for_class(class_id)
        members: list[ClassMemberRead] = []
        for booking in bookings:
            if booking.member is None:
                continue
            members.append(
                ClassMemberRead(
                    booking_id=booking.id,
                    member_id=booking.member_id,
                    full_name=booking.member.full_name,
                    email=booking.member.email,
                    booked_at=booking.booked_at,
                    booking_type=booking.booking_type,
                    credits_consumed=booking.credits_consumed,
                )
            )
        return members

    async def _serialize_classes(
        self,
        classes: list[GymClass],
        *,
        viewer: Member | None = None,
    ) -> list[ClassRead]:
        if not classes:
            return []

        class_ids = [gym_class.id for gym_class in classes]
        confirmed_counts = await self.booking_repository.count_confirmed_for_class_ids(class_ids)
        waitlist_counts = await self.waitlist_repository.count_waiting_for_class_ids(class_ids)
        member_status_by_class: dict[UUID, str] = {}

        if viewer is not None:
            confirmed = await self.booking_repository.list_confirmed_for_member_and_class_ids(viewer.id, class_ids)
            waiting = await self.waitlist_repository.list_waiting_for_member_and_class_ids(viewer.id, class_ids)
            member_status_by_class.update({booking.class_id: "confirmed" for booking in confirmed})
            for entry in waiting:
                member_status_by_class.setdefault(entry.class_id, "waitlisted")

        serialized_classes: list[ClassRead] = []
        for gym_class in classes:
            schema = ClassRead.model_validate(gym_class)
            serialized_classes.append(
                schema.model_copy(
                    update={
                        "available_spots": max(
                            gym_class.capacity - confirmed_counts.get(gym_class.id, 0),
                            0,
                        ),
                        "waitlist_size": waitlist_counts.get(gym_class.id, 0),
                        "member_booking_status": member_status_by_class.get(gym_class.id),
                    }
                )
            )
        return serialized_classes
