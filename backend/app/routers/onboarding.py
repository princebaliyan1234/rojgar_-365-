from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Union, WorkerProfile
from app.schemas.onboarding_schema import (
    LanguageOut,
    UserCreate,
    UserOut,
    UnionOut,
    WorkerProfileCreate,
    WorkerProfileOut,
)

onboarding_route = APIRouter()

SUPPORTED_LANGUAGES = [
    {"code": "en", "label": "English"},
    {"code": "hi", "label": "हिंदी"},
]


@onboarding_route.get("/languages")
def get_languages():
    return {"languages": SUPPORTED_LANGUAGES}


@onboarding_route.post("/users", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.phone == payload.phone).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Phone already registered")

    new_user = User(
        phone=payload.phone,
        name=payload.name,
        role=payload.role,
        locality=payload.locality,
        latitude=payload.latitude,
        longitude=payload.longitude,
        photo_url=payload.photo_url,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@onboarding_route.get("/unions", response_model=list[UnionOut])
def list_unions(
    level: str = Query(...),
    parent_union_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Union).filter(Union.level == level)
    if parent_union_id is not None:
        query = query.filter(Union.parent_union_id == parent_union_id)
    return query.all()


@onboarding_route.get("/unions/{union_id}", response_model=UnionOut)
def get_union(union_id: int, db: Session = Depends(get_db)):
    union = db.query(Union).filter(Union.id == union_id).first()
    if union is None:
        raise HTTPException(status_code=404, detail="Union not found")
    return union


@onboarding_route.post("/workers/profile", response_model=WorkerProfileOut)
def create_worker_profile(payload: WorkerProfileCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    union = db.query(Union).filter(Union.id == payload.union_id).first()
    if union is None:
        raise HTTPException(status_code=404, detail="Union not found")

    profile = WorkerProfile(
        user_id=payload.user_id,
        trade=payload.trade,
        union_id=payload.union_id,
        skill_cert=payload.skill_cert,
        kyc_status="pending",
        description=payload.description,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile