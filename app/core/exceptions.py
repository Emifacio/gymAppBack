from fastapi import status

from app.domain.enums import BookingEligibilityOutcome


class AppException(Exception):
    def __init__(self, detail: str, status_code: int, code: str = "application_error") -> None:
        self.detail = detail
        self.status_code = status_code
        self.code = code
        super().__init__(detail)


class NotFoundError(AppException):
    def __init__(self, detail: str = "Resource not found") -> None:
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND, code="not_found")


class ConflictError(AppException):
    def __init__(self, detail: str = "Resource conflict") -> None:
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT, code="conflict")


class UnauthorizedError(AppException):
    def __init__(self, detail: str = "Authentication failed") -> None:
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED, code="unauthorized")


class ForbiddenError(AppException):
    def __init__(self, detail: str = "Action is not permitted") -> None:
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN, code="forbidden")


class BadRequestError(AppException):
    def __init__(self, detail: str = "Bad request") -> None:
        super().__init__(detail=detail, status_code=status.HTTP_400_BAD_REQUEST, code="bad_request")


class ServiceUnavailableError(AppException):
    def __init__(self, detail: str = "Service unavailable") -> None:
        super().__init__(
            detail=detail,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="service_unavailable",
        )


class NoActivePlanError(AppException):
    def __init__(self, detail: str = "Member has no active plan assigned") -> None:
        super().__init__(
            detail=detail,
            status_code=status.HTTP_403_FORBIDDEN,
            code=BookingEligibilityOutcome.NO_ACTIVE_PLAN.value,
        )


class PlanExpiredError(AppException):
    def __init__(self, detail: str = "Member plan has expired") -> None:
        super().__init__(
            detail=detail,
            status_code=status.HTTP_403_FORBIDDEN,
            code=BookingEligibilityOutcome.PLAN_EXPIRED.value,
        )


class InsufficientCreditsError(AppException):
    def __init__(self, detail: str = "Not enough credits") -> None:
        super().__init__(
            detail=detail,
            status_code=status.HTTP_403_FORBIDDEN,
            code=BookingEligibilityOutcome.INSUFFICIENT_CREDITS.value,
        )


class ClassFullError(AppException):
    def __init__(self, detail: str = "Class is full") -> None:
        super().__init__(
            detail=detail,
            status_code=status.HTTP_409_CONFLICT,
            code=BookingEligibilityOutcome.CLASS_FULL.value,
        )


class DuplicateBookingError(AppException):
    def __init__(self, detail: str = "Member is already booked for this class") -> None:
        super().__init__(
            detail=detail,
            status_code=status.HTTP_409_CONFLICT,
            code=BookingEligibilityOutcome.DUPLICATE_BOOKING.value,
        )


class BookingNotAllowedError(AppException):
    def __init__(self, detail: str = "Booking is not allowed") -> None:
        super().__init__(
            detail=detail,
            status_code=status.HTTP_409_CONFLICT,
            code=BookingEligibilityOutcome.BOOKING_NOT_ALLOWED.value,
        )


class BookingNotCancellableError(AppException):
    def __init__(self, detail: str = "Booking cannot be cancelled") -> None:
        super().__init__(
            detail=detail,
            status_code=status.HTTP_409_CONFLICT,
            code="booking_not_cancellable",
        )
