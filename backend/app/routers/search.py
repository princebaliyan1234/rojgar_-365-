from fastapi import APIRouter, Depends, HTTPException
search_route = APIRouter()

from sqlalchemy.orm import Session
from geopy.distance import geodesic

from app.database import get_db
from app.models import User, WorkerProfile, WorkerPhoto, Booking, Review

from app.schemas.search_schema import SearchResult

@search_route.get("/search", response_model=list[SearchResult])
def search(
    trade: str,
    locality: str,
    lat: float | None = None,
    lon: float | None = None,
    proximity: float | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(User, WorkerProfile).join(
        WorkerProfile, User.id == WorkerProfile.user_id
    ).filter(
        User.locality.ilike(f"%{locality}%"),
        WorkerProfile.trade.ilike(f"%{trade}%")
    )

    rows = query.all()  # each row is a (User, WorkerProfile) tuple

    def get_photo_urls(user_id: int) -> list[str]:
        photos = (
            db.query(WorkerPhoto)
            .filter(WorkerPhoto.worker_id == user_id)
            .order_by(WorkerPhoto.position)
            .all()
        )
        return [p.url for p in photos]

    def get_review_count(user_id: int) -> int:
        return (
            db.query(Review)
            .join(Booking, Review.booking_id == Booking.id)
            .filter(Booking.worker_id == user_id)
            .count()
        )

    def build_result(user, profile, distance_km=None):
        return SearchResult(
            id=user.id,
            name=user.name,
            trade=profile.trade,
            locality=user.locality,
            price=profile.price,
            rating_avg=profile.rating_avg,
            review_count=get_review_count(user.id),
            kyc_status=profile.kyc_status,
            photo_urls=get_photo_urls(user.id),
            latitude=user.latitude,
            longitude=user.longitude,
            distance_km=distance_km
        )

    if proximity is not None and (lat is None or lon is None):
        raise HTTPException(status_code=400, detail="proximity requires lat and lon")


    # No coordinates given — return plain locality/trade matches, no distance sorting
    if lat is None or lon is None:
        return [build_result(user, profile) for user, profile in rows]



    origin = (lat, lon)
    all_with_distance = []

    for user, profile in rows:
        if user.latitude is None or user.longitude is None:
            continue

        worker_point = (user.latitude, user.longitude)
        distance = geodesic(origin, worker_point).km
        all_with_distance.append((user, profile, round(distance, 2)))

    all_with_distance.sort(key=lambda r: r[2])

    if proximity is not None:
        within_radius = [r for r in all_with_distance if r[2] <= proximity]
        if within_radius:
            return [build_result(u, p, d) for u, p, d in within_radius]
        elif all_with_distance:
            nearest_user, nearest_profile, nearest_distance = all_with_distance[0]
            return [build_result(nearest_user, nearest_profile, nearest_distance)]
        else:
            return []

    return [build_result(u, p, d) for u, p, d in all_with_distance]



    