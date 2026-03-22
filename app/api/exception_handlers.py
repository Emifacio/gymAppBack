import logging

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette import status

from app.core.exceptions import AppException
from app.domain.enums import BookingEligibilityOutcome

logger = logging.getLogger(__name__)

_DUPLICATE_BOOKING_CONSTRAINTS = {
    "uq_bookings_member_class",
    "uq_waitlists_member_class",
}


def _is_duplicate_booking_violation(exc: IntegrityError) -> bool:
    error_text = str(exc)
    if exc.orig is not None:
        error_text = f"{error_text}\n{exc.orig}"
    return any(constraint in error_text for constraint in _DUPLICATE_BOOKING_CONSTRAINTS)


async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "message": exc.detail,
            "code": exc.code,
            "error_code": exc.code,
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Log detailed errors for development and debugging
    errors = exc.errors()
    
    try:
        # Try to get body for logging context, truncate if too large
        body = await request.body()
        body_str = body.decode()
        if len(body_str) > 1000:
            body_str = body_str[:1000] + "... [truncated]"
    except Exception:
        body_str = "Unavailable"

    logger.error(
        "request_validation_error path=%s errors=%s body=%s",
        request.url.path,
        errors,
        body_str
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": errors,
            "message": "Validation failed",
            "code": "validation_error",
            "error_code": "validation_error",
        },
    )


async def integrity_exception_handler(_: Request, exc: IntegrityError) -> JSONResponse:
    logger.exception("database_integrity_error", exc_info=exc)
    if _is_duplicate_booking_violation(exc):
        duplicate_code = BookingEligibilityOutcome.DUPLICATE_BOOKING.value
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": "Member is already booked for this class",
                "message": "Member is already booked for this class",
                "code": duplicate_code,
                "error_code": duplicate_code,
            },
        )
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "detail": "Database integrity violation",
            "message": "Database integrity violation",
            "code": "integrity_error",
            "error_code": "integrity_error",
        },
    )


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled_exception", exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "message": "Internal server error",
            "code": "internal_error",
            "error_code": "internal_error",
        },
    )
