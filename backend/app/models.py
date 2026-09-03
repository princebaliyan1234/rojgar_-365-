from sqlalchemy import (
    Column, Integer, String, Boolean, Float, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    phone = Column(String, unique=True, nullable=False)
    name = Column(String)
    role = Column(String, nullable=False)
    locality = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    photo_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    worker_profile = relationship("WorkerProfile", back_populates="user", uselist=False)


class Union(Base):
    __tablename__ = "unions"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    level = Column(String, nullable=False)   # "local" / "district" / "state"
    parent_union_id = Column(Integer, ForeignKey("unions.id"))

    parent = relationship("Union", remote_side=[id], backref="children")


class WorkerProfile(Base):
    __tablename__ = "worker_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    trade = Column(String)
    union_id = Column(Integer, ForeignKey("unions.id"))
    kyc_status = Column(String, default="pending")
    skill_cert = Column(Boolean, default=False)
    price = Column(Float)
    preferred_start = Column(String)
    preferred_end = Column(String)
    is_online = Column(Boolean, default=False)
    rating_avg = Column(Float, default=0.0)

    user = relationship("User", back_populates="worker_profile")
    union = relationship("Union")


class WorkerPhoto(Base):
    __tablename__ = "worker_photos"
    id = Column(Integer, primary_key=True)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    url = Column(String, nullable=False)
    position = Column(Integer, default=0)


class LocalityPriceBand(Base):
    __tablename__ = "locality_price_bands"
    id = Column(Integer, primary_key=True)
    union_id = Column(Integer, ForeignKey("unions.id"), nullable=False)
    trade = Column(String, nullable=False)
    floor = Column(Float, nullable=False)
    ceiling = Column(Float, nullable=False)


class OtpCode(Base):
    __tablename__ = "otp_codes"
    id = Column(Integer, primary_key=True)
    phone_or_booking_id = Column(String, nullable=False)
    code = Column(String, nullable=False)
    purpose = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    verified = Column(Boolean, default=False)


class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, default="gig")
    status = Column(String, default="requested")
    payment_model = Column(String, default="daily")
    price = Column(Float)
    job_notes = Column(String)
    total_days = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    day_records = relationship("DayRecord", back_populates="booking")
    review = relationship("Review", back_populates="booking", uselist=False)


class DayRecord(Base):
    __tablename__ = "day_records"
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    day_number = Column(Integer, nullable=False)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    wage_amount = Column(Float)
    status = Column(String, default="pending")
    remarks = Column(String)

    booking = relationship("Booking", back_populates="day_records")
    payment = relationship("Payment", back_populates="day_record", uselist=False)
    ledger_entry = relationship("LedgerEntry", back_populates="day_record", uselist=False)


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    day_record_id = Column(Integer, ForeignKey("day_records.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="held")

    day_record = relationship("DayRecord", back_populates="payment")


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    id = Column(Integer, primary_key=True)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    day_record_id = Column(Integer, ForeignKey("day_records.id"), nullable=False)
    hash = Column(String, nullable=False)
    previous_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    day_record = relationship("DayRecord", back_populates="ledger_entry")


class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    rating = Column(Integer)
    review_text = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="review")