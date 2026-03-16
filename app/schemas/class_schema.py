from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import BookingType
from app.domain.enums import ClassStatus


class InstructorSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    bio: str | None = None
    specialties: str | None = None


class ClassCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    instructor_id: UUID | None = None
    scheduled_at: datetime
    duration_minutes: int = Field(default=60, gt=0)
    capacity: int = Field(gt=0)
    location: str = Field(min_length=2, max_length=120)
    status: ClassStatus = ClassStatus.SCHEDULED


class ClassUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    instructor_id: UUID | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, gt=0)
    capacity: int | None = Field(default=None, gt=0)
    location: str | None = Field(default=None, min_length=2, max_length=120)
    status: ClassStatus | None = None


class ClassAssignmentCreate(BaseModel):
    member_id: UUID


class ClassMemberRead(BaseModel):
    booking_id: UUID
    member_id: UUID
    full_name: str
    email: str
    booked_at: datetime
    booking_type: BookingType
    credits_consumed: int


class ClassRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    instructor_id: UUID | None = None
    instructor: InstructorSummary | None = None
    scheduled_at: datetime
    duration_minutes: int
    capacity: int
    location: str
    status: ClassStatus
    available_spots: int | None = None
    waitlist_size: int = 0
    member_booking_status: str | None = None
    created_at: datetime
    updated_at: datetime
