from pydantic import BaseModel


class ReviewCreate(BaseModel):
    rating: int
    review_text: str


class ReviewOut(BaseModel):
    booking_id: int
    rating: int
    review_text: str