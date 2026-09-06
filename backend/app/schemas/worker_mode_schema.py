from pydantic import BaseModel


class StatusToggle(BaseModel):
    is_online: bool


class StatusOut(BaseModel):
    worker_id: int
    is_online: bool


class HoursUpdate(BaseModel):
    preferred_start: str
    preferred_end: str


class HoursOut(BaseModel):
    preferred_start: str
    preferred_end: str


class JobRequestItem(BaseModel):
    booking_id: int
    customer_id: int
    type: str
    total_days: int
    created_at: str


class RespondRequest(BaseModel):
    action: str


class RespondOut(BaseModel):
    booking_id: int
    status: str


class CompleteOut(BaseModel):
    booking_id: int
    status: str