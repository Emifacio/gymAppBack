from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.domain.enums import MemberRole
from app.domain.models.instructor import Instructor
from app.domain.models.member import Member
from app.infrastructure.cache.redis_client import RedisCache
from app.repositories.instructor_repository import InstructorRepository
from app.repositories.member_repository import MemberRepository
from app.repositories.membership_plan_repository import MembershipPlanRepository
from app.schemas.member_schema import MemberCreate, MemberRead, MemberUpdate


class MemberService:
    def __init__(
        self,
        session: AsyncSession,
        member_repository: MemberRepository,
        instructor_repository: InstructorRepository,
        membership_plan_repository: MembershipPlanRepository,
        cache: RedisCache,
    ) -> None:
        self.session = session
        self.member_repository = member_repository
        self.instructor_repository = instructor_repository
        self.membership_plan_repository = membership_plan_repository
        self.cache = cache

    def _cache_key(self, member_id: UUID | str) -> str:
        return f"member:{member_id}"

    async def list_members(self, **filters: object) -> list[MemberRead]:
        members = await self.member_repository.list(**filters)
        return [MemberRead.model_validate(member) for member in members]

    async def get_member_model(self, member_id: UUID) -> Member:
        member = await self.member_repository.get_by_id(member_id)
        if member is None:
            raise NotFoundError("Member not found")
        return member

    async def get_member(self, member_id: UUID) -> MemberRead:
        cached = await self.cache.get_json(self._cache_key(member_id))
        if cached is not None:
            return MemberRead.model_validate(cached)

        member = await self.get_member_model(member_id)
        schema = MemberRead.model_validate(member)
        await self.cache.set_json(self._cache_key(member_id), schema.model_dump(mode="json"))
        return schema

    async def create_member(self, payload: MemberCreate) -> MemberRead:
        if self.session.in_transaction():
            await self.session.rollback()
        async with self.session.begin():
            if await self.member_repository.get_by_email(payload.email):
                raise ConflictError("A member with that email already exists")
            if payload.membership_plan_id is not None:
                plan = await self.membership_plan_repository.get_by_id(payload.membership_plan_id)
                if plan is None:
                    raise NotFoundError("Membership plan not found")

            member = Member(
                email=payload.email,
                full_name=payload.full_name,
                password_hash=hash_password(payload.password),
                phone=payload.phone,
                birth_date=payload.birth_date,
                emergency_contact=payload.emergency_contact,
                notes=payload.notes,
                membership_plan_id=payload.membership_plan_id,
                membership_status=payload.membership_status,
                role=payload.role,
                is_active=payload.is_active,
            )
            await self.member_repository.add(member)
            await self._ensure_instructor_profile(
                member=member,
                role=payload.role,
                bio=payload.instructor_bio,
                specialties=payload.instructor_specialties,
            )

        return await self.get_member(member.id)

    async def update_member(
        self,
        member_id: UUID,
        payload: MemberUpdate,
        *,
        allow_admin_fields: bool,
    ) -> MemberRead:
        if self.session.in_transaction():
            await self.session.rollback()
        update_data = payload.model_dump(exclude_unset=True)
        if not allow_admin_fields:
            allowed_fields = {"full_name", "phone", "birth_date", "emergency_contact", "notes", "password"}
            update_data = {key: value for key, value in update_data.items() if key in allowed_fields}

        password = update_data.pop("password", None)
        instructor_bio = update_data.pop("instructor_bio", None)
        instructor_specialties = update_data.pop("instructor_specialties", None)

        async with self.session.begin():
            member = await self.member_repository.get_by_id(member_id, for_update=True)
            if member is None:
                raise NotFoundError("Member not found")

            if "membership_plan_id" in update_data and update_data["membership_plan_id"] is not None:
                plan = await self.membership_plan_repository.get_by_id(update_data["membership_plan_id"])
                if plan is None:
                    raise NotFoundError("Membership plan not found")

            for field_name, value in update_data.items():
                setattr(member, field_name, value)

            if password is not None:
                member.password_hash = hash_password(password)

            await self._ensure_instructor_profile(
                member=member,
                role=member.role,
                bio=instructor_bio,
                specialties=instructor_specialties,
            )

        await self.cache.delete(self._cache_key(member_id))
        return await self.get_member(member_id)

    async def _ensure_instructor_profile(
        self,
        *,
        member: Member,
        role: MemberRole,
        bio: str | None,
        specialties: str | None,
    ) -> None:
        if role != MemberRole.INSTRUCTOR and not (bio or specialties):
            return

        profile = member.instructor_profile or await self.instructor_repository.get_by_member_id(member.id)
        if role == MemberRole.INSTRUCTOR and profile is None:
            profile = Instructor(
                member_id=member.id,
                bio=bio,
                specialties=specialties,
            )
            await self.instructor_repository.add(profile)
            member.instructor_profile = profile
            return

        if profile is not None:
            if bio is not None:
                profile.bio = bio
            if specialties is not None:
                profile.specialties = specialties
