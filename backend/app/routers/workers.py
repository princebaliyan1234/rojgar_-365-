from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User,
    WorkerProfile,
    WorkerPhoto,
    Union,
    Booking,
    Review,
    LocalityPriceBand,
)
from app.schemas.worker_schema import WorkerDetail
from app.schemas.worker_mode_schema import (
    StatusToggle,
    StatusOut,
    HoursUpdate,
    HoursOut,
    JobRequestItem,
)
from app.services.price_validation import validate_price
from app.schemas.price_schema import PriceUpdate, PriceOut


worker_route = APIRouter()


@worker_route.patch(
    "/workers/{worker_id}/price",
    response_model=PriceOut
)
def set_worker_price(
    worker_id: int,
    payload: PriceUpdate,
    db: Session = Depends(get_db)
):
    profile = (
        db.query(WorkerProfile)
        .filter(WorkerProfile.user_id == worker_id)
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Worker profile not found"
        )

    band = (
        db.query(LocalityPriceBand)
        .filter(
            LocalityPriceBand.union_id == profile.union_id,
            LocalityPriceBand.trade == profile.trade,
        )
        .first()
    )

    warning = None
    floor = None
    ceiling = None

    if band is not None:
        floor = band.floor
        ceiling = band.ceiling

        warning = validate_price(
            payload.price,
            band.floor,
            band.ceiling
        )

    profile.price = payload.price

    db.commit()

    return PriceOut(
        price=profile.price,
        union_floor=floor,
        union_ceiling=ceiling,
        warning=warning,
    )


@worker_route.get(
    "/workers/{worker_id}",
    response_model=WorkerDetail
)
def get_worker(
    worker_id: int,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.id == worker_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="Worker not found"
        )

    profile = (
        db.query(WorkerProfile)
        .filter(WorkerProfile.user_id == worker_id)
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Worker profile not found"
        )

    union = (
        db.query(Union)
        .filter(Union.id == profile.union_id)
        .first()
    )

    district_union = None
    state_union = None

    if union is not None and union.parent_union_id is not None:
        district_union = (
            db.query(Union)
            .filter(
                Union.id == union.parent_union_id
            )
            .first()
        )

        if (
            district_union is not None
            and district_union.parent_union_id is not None
        ):
            state_union = (
                db.query(Union)
                .filter(
                    Union.id
                    == district_union.parent_union_id
                )
                .first()
            )

    photos = (
        db.query(WorkerPhoto)
        .filter(
            WorkerPhoto.worker_id == worker_id
        )
        .order_by(WorkerPhoto.position)
        .all()
    )

    review_count = (
        db.query(Review)
        .join(
            Booking,
            Review.booking_id == Booking.id
        )
        .filter(
            Booking.worker_id == worker_id
        )
        .count()
    )

    return WorkerDetail(
        id=user.id,
        name=user.name,
        trade=profile.trade,
        union_id=profile.union_id,
        union_name=union.name if union else "",
        district_union_name=(
            district_union.name
            if district_union
            else None
        ),
        state_union_name=(
            state_union.name
            if state_union
            else None
        ),
        price=profile.price,
        rating_avg=profile.rating_avg,
        review_count=review_count,
        photo_url=user.photo_url,     
        photo_urls=[
            p.url for p in photos
        ],
        kyc_status=profile.kyc_status,
        description=profile.description,
        latitude=user.latitude,
        longitude=user.longitude,
    )


@worker_route.patch(
    "/workers/{worker_id}/status",
    response_model=StatusOut
)
def set_worker_status(
    worker_id: int,
    payload: StatusToggle,
    db: Session = Depends(get_db)
):
    profile = (
        db.query(WorkerProfile)
        .filter(
            WorkerProfile.user_id == worker_id
        )
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Worker profile not found"
        )

    profile.is_online = payload.is_online

    db.commit()

    return StatusOut(
        worker_id=worker_id,
        is_online=profile.is_online
    )


@worker_route.patch(
    "/workers/{worker_id}/hours",
    response_model=HoursOut
)
def set_worker_hours(
    worker_id: int,
    payload: HoursUpdate,
    db: Session = Depends(get_db)
):
    profile = (
        db.query(WorkerProfile)
        .filter(
            WorkerProfile.user_id == worker_id
        )
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Worker profile not found"
        )

    profile.preferred_start = payload.preferred_start
    profile.preferred_end = payload.preferred_end

    db.commit()

    return HoursOut(
        preferred_start=profile.preferred_start,
        preferred_end=profile.preferred_end
    )


@worker_route.get(
    "/workers/{worker_id}/requests",
    response_model=list[JobRequestItem]
)
def get_worker_requests(
    worker_id: int,
    db: Session = Depends(get_db)
):
    bookings = (
        db.query(Booking)
        .filter(
            Booking.worker_id == worker_id,
            Booking.status == "requested"
        )
        .all()
    )

    return [
        JobRequestItem(
            booking_id=b.id,
            customer_id=b.customer_id,
            type=b.type,
            total_days=b.total_days,
            created_at=str(b.created_at),
        )
        for b in bookings
    ]


@worker_route.patch(
    "/workers/{worker_id}/location"
)
def set_worker_location(
    worker_id: int,
    latitude: float,
    longitude: float,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.id == worker_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="Worker not found"
        )

    user.latitude = latitude
    user.longitude = longitude

    db.commit()

    return {
        "worker_id": worker_id,
        "latitude": user.latitude,
        "longitude": user.longitude,
    }
