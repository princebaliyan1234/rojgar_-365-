from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth
from app.routers import booking
from app.routers import checkin
from app.routers import search
from app.routers import checkout
from app.routers import ledger
from app.routers import ledger


app = FastAPI()

app.include_router(ledger.ledger_route)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for local dev; would need tightening for real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(booking.router)
app.include_router(auth.router)
app.include_router(checkin.router)
app.include_router(search.search_route)
app.include_router(checkout.checkout_route)
app.include_router(ledger.ledger_route)


@app.get("/health")
def health():
    return {"status": "ok"}