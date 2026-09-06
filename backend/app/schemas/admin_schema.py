from pydantic import BaseModel


class UnionWorkerItem(BaseModel):
    id: int
    name: str
    trade: str
    kyc_status: str


class KycUpdate(BaseModel):
    kyc_status: str


class KycOut(BaseModel):
    worker_id: int
    kyc_status: str


class UnionStats(BaseModel):
    total_bookings: int
    total_distributed_earnings: float
    welfare_fund_balance: float


class PriceBandCreate(BaseModel):
    union_id: int
    trade: str
    floor: float
    ceiling: float


class PriceBandOut(BaseModel):
    id: int | None = None
    union_id: int
    trade: str
    floor: float
    ceiling: float

    model_config = {"from_attributes": True}