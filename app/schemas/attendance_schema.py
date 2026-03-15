from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.domain.enums import AttendanceStatus


class AttendanceCreate(BaseModel):
    member_id: UUID
    class_id: UUID
    status: AttendanceStatus
    notes: str | None = None


class AttendanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    class_id: UUID
    marked_by_instructor_id: UUID | None = None
    status: AttendanceStatus
    notes: str | None = None
    mark_source: str
    marked_at: datetime

