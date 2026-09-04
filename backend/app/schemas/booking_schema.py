from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BookingResponse(BaseModel):
    id: int
    type: str
    payment_model: str
    job_notes: Optional[str]
    created_at: datetime
    customer_id: int
    worker_id: int
    status: str
    price: Optional[float]
    total_days: int

    class Config:
        from_attributes = True