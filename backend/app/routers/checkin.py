from fastapi import APIRouter, HTTPException
from datetime import datetime
from geopy.distance import geodesic
from app.database import SessionLocal
from app.models import Booking, DayRecord, User

router = APIRouter()

DISTANCE_LIMIT_METERS = 500


@router.post("/day-records/{day_record_id}/check-in")
def check_in(day_record_id: int, worker_lat: float, worker_long: float):
    db = SessionLocal()
    day_record = db.query(DayRecord).filter(DayRecord.id == day_record_id).first()

    if not day_record:
        db.close()
        raise HTTPException(status_code=404, detail="Day record not found")

    booking = db.query(Booking).filter(Booking.id == day_record.booking_id).first()
    customer = db.query(User).filter(User.id == booking.customer_id).first()

    worker_point = (worker_lat, worker_long)
    customer_point = (customer.latitude, customer.longitude)
    distance = geodesic(worker_point, customer_point).meters

    if distance > DISTANCE_LIMIT_METERS:
        db.close()
        raise HTTPException(status_code=400, detail=f"Too far from job site ({int(distance)}m away)")

    day_record.start_time = datetime.utcnow()
    day_record.status = "in_progress"
    db.commit()
    db.close()

    return {"success": True, "message": "Checked in", "distance_meters": int(distance)}


@router.post("/day-records/{day_record_id}/check-out")
def check_out(day_record_id: int, worker_lat: float, worker_long: float):
    db = SessionLocal()
    day_record = db.query(DayRecord).filter(DayRecord.id == day_record_id).first()

    if not day_record:
        db.close()
        raise HTTPException(status_code=404, detail="Day record not found")

    booking = db.query(Booking).filter(Booking.id == day_record.booking_id).first()
    customer = db.query(User).filter(User.id == booking.customer_id).first()

    worker_point = (worker_lat, worker_long)
    customer_point = (customer.latitude, customer.longitude)
    distance = geodesic(worker_point, customer_point).meters

    if distance > DISTANCE_LIMIT_METERS:
        db.close()
        raise HTTPException(status_code=400, detail=f"Too far from job site ({int(distance)}m away)")

    day_record.end_time = datetime.utcnow()
    day_record.status = "completed"
    db.commit()
    db.close()

    return {"success": True, "message": "Checked out", "distance_meters": int(distance)}