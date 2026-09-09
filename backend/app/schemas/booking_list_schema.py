from pydantic import BaseModel
from datetime import datetime


class BookingListItem(BaseModel):
    id: int
    status: str
    worker_id: int
    customer_id: int
    created_at: datetime
    total_days: int

    model_config = {"from_attributes": True}