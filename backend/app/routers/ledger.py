from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, DayRecord, Booking, LedgerEntry
from app.services.hash_chain import verify_hash
from app.schemas.ledger_schema import LedgerResponse, LedgerEntryResult

ledger_route = APIRouter()


@ledger_route.get("/workers/{worker_id}/ledger", response_model=LedgerResponse)
def get_ledger(worker_id: int, db: Session = Depends(get_db)):
    worker = db.query(User).filter(User.id == worker_id).first()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    entries = (
        db.query(LedgerEntry)
        .filter(LedgerEntry.worker_id == worker_id)
        .order_by(LedgerEntry.id.asc())
        .all()
    )

    total_jobs = (
        db.query(DayRecord)
        .join(Booking, DayRecord.booking_id == Booking.id)
        .filter(Booking.worker_id == worker_id, DayRecord.status == "completed")
        .count()
    )

    result_entries = []
    total_earnings = 0.0

    for entry in entries:
        day_record = db.query(DayRecord).filter(DayRecord.id == entry.day_record_id).first()
        if day_record is None:
            continue

        record_data = {
            "day_record_id": day_record.id,
            "day_number": day_record.day_number,
            "wage_amount": day_record.wage_amount,
        }
        is_verified = verify_hash(record_data, entry.previous_hash, entry.hash)

        total_earnings += day_record.wage_amount or 0.0

        result_entries.append(
            LedgerEntryResult(
                booking_id=day_record.booking_id,
                day_record_id=day_record.id,
                day_number=day_record.day_number,
                wage_amount=day_record.wage_amount,
                remarks=day_record.remarks,
                hash=entry.hash,
                verified=is_verified,
    )
)

    return LedgerResponse(
        total_jobs=total_jobs,
        total_earnings=round(total_earnings, 2),
        entries=result_entries,
    )