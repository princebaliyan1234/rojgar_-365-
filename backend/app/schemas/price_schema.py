from pydantic import BaseModel


class PriceUpdate(BaseModel):
    price: float


class PriceOut(BaseModel):
    price: float
    union_floor: float | None = None
    union_ceiling: float | None = None
    warning: str | None = None