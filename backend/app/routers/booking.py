from fastapi import HTTPException
from app.schemas.booking_schema import BookingResponse
from app.database import SessionLocal
from app.models import Booking, User
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import date
from fastapi import Query
from app.schemas.booking_list_schema import BookingListItem
from app.models import DayRecord
from app.schemas.worker_mode_schema import RespondRequest, RespondOut, CompleteOut

router = APIRouter()

class BookingCreate(BaseModel):
    type: str
    payment_model: str
    job_notes: str | None = None
    customer_id: int
    worker_id: int
    price: float | None = None
    total_days: int


@router.patch("/bookings/{booking_id}/respond", response_model=RespondOut)
def respond_to_booking(booking_id: int, payload: RespondRequest):
    if payload.action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'reject'")

    db = SessionLocal()
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        db.close()
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = "accepted" if payload.action == "accept" else "rejected"
    db.commit()
    result = RespondOut(booking_id=booking.id, status=booking.status)
    db.close()
    return result


@router.patch("/bookings/{booking_id}/complete", response_model=CompleteOut)
def complete_booking(booking_id: int):
    db = SessionLocal()
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        db.close()
        raise HTTPException(status_code=404, detail="Booking not found")

    day_records = db.query(DayRecord).filter(DayRecord.booking_id == booking_id).all()
    if not day_records or any(dr.status != "completed" for dr in day_records):
        db.close()
        raise HTTPException(status_code=400, detail="All day records must be completed first")

    booking.status = "completed"
    db.commit()
    result = CompleteOut(booking_id=booking.id, status=booking.status)
    db.close()
    return result

@router.post("/bookings", response_model=BookingResponse)
def create_booking(payload: BookingCreate):
    if payload.total_days < 1:
        raise HTTPException(status_code=400, detail="total_days must be at least 1")

    db = SessionLocal()

    customer = db.query(User).filter(User.id == payload.customer_id).first()
    worker = db.query(User).filter(User.id == payload.worker_id).first()
    if customer is None:
        db.close()
        raise HTTPException(status_code=404, detail="Customer not found")
    if worker is None:
        db.close()
        raise HTTPException(status_code=404, detail="Worker not found")


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

@router.get("/bookings", response_model=list[BookingListItem])
def list_bookings(
    customer_id: int | None = Query(None),
    worker_id: int | None = Query(None),
):
    if (customer_id is None) == (worker_id is None):
        raise HTTPException(status_code=400, detail="Pass exactly one of customer_id or worker_id")

    db = SessionLocal()
    query = db.query(Booking)
    if customer_id is not None:
        query = query.filter(Booking.customer_id == customer_id)
    else:
        query = query.filter(Booking.worker_id == worker_id)

    bookings = query.all()
    db.close()
    return bookings

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