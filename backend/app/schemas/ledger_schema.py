from pydantic import BaseModel
from typing import Optional


class LedgerEntryResult(BaseModel):
    day_record_id: int
    day_number: int
    wage_amount: Optional[float]
    remarks: Optional[str]
    hash: str
    verified: bool


class LedgerResponse(BaseModel):
    total_jobs: int
    total_earnings: float
    entries: list[LedgerEntryResult]