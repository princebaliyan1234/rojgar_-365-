from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Booking, WorkerProfile, DayRecord, Payment
from app.schemas.checkout_schema import (
    CheckoutBreakdown,
    CheckoutConfirmRequest,
    DayPaymentResult,
)

checkout_route = APIRouter()

COMMISSION_RATE = 0.15
REMOTE_FEE = 20.0  # flat placeholder — replace with your actual figure if you have one


def _get_base_price(booking: Booking, db: Session) -> float:
    if booking.type == "custom_offer" and booking.price is not None:
        return booking.price

    profile = (
        db.query(WorkerProfile)
        .filter(WorkerProfile.user_id == booking.worker_id)
        .first()
    )
    if profile is None or profile.price is None:
        raise HTTPException(status_code=400, detail="Worker has no price set")
    return profile.price


def _calculate_breakdown(booking: Booking, base_price: float) -> dict:
    """
    base_price is a SINGLE DAY's rate for standard gigs, or the FULL 
    agreed amount for custom_offer (no per-day scaling needed there).
    Returns the full breakdown so base_total + commission + remote_fee == total, always.
    """
    if booking.type == "custom_offer":
        base_total = base_price
    else:
        base_total = base_price * booking.total_days

    commission = round(base_total * COMMISSION_RATE, 2)
    total = round(base_total + commission + REMOTE_FEE, 2)

    return {
        "base_price": round(base_total, 2),
        "commission": commission,
        "remote_fee": REMOTE_FEE,
        "total": total,
    }


@checkout_route.get("/bookings/{booking_id}/checkout", response_model=CheckoutBreakdown)
def get_checkout_breakdown(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    base_price = _get_base_price(booking, db)
    breakdown = _calculate_breakdown(booking, base_price)

    return CheckoutBreakdown(**breakdown)

@checkout_route.post("/bookings/{booking_id}/checkout", response_model=list[DayPaymentResult])
def confirm_checkout(
    booking_id: int,
    body: CheckoutConfirmRequest,
    db: Session = Depends(get_db),
):
    if not body.confirm:
        raise HTTPException(status_code=400, detail="confirm must be true")

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    existing = db.query(DayRecord).filter(DayRecord.booking_id == booking.id).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Checkout already confirmed for this booking")

    base_price = _get_base_price(booking, db)
    breakdown = _calculate_breakdown(booking, base_price)
    per_day_amount = round(breakdown["total"] / booking.total_days, 2)

    results = []
    for day_number in range(1, booking.total_days + 1):
        day_record = DayRecord(
            booking_id=booking.id,
            day_number=day_number,
            status="pending",
        )
        db.add(day_record)
        db.flush()

        payment = Payment(
            day_record_id=day_record.id,
            amount=per_day_amount,
            status="held",
        )
        db.add(payment)

        results.append(
            DayPaymentResult(
                day_record_id=day_record.id,
                day_number=day_number,
                payment_status=payment.status,
                amount=payment.amount,
            )
        )

    db.commit()
    return results