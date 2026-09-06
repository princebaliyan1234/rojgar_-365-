from pydantic import BaseModel


class LanguageOut(BaseModel):
    code: str
    label: str


class UserCreate(BaseModel):
    phone: str
    name: str
    role: str
    locality: str
    latitude: float | None = None
    longitude: float | None = None
    photo_url: str | None = None


class UserOut(BaseModel):
    id: int
    phone: str
    name: str
    role: str
    locality: str

    model_config = {"from_attributes": True}


class UnionOut(BaseModel):
    id: int
    name: str
    level: str
    parent_union_id: int | None = None

    model_config = {"from_attributes": True}


class WorkerProfileCreate(BaseModel):
    user_id: int
    trade: str
    union_id: int
    skill_cert: bool = False
    description: str | None = None


class WorkerProfileOut(BaseModel):
    id: int
    user_id: int
    trade: str
    union_id: int
    kyc_status: str
    price: float | None = None
    is_online: bool
    description: str | None = None

    model_config = {"from_attributes": True}