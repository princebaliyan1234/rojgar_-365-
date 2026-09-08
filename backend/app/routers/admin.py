from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Union, User, WorkerProfile, Booking, DayRecord, LocalityPriceBand, Payment
from app.schemas.admin_schema import (
    UnionWorkerItem, KycUpdate, KycOut, UnionStats,
    PriceBandCreate, PriceBandOut,
)

admin_route = APIRouter()


def _get_descendant_union_ids(union_id: int, db: Session) -> list[int]:
    """Returns union_id plus every union nested beneath it (any depth)."""
    ids = [union_id]
    frontier = [union_id]
    while frontier:
        children = db.query(Union.id).filter(Union.parent_union_id.in_(frontier)).all()
        child_ids = [c[0] for c in children]
        if not child_ids:
            break
        ids.extend(child_ids)
        frontier = child_ids
    return ids


@admin_route.get("/unions/{union_id}/workers", response_model=list[UnionWorkerItem])
def get_union_workers(union_id: int, db: Session = Depends(get_db)):
    union_ids = _get_descendant_union_ids(union_id, db)

    rows = (
        db.query(User, WorkerProfile)
        .join(WorkerProfile, WorkerProfile.user_id == User.id)
        .filter(WorkerProfile.union_id.in_(union_ids))
        .all()
    )

    return [
        UnionWorkerItem(id=user.id, name=user.name, trade=profile.trade, kyc_status=profile.kyc_status)
        for user, profile in rows
    ]


@admin_route.patch("/workers/{worker_id}/kyc", response_model=KycOut)
def update_kyc(worker_id: int, payload: KycUpdate, db: Session = Depends(get_db)):
    if payload.kyc_status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="kyc_status must be 'approved' or 'rejected'")

    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == worker_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Worker profile not found")

    profile.kyc_status = payload.kyc_status
    db.commit()
    return KycOut(worker_id=worker_id, kyc_status=profile.kyc_status)


@admin_route.get("/unions/{union_id}/stats", response_model=UnionStats)
def get_union_stats(union_id: int, db: Session = Depends(get_db)):
    union_ids = _get_descendant_union_ids(union_id, db)

    worker_ids = [
        row[0] for row in
        db.query(WorkerProfile.user_id).filter(WorkerProfile.union_id.in_(union_ids)).all()
    ]

    total_bookings = 0
    total_distributed_earnings = 0.0
    welfare_fund_balance = 0.0

    if worker_ids:
        total_bookings = (
            db.query(Booking).filter(Booking.worker_id.in_(worker_ids)).count()
        )

        completed_days = (
            db.query(DayRecord, Payment)
            .join(Booking, DayRecord.booking_id == Booking.id)
            .join(Payment, Payment.day_record_id == DayRecord.id)
            .filter(
                Booking.worker_id.in_(worker_ids),
                DayRecord.status == "completed",
                Payment.status == "released",
            )
            .all()
        )

        total_distributed_earnings = round(
            sum(dr.wage_amount or 0.0 for dr, pay in completed_days), 2
        )
        welfare_fund_balance = round(
            sum((pay.amount or 0.0) - (dr.wage_amount or 0.0) for dr, pay in completed_days), 2
        )

    return UnionStats(
        total_bookings=total_bookings,
        total_distributed_earnings=total_distributed_earnings,
        welfare_fund_balance=welfare_fund_balance,
    )


@admin_route.get("/price-bands", response_model=PriceBandOut)
def get_price_band(union_id: int = Query(...), trade: str = Query(...), db: Session = Depends(get_db)):
    band = (
        db.query(LocalityPriceBand)
        .filter(LocalityPriceBand.union_id == union_id, LocalityPriceBand.trade == trade)
        .first()
    )
    if band is None:
        raise HTTPException(status_code=404, detail="No price band set for this union+trade")
    return band


@admin_route.post("/price-bands", response_model=PriceBandOut)
def set_price_band(payload: PriceBandCreate, db: Session = Depends(get_db)):
    if payload.floor > payload.ceiling:
        raise HTTPException(
            status_code=400,
            detail="floor cannot exceed ceiling"
        )

    band = (
        db.query(LocalityPriceBand)
        .filter(
            LocalityPriceBand.union_id == payload.union_id,
            LocalityPriceBand.trade == payload.trade
        )
        .first()
    )

    if band:
        # Update existing price band
        band.floor = payload.floor
        band.ceiling = payload.ceiling
    else:
        # Create new price band
        band = LocalityPriceBand(
            union_id=payload.union_id,
            trade=payload.trade,
            floor=payload.floor,
            ceiling=payload.ceiling
        )
        db.add(band)

    db.commit()
    db.refresh(band)

    return band

@admin_route.get("/admins/{admin_id}")
def get_admin_profile(admin_id: int, db: Session = Depends(get_db)):
    admin = db.query(User).filter(
        User.id == admin_id,
        User.role == "admin"
    ).first()

    if admin is None:
        raise HTTPException(status_code=404, detail="Admin not found")

    union_id = 4

    union = db.query(Union).filter(Union.id == union_id).first()

    return {
        "id": admin.id,
        "name": admin.name,
        "phone": admin.phone,
        "role": admin.role,
        "union": {
            "id": union.id,
            "name": union.name,
            "level": union.level
        } if union else None
    }