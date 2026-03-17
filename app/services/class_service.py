import logging
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

logger = logging.getLogger(__name__)


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
        cache_key = self._cache_key(class_id)
        if viewer is None:
            cached = await self.cache.get_json(cache_key)
            if cached is not None:
                return ClassRead.model_validate(cached)

        gym_class = await self.get_class_model(class_id)
        serialized = await self._serialize_classes([gym_class], viewer=viewer)
        if viewer is None:
            await self.cache.set_json(cache_key, serialized[0].model_dump(mode="json"))
        return serialized[0]

    async def create_class(self, payload: ClassCreate) -> ClassRead:
        logger.info(f"create_class_start payload={payload.model_dump(mode='json')}")
        if self.session.in_transaction():
            logger.warning(f"create_class_rollback session_id={id(self.session)}")
            await self.session.rollback()
        
        async with self.session.begin():
            if payload.instructor_id is not None:
                instructor = await self.instructor_repository.get_by_id(payload.instructor_id)
                if instructor is None:
                    raise NotFoundError("Instructor not found")

            dates = payload.dates if payload.dates else ([payload.scheduled_at] if payload.scheduled_at else [])
            if not dates:
                raise ValueError("At least one date is required")
                
            first_id = None
            
            for dt in dates:
                data = payload.model_dump(exclude={"dates"})
                if "scheduled_at" in data:
                    data["scheduled_at"] = dt
                # If scheduled_at was missing from payload, we insert it for the model
                else:
                    data["scheduled_at"] = dt
                gym_class = GymClass(**data)
                await self.class_repository.add(gym_class)
                if first_id is None:
                    # Flush to get ID if needed, though get_class model will handle it after commit
                    await self.session.flush()
                    first_id = gym_class.id
                logger.debug(f"create_class_added class_id={gym_class.id} session_id={id(self.session)}")

        result = await self.get_class(first_id)
        logger.info(f"create_class_success class_id={first_id} count={len(dates)}")
        return result

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
        bookings = await self.booking_repository.list_confirmed_member_rows_for_class(class_id)
        return [
            ClassMemberRead(
                booking_id=booking_id,
                member_id=member_id,
                full_name=full_name,
                email=email,
                booked_at=booked_at,
                booking_type=booking_type,
                credits_consumed=credits_consumed,
            )
            for booking_id, member_id, full_name, email, booked_at, booking_type, credits_consumed in bookings
        ]

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
            confirmed_class_ids = await self.booking_repository.list_confirmed_class_ids_for_member(
                viewer.id,
                class_ids,
            )
            waiting_class_ids = await self.waitlist_repository.list_waiting_class_ids_for_member(
                viewer.id,
                class_ids,
            )
            member_status_by_class.update({class_id: "confirmed" for class_id in confirmed_class_ids})
            for class_id in waiting_class_ids:
                member_status_by_class.setdefault(class_id, "waitlisted")

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
