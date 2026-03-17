from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.enums import BookingType
from app.domain.enums import ClassStatus


class InstructorSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    full_name: str | None = None
    bio: str | None = None
    specialties: str | None = None

    @model_validator(mode="after")
    def set_full_name(self) -> "InstructorSummary":
        if hasattr(self, "member") and self.member:
             self.full_name = self.member.full_name
        return self


class ClassCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120, validation_alias="title")
    description: str | None = None
    instructor_id: UUID | None = None
    scheduled_at: Optional[datetime] = None
    dates: list[datetime] | None = None
    duration_minutes: int = Field(default=60, gt=0)
    capacity: int = Field(gt=0)
    location: str = Field(min_length=2, max_length=120)
    status: ClassStatus = ClassStatus.SCHEDULED

    @model_validator(mode="after")
    def validate_times(self) -> "ClassCreate":
        if not self.scheduled_at and not self.dates:
            raise ValueError("At least one of scheduled_at or dates must be provided")
        return self


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
