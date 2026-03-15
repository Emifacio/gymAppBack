from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.domain.enums import BookingStatus, WaitlistStatus
from app.schemas.class_schema import ClassRead


class BookingCreate(BaseModel):
    class_id: UUID
    member_id: UUID | None = None


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    class_id: UUID
    status: BookingStatus
    booked_at: datetime
    cancelled_at: datetime | None = None
    gym_class: ClassRead | None = None


class WaitlistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    class_id: UUID
    position: int
    status: WaitlistStatus
    joined_at: datetime
    promoted_at: datetime | None = None
    cancelled_at: datetime | None = None
    gym_class: ClassRead | None = None


class BookingActionResponse(BaseModel):
    state: str
    message: str
    booking: BookingRead | None = None
    waitlist_entry: WaitlistRead | None = None


class BookingCancellationResponse(BaseModel):
    booking_id: UUID
    cancelled: bool
    message: str
    promoted_booking: BookingRead | None = None


class MemberBookingsResponse(BaseModel):
    bookings: list[BookingRead]
    waitlist: list[WaitlistRead]

