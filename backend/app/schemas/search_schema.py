from pydantic import BaseModel

class SearchResult(BaseModel):
    id: int
    name: str
    trade: str
    locality: str
    price: float | None = None
    rating_avg: float | None = None
    review_count: int
    photo_urls: list[str] | None = None
    latitude: float | None = None
    longitude: float | None = None
    distance_km: float | None = None

    model_config = {"from_attributes": True}