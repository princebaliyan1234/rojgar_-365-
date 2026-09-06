from fastapi import HTTPException
from app.schemas.booking_schema import BookingResponse
from app.database import SessionLocal
from app.models import Booking
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import date



router = APIRouter()

class BookingCreate(BaseModel):
    type: str
    payment_model: str
    job_notes: str | None = None
    customer_id: int
    worker_id: int
    price: float | None = None
    total_days: int


@router.post("/bookings", response_model=BookingResponse)
def create_booking(payload: BookingCreate):
    db = SessionLocal()

    new_booking = Booking(
        type=payload.type,
        payment_model=payload.payment_model,
        job_notes=payload.job_notes,
        customer_id=payload.customer_id,
        worker_id=payload.worker_id,
        status="requested",
        price=payload.price,
        total_days=payload.total_days
    )

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    db.close()

    return new_booking

@router.get("/bookings/{booking_id}", response_model=BookingResponse)
def get_booking(booking_id: int):
    db = SessionLocal()
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    db.close()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    return booking

@router.patch("/bookings/{booking_id}/status")
def update_booking_status(booking_id: int, status: str):
    allowed_here = ["requested", "accepted", "rejected", "in_progress", "awaiting_confirmation"]
    if status not in allowed_here:
        raise HTTPException(status_code=400, detail="Use /complete endpoint for completing a booking")

    db = SessionLocal()
    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        db.close()
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = status
    db.commit()
    db.close()
    return {"success": True, "message": f"Status updated to {status}"}