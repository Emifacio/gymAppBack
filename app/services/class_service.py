from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.domain.models.gym_class import GymClass
from app.infrastructure.cache.redis_client import RedisCache
from app.repositories.class_repository import ClassRepository
from app.repositories.instructor_repository import InstructorRepository
from app.schemas.class_schema import ClassCreate, ClassRead, ClassUpdate


class ClassService:
    def __init__(
        self,
        session: AsyncSession,
        class_repository: ClassRepository,
        instructor_repository: InstructorRepository,
        cache: RedisCache,
    ) -> None:
        self.session = session
        self.class_repository = class_repository
        self.instructor_repository = instructor_repository
        self.cache = cache

    def _cache_key(self, class_id: UUID | str) -> str:
        return f"class:{class_id}"

    async def list_classes(self, **filters: object) -> list[ClassRead]:
        classes = await self.class_repository.list(**filters)
        return [ClassRead.model_validate(item) for item in classes]

    async def get_class_model(self, class_id: UUID) -> GymClass:
        gym_class = await self.class_repository.get_by_id(class_id)
        if gym_class is None:
            raise NotFoundError("Class not found")
        return gym_class

    async def get_class(self, class_id: UUID) -> ClassRead:
        cached = await self.cache.get_json(self._cache_key(class_id))
        if cached is not None:
            return ClassRead.model_validate(cached)

        gym_class = await self.get_class_model(class_id)
        schema = ClassRead.model_validate(gym_class)
        await self.cache.set_json(self._cache_key(class_id), schema.model_dump(mode="json"))
        return schema

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
