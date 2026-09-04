from fastapi import FastAPI
from app.routers import auth
from app.routers import booking
from app.routers import search

app = FastAPI()
app.include_router(booking.router)
app.include_router(auth.router)
app.include_router(search.search_route)

@app.get("/health")
def health():
    return {"status": "ok"}