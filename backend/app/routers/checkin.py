from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import random
from geopy.distance import geodesic
from app.database import SessionLocal
from app.models import Booking, DayRecord, User, OtpCode, Payment, WorkerProfile
from app.services.wage_calc import calculate_wage
from app.models import LedgerEntry
from app.services.hash_chain import compute_hash
from app.schemas.day_record_schema import DayRecordDetail

router = APIRouter()

DISTANCE_LIMIT_METERS = 500
OTP_EXPIRY_MINUTES = 5

@router.get("/day-records/{day_record_id}", response_model=DayRecordDetail)
def get_day_record(day_record_id: int):
    db = SessionLocal()
    day_record = db.query(DayRecord).filter(DayRecord.id == day_record_id).first()
    db.close()

    if not day_record:
        raise HTTPException(status_code=404, detail="Day record not found")

    return day_record

def _get_customer_location(db, day_record):
    booking = db.query(Booking).filter(Booking.id == day_record.booking_id).first()
    customer = db.query(User).filter(User.id == booking.customer_id).first()
    if customer.latitude is None or customer.longitude is None:
        raise HTTPException(status_code=400, detail="Customer location not set")
    return customer.latitude, customer.longitude


def _check_distance(customer_lat, customer_lon, worker_lat, worker_lon):
    distance = geodesic((worker_lat, worker_lon), (customer_lat, customer_lon)).meters
    if distance > DISTANCE_LIMIT_METERS:
        raise HTTPException(status_code=400, detail=f"Too far from job site ({int(distance)}m away)")
    return distance


# ---------- CHECK-IN ----------

@router.post("/day-records/{day_record_id}/checkin/request-otp")
def checkin_request_otp(day_record_id: int):
    db = SessionLocal()
    day_record = db.query(DayRecord).filter(DayRecord.id == day_record_id).first()
    if not day_record:
        db.close()
        raise HTTPException(status_code=404, detail="Day record not found")

    otp = str(random.randint(100000, 999999))
    expiry = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    new_otp = OtpCode(
        phone_or_booking_id=str(day_record_id),
        code=otp,
        purpose="checkin",
        expires_at=expiry,
        verified=False
    )
    db.add(new_otp)
    db.commit()
    db.close()

    return {"status": "sent", "expires_in_seconds": OTP_EXPIRY_MINUTES * 60, "otp": otp}


@router.post("/day-records/{day_record_id}/checkin/confirm")
def checkin_confirm(day_record_id: int, code: str, worker_lat: float, worker_lon: float):
    db = SessionLocal()
    day_record = db.query(DayRecord).filter(DayRecord.id == day_record_id).first()
    if not day_record:
        db.close()
        raise HTTPException(status_code=404, detail="Day record not found")

    if day_record.status in ("in_progress", "completed"):
        db.close()
        raise HTTPException(status_code=400, detail="This day has already been checked in")

    otp_entry = db.query(OtpCode).filter(
        OtpCode.phone_or_booking_id == str(day_record_id),
        OtpCode.code == code,
        OtpCode.purpose == "checkin",
        OtpCode.verified == False
    ).order_by(OtpCode.id.desc()).first()

    if not otp_entry:
        db.close()
        raise HTTPException(status_code=404, detail="Invalid OTP")
    if otp_entry.expires_at < datetime.utcnow():
        db.close()
        raise HTTPException(status_code=400, detail="OTP expired")

    customer_lat, customer_lon = _get_customer_location(db, day_record)
    _check_distance(customer_lat, customer_lon, worker_lat, worker_lon)

    otp_entry.verified = True
    day_record.start_time = datetime.utcnow()
    day_record.status = "in_progress"
    db.commit()
    result = {
    "day_record_id": day_record_id,
    "start_time": day_record.start_time,   
    "status": day_record.status
}
    db.close()

    return result
   

# ---------- CHECK-OUT ----------

@router.post("/day-records/{day_record_id}/checkout/request-otp")
def checkout_request_otp(day_record_id: int):
    db = SessionLocal()
    day_record = db.query(DayRecord).filter(DayRecord.id == day_record_id).first()
    if not day_record:
        db.close()
        raise HTTPException(status_code=404, detail="Day record not found")

    otp = str(random.randint(100000, 999999))
    expiry = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    new_otp = OtpCode(
        phone_or_booking_id=str(day_record_id),
        code=otp,
        purpose="checkout",
        expires_at=expiry,
        verified=False
    )
    db.add(new_otp)
    db.commit()
    db.close()

    return {"status": "sent", "expires_in_seconds": OTP_EXPIRY_MINUTES * 60, "otp": otp}


@router.post("/day-records/{day_record_id}/checkout/confirm")
def checkout_confirm(day_record_id: int, code: str, worker_lat: float, worker_lon: float):
    db = SessionLocal()
    day_record = db.query(DayRecord).filter(DayRecord.id == day_record_id).first()
    
    if not day_record:
        db.close()
        raise HTTPException(status_code=404, detail="Day record not found")

    if day_record.status == "completed":
        db.close()
        raise HTTPException(status_code=400, detail="This day has already been checked out")
    
    
    
    otp_entry = db.query(OtpCode).filter(
        OtpCode.phone_or_booking_id == str(day_record_id),
        OtpCode.code == code,
        OtpCode.purpose == "checkout",
        OtpCode.verified == False
    ).order_by(OtpCode.id.desc()).first()

    if not otp_entry:
        db.close()
        raise HTTPException(status_code=404, detail="Invalid OTP")
    if otp_entry.expires_at < datetime.utcnow():
        db.close()
        raise HTTPException(status_code=400, detail="OTP expired")

    customer_lat, customer_lon = _get_customer_location(db, day_record)
    _check_distance(customer_lat, customer_lon, worker_lat, worker_lon)

    otp_entry.verified = True
    day_record.end_time = datetime.utcnow()
    day_record.status = "completed"

    booking = db.query(Booking).filter(Booking.id == day_record.booking_id).first()
    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == booking.worker_id).first()

    if profile is None:
        db.close()
        raise HTTPException(status_code=400, detail="Worker profile not found")

    day_record.wage_amount = calculate_wage(booking, profile)


    last_entry = (
        db.query(LedgerEntry)
        .filter(LedgerEntry.worker_id == booking.worker_id)
        .order_by(LedgerEntry.id.desc())
        .first()
    )
    previous_hash = last_entry.hash if last_entry else "0"

    record_data = {
        "day_record_id": day_record.id,
        "day_number": day_record.day_number,
        "wage_amount": day_record.wage_amount,
    }
    new_hash = compute_hash(record_data, previous_hash)

    ledger_entry = LedgerEntry(
        worker_id=booking.worker_id,
        day_record_id=day_record.id,
        hash=new_hash,
        previous_hash=previous_hash,
    )
    db.add(ledger_entry)

    payment = db.query(Payment).filter(Payment.day_record_id == day_record_id).first()
    if payment:
        payment.status = "released"
        # payment.amount stays as-is — it's the customer-facing total 
        # (base + commission + remote fee), separate from wage_amount 
        # (the worker's payout). Platform commission = payment.amount - day_record.wage_amount.

    db.commit()

    result = {
        "day_record_id": day_record_id,
        "end_time": day_record.end_time,
        "wage_amount": day_record.wage_amount,

        "payment_status": payment.status if payment else None,
        "status": day_record.status,
    }
    db.close()

    return result
