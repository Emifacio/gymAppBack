from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.domain.enums import MemberRole, MembershipStatus


class MembershipPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    price: Decimal
    duration_days: int
    is_active: bool


class InstructorProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    bio: str | None = None
    specialties: str | None = None


class MemberBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    birth_date: date | None = None
    emergency_contact: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    membership_plan_id: UUID | None = None


class MemberCreate(MemberBase):
    password: str = Field(min_length=8, max_length=128)
    role: MemberRole = MemberRole.MEMBER
    membership_status: MembershipStatus = MembershipStatus.ACTIVE
    is_active: bool = True
    instructor_bio: str | None = None
    instructor_specialties: str | None = None


class MemberUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    birth_date: date | None = None
    emergency_contact: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    membership_plan_id: UUID | None = None
    membership_status: MembershipStatus | None = None
    role: MemberRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    instructor_bio: str | None = None
    instructor_specialties: str | None = None


class MemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    phone: str | None = None
    birth_date: date | None = None
    emergency_contact: str | None = None
    notes: str | None = None
    role: MemberRole
    membership_status: MembershipStatus
    is_active: bool
    membership_plan: MembershipPlanRead | None = None
    instructor_profile: InstructorProfileRead | None = None
    created_at: datetime
    updated_at: datetime

