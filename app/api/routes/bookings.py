from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import get_booking_service, get_current_user
from app.domain.models.member import Member
from app.schemas.booking_schema import BookingActionResponse, BookingCancellationResponse, BookingCreate
from app.services.booking_service import BookingService

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingActionResponse)
async def create_booking(
    payload: BookingCreate,
    current_user: Member = Depends(get_current_user),
    service: BookingService = Depends(get_booking_service),
) -> BookingActionResponse:
    return await service.create_booking(payload, current_user)


@router.delete("/{booking_id}", response_model=BookingCancellationResponse)
async def cancel_booking(
    booking_id: UUID,
    current_user: Member = Depends(get_current_user),
    service: BookingService = Depends(get_booking_service),
) -> BookingCancellationResponse:
    return await service.cancel_booking(booking_id, current_user)

