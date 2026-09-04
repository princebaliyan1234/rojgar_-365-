
from app.database import SessionLocal
from app.models import Booking
from fastapi import APIRouter

router = APIRouter()

@router.get("/bookings/{booking_id}")
def get_booking(booking_id: int):
    db = SessionLocal()
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    db.close()

    if not booking:
        return {"success": False, "message": "Booking not found"}

    return booking


@router.patch("/bookings/{booking_id}/status")
def update_booking_status(booking_id: int, status: str):
    valid_statuses = ["requested", "accepted", "in_progress", "awaiting_confirmation", "completed"]
    if status not in valid_statuses:
        return {"success": False, "message": "Invalid status"}

    db = SessionLocal()
    booking = db.query(Booking).filter(Booking.id == booking_id).first()

    if not booking:
        db.close()
        return {"success": False, "message": "Booking not found"}

    booking.status = status
    db.commit()
    db.close()
    return {"success": True, "message": f"Status updated to {status}"}