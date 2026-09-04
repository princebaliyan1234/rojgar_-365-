from fastapi import APIRouter
from datetime import datetime, timedelta
import random
from app.database import SessionLocal
from app.models import OtpCode

router = APIRouter()

@router.post("/send-otp")
def send_otp(phone: str):
    otp = str(random.randint(1000, 999999))
    expiry = datetime.utcnow() + timedelta(minutes=5)

    db = SessionLocal()
    new_otp = OtpCode(
        phone_or_booking_id=phone,
        code=otp,
        purpose="login",
        expires_at=expiry,
        verified=False
    )
    db.add(new_otp)
    db.commit()
    db.close()

    return {"message": "OTP sent", "otp": otp}

@router.post("/verify-otp")
def verify_otp(phone: str, code: str):
    db = SessionLocal()
    otp_entry = db.query(OtpCode).filter(
        OtpCode.phone_or_booking_id == phone,
        OtpCode.code == code,
        OtpCode.verified == False
    ).order_by(OtpCode.id.desc()).first()

    if not otp_entry:
        db.close()
        return {"success": False, "message": "Invalid OTP"}

    if otp_entry.expires_at < datetime.utcnow():
        db.close()
        return {"success": False, "message": "OTP expired"}

    otp_entry.verified = True
    db.commit()
    db.close()
    return {"success": True, "message": "OTP verified"}