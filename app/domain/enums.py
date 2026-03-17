from enum import StrEnum


class MemberRole(StrEnum):
    MEMBER = "member"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"


class MembershipStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class PlanPeriodType(StrEnum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class SubscriptionStatus(StrEnum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ClassStatus(StrEnum):
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class BookingStatus(StrEnum):
    CONFIRMED = "confirmed"
    WAITLIST = "waitlist"
    CANCELLED = "cancelled"
    ATTENDED = "attended"
    NO_SHOW = "no_show"


class BookingType(StrEnum):
    CREDIT = "credit"
    FREE_PASS = "free_pass"
    WAITLIST = "waitlist"


class BookingActionState(StrEnum):
    BOOKING_CONFIRMED = "BOOKING_CONFIRMED"
    ADDED_TO_WAITLIST = "ADDED_TO_WAITLIST"


class BookingEligibilityOutcome(StrEnum):
    BOOKING_ALLOWED = "BOOKING_ALLOWED"
    WAITLIST_ALLOWED = "WAITLIST_ALLOWED"
    NO_ACTIVE_PLAN = "NO_ACTIVE_PLAN"
    INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS"
    PLAN_EXPIRED = "PLAN_EXPIRED"
    CLASS_FULL = "CLASS_FULL"
    DUPLICATE_BOOKING = "DUPLICATE_BOOKING"
    CLASS_PAST = "CLASS_PAST"
    BOOKING_NOT_ALLOWED = "BOOKING_NOT_ALLOWED"


class WaitlistStatus(StrEnum):
    WAITING = "waiting"
    PROMOTED = "promoted"
    CANCELLED = "cancelled"


class AttendanceStatus(StrEnum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"


class IntegrationProvider(StrEnum):
    STRAVA = "strava"


class IntegrationStatus(StrEnum):
    CONNECTED = "connected"
    EXPIRED = "expired"
    REVOKED = "revoked"


def enum_values(enum_cls: type[StrEnum]) -> list[str]:
    return [member.value for member in enum_cls]
