from pydantic import BaseModel


class WorkerDetail(BaseModel):
    id: int
    name: str
    trade: str
    union_id: int
    union_name: str
    district_union_name: str | None = None
    state_union_name: str | None = None
    price: float | None = None
    rating_avg: float | None = None
    review_count: int
    photo_urls: list[str]
    kyc_status: str
    description: str | None = None