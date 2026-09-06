from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth
from app.routers import booking
from app.routers import checkin
from app.routers import search

app = FastAPI()

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


@app.get("/health")
def health():
    return {"status": "ok"}