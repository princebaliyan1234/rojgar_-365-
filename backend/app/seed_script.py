import json
from pathlib import Path

from app.database import engine, init_db
from sqlalchemy.orm import Session
from app.models import Union, User, WorkerProfile, WorkerPhoto, LocalityPriceBand, Booking, Review

# Make sure tables actually exist before we try to insert anything
init_db()

# seed.json lives one folder up, inside seed_data/
BASE_DIR = Path(__file__).resolve().parent
SEED_FILE = BASE_DIR.parent / "seed_data" / "seed.json"

with open(SEED_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

with Session(engine) as session:

    for item in data["unions"]:
        session.merge(Union(
            id=item["id"],
            name=item["name"],
            level=item["level"],
            parent_union_id=item.get("parent_union_id")
        ))

    for item in data["users"]:
        session.merge(User(
            id=item["id"],
            phone=item["phone"],
            name=item["name"],
            role=item["role"],
            locality=item["locality"],
            latitude=item.get("latitude"),
            longitude=item.get("longitude"),
            photo_url=item.get("photo_url")
        ))

    for item in data["worker_profiles"]:
        session.merge(WorkerProfile(
            id=item["id"],
            user_id=item["user_id"],
            trade=item["trade"],
            union_id=item["union_id"],
            skill_cert=item.get("skill_cert", False),
            price=item.get("price"),
            kyc_status=item.get("kyc_status", "pending"),
            rating_avg=item.get("rating_avg", 0.0)
        ))

    for item in data["worker_photos"]:
        session.merge(WorkerPhoto(
            id=item["id"],
            worker_id=item["worker_id"],
            url=item["url"],
            position=item["position"]
        ))

    for item in data["price_bands"]:
        session.merge(LocalityPriceBand(
            id=item["id"],
            union_id=item["union_id"],
            trade=item["trade"],
            floor=item["floor"],
            ceiling=item["ceiling"]
        ))

    for item in data["bookings"]:
        session.merge(Booking(
            id=item["id"],
            customer_id=item["customer_id"],
            worker_id=item["worker_id"],
            type=item["type"],
            status=item["status"],
            payment_model=item["payment_model"],
            total_days=item["total_days"]
        ))

    for item in data["reviews"]:
        session.merge(Review(
            id=item["id"],
            booking_id=item["booking_id"],
            rating=item["rating"],
            review_text=item["review_text"]
        ))

    session.commit()

print("Seed data inserted successfully!")