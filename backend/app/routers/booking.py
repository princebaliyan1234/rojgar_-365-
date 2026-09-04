from fastapi import HTTPException
from app.schemas.booking_schema import BookingResponse
from app.database import SessionLocal
from app.models import Booking
from fastapi import APIRouter



router = APIRouter()

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