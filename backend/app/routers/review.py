from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Booking, Review, WorkerProfile, User
from app.schemas.review_schema import (
    ReviewCreate,
    ReviewOut,
    WorkerReviewOut,
)

review_route = APIRouter()


@review_route.post(
    "/bookings/{booking_id}/review",
    response_model=ReviewOut
)
def submit_review(
    booking_id: int,
    payload: ReviewCreate,
    db: Session = Depends(get_db)
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if booking is None:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="Booking must be completed before review"
        )

    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(
            status_code=400,
            detail="Rating must be between 1 and 5"
        )

    existing = (
        db.query(Review)
        .filter(Review.booking_id == booking_id)
        .first()
    )

    if existing is not None:
        raise HTTPException(
            status_code=400,
            detail="Review already submitted for this booking"
        )

    review = Review(
        booking_id=booking_id,
        rating=payload.rating,
        review_text=payload.review_text,
    )

    db.add(review)

    profile = (
        db.query(WorkerProfile)
        .filter(
            WorkerProfile.user_id == booking.worker_id
        )
        .first()
    )

    if profile is not None:

        all_ratings = (
            db.query(Review.rating)
            .join(
                Booking,
                Review.booking_id == Booking.id
            )
            .filter(
                Booking.worker_id == booking.worker_id
            )
            .all()
        )

        ratings = [
            r[0]
            for r in all_ratings
        ] + [payload.rating]

        profile.rating_avg = round(
            sum(ratings) / len(ratings),
            2
        )

    db.commit()

    return ReviewOut(
        booking_id=booking_id,
        rating=payload.rating,
        review_text=payload.review_text,
    )


@review_route.get(
    "/workers/{worker_id}/reviews",
    response_model=list[WorkerReviewOut]
)
def get_worker_reviews(
    worker_id: int,
    db: Session = Depends(get_db)
):

    worker = (
        db.query(User)
        .filter(User.id == worker_id)
        .first()
    )

    if worker is None:
        raise HTTPException(
            status_code=404,
            detail="Worker not found"
        )

    reviews = (
        db.query(Review, Booking, User)
        .join(
            Booking,
            Review.booking_id == Booking.id
        )
        .join(
            User,
            Booking.customer_id == User.id
        )
        .filter(
            Booking.worker_id == worker_id
        )
        .order_by(Review.id.desc())
        .all()
    )

    return [
        WorkerReviewOut(
            booking_id=review.booking_id,
            rating=review.rating,
            review_text=review.review_text,
            customer_name=customer.name
        )
        for review, booking, customer in reviews
    ]