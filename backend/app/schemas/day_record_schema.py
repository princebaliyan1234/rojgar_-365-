from pydantic import BaseModel
from datetime import datetime


class DayRecordDetail(BaseModel):
    id: int
    day_number: int
    start_time: datetime | None = None
    end_time: datetime | None = None
    wage_amount: float | None = None
    status: str
    remarks: str | None = None

    model_config = {"from_attributes": True}