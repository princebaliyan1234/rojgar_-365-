from app.routers import auth
from fastapi import FastAPI
from app.routers import booking

app = FastAPI()
app.include_router(booking.router)
app.include_router(auth.router)
@app.get("/health")


def health():
    return {"status": "ok"}