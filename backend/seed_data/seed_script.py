import json
from pathlib import Path

from database import engine
from sqlalchemy.orm import Session
from models import Union, User, WorkerProfile, WorkerPhoto, LocalityPriceBand, Booking, Review


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "app.db"



with open(BASE_DIR / "seed.json", "r", encoding="utf-8") as f:
    data = json.load(f)


with Session(engine) as session:

    for item in data["unions"]:
        union = Union(
            id=item["id"],
            name=item["name"],
            level=item["level"],
            parent_union_id=item.get("parent_union_id")
        )

        session.merge(union)

    for item in data["users"]:
        user = User(
            id=item["id"],
            phone=item["phone"],
            name=item["name"],
            role=item["role"],
            locality=item["locality"]
        )

        session.merge(user)
    from models import WorkerProfile

    for item in data["worker_profiles"]:
        wp = WorkerProfile(
            id=item["id"],
            user_id=item["user_id"],
            trade=item["trade"],
            union_id=item["union_id"],
            skill_cert=item.get("skill_cert", False),
            price=item.get("price"),
            kyc_status=item.get("kyc_status", "pending"),
            rating_avg=item.get("rating_avg", 0.0)
        )
        session.merge(wp)

    from models import WorkerPhoto, LocalityPriceBand, Booking, Review
    for item in data["worker_photos"]:
        wp = WorkerPhoto(
            id=item["id"],
            worker_id=item["worker_id"],
            url=item["url"],
            position=item["position"]
        )
        session.merge(wp)

    for item in data["price_bands"]:
        pb = LocalityPriceBand(
            id=item["id"],
            union_id=item["union_id"],
            trade=item["trade"],
            floor=item["floor"],
            ceiling=item["ceiling"]
        )
        session.merge(pb)

    for item in data["bookings"]:
        b = Booking(
            id=item["id"],
            customer_id=item["customer_id"],
            worker_id=item["worker_id"],
            type=item["type"],
            status=item["status"],
            payment_model=item["payment_model"],
            total_days=item["total_days"]
        )
        session.merge(b)

    for item in data["reviews"]:
        r = Review(
            id=item["id"],
            booking_id=item["booking_id"],
            rating=item["rating"],
            review_text=item["review_text"]
        )
        session.merge(r)
    session.commit()


print("Seed data inserted successfully!")

