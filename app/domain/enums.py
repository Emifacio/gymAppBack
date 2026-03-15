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


class ClassStatus(StrEnum):
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class BookingStatus(StrEnum):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


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
