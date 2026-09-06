from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Booking, Review, WorkerProfile
from app.schemas.review_schema import ReviewCreate, ReviewOut

review_route = APIRouter()


@review_route.post("/bookings/{booking_id}/review", response_model=ReviewOut)
def submit_review(booking_id: int, payload: ReviewCreate, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != "completed":
        raise HTTPException(status_code=400, detail="Booking must be completed before review")

    existing = db.query(Review).filter(Review.booking_id == booking_id).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Review already submitted for this booking")

    review = Review(
        booking_id=booking_id,
        rating=payload.rating,
        review_text=payload.review_text,
    )
    db.add(review)

    # recompute the worker's rating_avg across all their reviews
    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == booking.worker_id).first()
    if profile is not None:
        all_ratings = (
            db.query(Review.rating)
            .join(Booking, Review.booking_id == Booking.id)
            .filter(Booking.worker_id == booking.worker_id)
            .all()
        )
        ratings = [r[0] for r in all_ratings] + [payload.rating]
        profile.rating_avg = round(sum(ratings) / len(ratings), 2)

    db.commit()

    return ReviewOut(
        booking_id=booking_id,
        rating=payload.rating,
        review_text=payload.review_text,
    )