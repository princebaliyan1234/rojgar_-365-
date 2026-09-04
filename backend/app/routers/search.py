from fastapi import APIRouter, Depends, HTTPException
search_route = APIRouter()

from sqlalchemy.orm import Session
from geopy.distance import geodesic

from app.database import get_db
from app.models import User, WorkerProfile, WorkerPhoto

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

    def build_result(user, profile, distance_km=None):
        return SearchResult(
            id=user.id,
            name=user.name,
            trade=profile.trade,
            locality=user.locality,
            price=profile.price,
            rating_avg=profile.rating_avg,
            photo_urls=get_photo_urls(user.id),
            latitude=user.latitude,
            longitude=user.longitude,
            distance_km=distance_km
        )

    # No coordinates given — return plain locality/trade matches, no distance sorting
    if lat is None or lon is None:
        return [build_result(user, profile) for user, profile in rows]

    origin = (lat, lon)
    results = []

    for user, profile in rows:
        if user.latitude is None or user.longitude is None:
            continue  # skip anyone with no location data instead of crashing

        worker_point = (user.latitude, user.longitude)
        distance = geodesic(origin, worker_point).km

        if proximity is not None and distance > proximity:
            continue  # outside requested radius

        results.append(build_result(user, profile, round(distance, 2)))

    results.sort(key=lambda r: (r.distance_km is None, r.distance_km))

    return results