from pydantic import BaseModel


class CheckoutBreakdown(BaseModel):
    base_price: float
    commission: float
    remote_fee: float
    total: float


class CheckoutConfirmRequest(BaseModel):
    confirm: bool


class DayPaymentResult(BaseModel):
    day_record_id: int
    day_number: int
    payment_status: str
    amount: float