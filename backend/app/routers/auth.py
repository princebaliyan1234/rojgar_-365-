from fastapi import APIRouter
from datetime import datetime, timedelta
import random
from app.database import SessionLocal
from app.models import OtpCode
from app.models import User
from fastapi import HTTPException

router = APIRouter()

@router.post("/send-otp")
def send_otp(phone: str):
    otp = str(random.randint(100000, 999999))
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

    return {"message": "OTP sent", "otp": otp}          #For now its only for demo we haven't added any sms gateway.


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
        raise HTTPException(status_code=404, detail="Invalid OTP")

    if otp_entry.expires_at < datetime.utcnow():
        db.close()
        raise HTTPException(status_code=400, detail="OTP expired")

    otp_entry.verified = True
    db.commit()

    user = db.query(User).filter(User.phone == phone).first()
    db.close()

    return {
        "verified": True,
        "user_exists": user is not None,
        "user_id": user.id if user else None
    }
