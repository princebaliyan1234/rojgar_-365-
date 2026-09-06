import requests

BASE = "http://localhost:8000"
results = []


def check(label, condition, extra=""):
    status = "PASS" if condition else "FAIL"
    results.append((status, label, extra))
    print(f"[{status}] {label} {extra}")


def get_otp(day_record_id, purpose):
    # pulled from the request-otp response itself, since checkin.py returns it directly
    raise NotImplementedError  # replaced inline below


# ---------- MODULE 1: ONBOARDING ----------

r = requests.get(f"{BASE}/languages")
check("GET /languages", r.status_code == 200 and "languages" in r.json(), r.status_code)

r = requests.get(f"{BASE}/unions", params={"level": "district"})
check("GET /unions?level=district", r.status_code == 200 and len(r.json()) > 0, r.status_code)
district_id = r.json()[0]["id"] if r.status_code == 200 and r.json() else None

r = requests.get(f"{BASE}/unions", params={"level": "local", "parent_union_id": district_id})
check("GET /unions?level=local&parent_union_id=", r.status_code == 200 and len(r.json()) > 0, r.status_code)
local_union_id = r.json()[0]["id"] if r.status_code == 200 and r.json() else None

r = requests.get(f"{BASE}/unions/{local_union_id}")
check("GET /unions/{id}", r.status_code == 200, r.status_code)

r = requests.get(f"{BASE}/unions/999999")
check("GET /unions/{bad_id} -> 404", r.status_code == 404, r.status_code)

# create a fresh buyer
import random
phone_suffix = random.randint(100000, 999999)
r = requests.post(f"{BASE}/users", json={
    "phone": f"70000{phone_suffix}",
    "name": "Test Buyer",
    "role": "buyer",
    "locality": "Test Locality",
    "latitude": 28.98,
    "longitude": 77.70,
    "photo_url": None,
})
check("POST /users (buyer)", r.status_code == 200, r.status_code)
buyer_id = r.json()["id"] if r.status_code == 200 else None

# create a fresh worker
r = requests.post(f"{BASE}/users", json={
    "phone": f"80000{phone_suffix}",
    "name": "Test Worker",
    "role": "worker",
    "locality": "Test Locality",
    "latitude": 28.98,
    "longitude": 77.70,
    "photo_url": None,
})
check("POST /users (worker)", r.status_code == 200, r.status_code)
worker_user_id = r.json()["id"] if r.status_code == 200 else None

r = requests.post(f"{BASE}/workers/profile", json={
    "user_id": worker_user_id,
    "trade": "plumber",
    "union_id": local_union_id,
    "skill_cert": True,
    "description": "Test plumber profile",
})
check("POST /workers/profile", r.status_code == 200 and r.json().get("kyc_status") == "pending", r.status_code)

# ---------- MODULE 2: SEARCH & WORKER DETAIL ----------

r = requests.get(f"{BASE}/workers/{worker_user_id}")
check("GET /workers/{id}", r.status_code == 200, r.status_code)

r = requests.get(f"{BASE}/bookings", params={"customer_id": buyer_id, "worker_id": worker_user_id})
check("GET /bookings (both params) -> 400", r.status_code == 400, r.status_code)

r = requests.get(f"{BASE}/bookings")
check("GET /bookings (no params) -> 400", r.status_code == 400, r.status_code)

# ---------- MODULE 4: WORKER MODE (price + status + hours) ----------

r = requests.patch(f"{BASE}/workers/{worker_user_id}/price", json={"price": 850})
check("PATCH /workers/{id}/price", r.status_code == 200, r.status_code)

r = requests.patch(f"{BASE}/workers/{worker_user_id}/status", json={"is_online": True})
check("PATCH /workers/{id}/status", r.status_code == 200 and r.json().get("is_online") is True, r.status_code)

r = requests.patch(f"{BASE}/workers/{worker_user_id}/hours", json={"preferred_start": "09:00", "preferred_end": "18:00"})
check("PATCH /workers/{id}/hours", r.status_code == 200, r.status_code)

# ---------- MODULE 6: KYC (approve so search + booking flow works cleanly) ----------

r = requests.patch(f"{BASE}/workers/{worker_user_id}/kyc", json={"kyc_status": "approved"})
check("PATCH /workers/{id}/kyc", r.status_code == 200 and r.json().get("kyc_status") == "approved", r.status_code)

# ---------- MODULE 2 continued: search should now find this worker ----------

r = requests.get(f"{BASE}/search", params={"trade": "plumber", "locality": "Test Locality"})
found = r.status_code == 200 and any(w["id"] == worker_user_id for w in r.json())
check("GET /search finds new approved worker", found, r.status_code)

# ---------- MODULE 2: booking creation ----------

r = requests.post(f"{BASE}/bookings", json={
    "type": "gig",
    "payment_model": "daily",
    "job_notes": "full backend test",
    "customer_id": buyer_id,
    "worker_id": worker_user_id,
    "price": None,
    "total_days": 1,
})
check("POST /bookings", r.status_code == 200, r.status_code)
booking_id = r.json()["id"] if r.status_code == 200 else None

r = requests.post(f"{BASE}/bookings", json={
    "type": "gig", "payment_model": "daily", "job_notes": "bad",
    "customer_id": buyer_id, "worker_id": worker_user_id, "price": None, "total_days": 0,
})
check("POST /bookings total_days=0 -> 400", r.status_code == 400, r.status_code)

r = requests.post(f"{BASE}/bookings", json={
    "type": "gig", "payment_model": "daily", "job_notes": "bad",
    "customer_id": 999999, "worker_id": worker_user_id, "price": None, "total_days": 1,
})
check("POST /bookings bad customer_id -> 404", r.status_code == 404, r.status_code)

r = requests.get(f"{BASE}/bookings/{booking_id}")
check("GET /bookings/{id}", r.status_code == 200, r.status_code)

r = requests.get(f"{BASE}/bookings", params={"worker_id": worker_user_id})
check("GET /bookings?worker_id=", r.status_code == 200 and len(r.json()) >= 1, r.status_code)

# ---------- MODULE 3: CHECKOUT / ESCROW ----------

r = requests.get(f"{BASE}/bookings/{booking_id}/checkout")
check("GET /bookings/{id}/checkout (breakdown)", r.status_code == 200, r.status_code)

r = requests.post(f"{BASE}/bookings/{booking_id}/checkout", json={"confirm": True})
check("POST /bookings/{id}/checkout (confirm)", r.status_code == 200 and len(r.json()) == 1, r.status_code)
day_record_id = r.json()[0]["day_record_id"] if r.status_code == 200 else None

r = requests.post(f"{BASE}/bookings/{booking_id}/checkout", json={"confirm": True})
check("POST /bookings/{id}/checkout again -> 400", r.status_code == 400, r.status_code)

r = requests.get(f"{BASE}/day-records/{day_record_id}")
check("GET /day-records/{id} (pending)", r.status_code == 200 and r.json()["status"] == "pending", r.status_code)

# check-in
r = requests.post(f"{BASE}/day-records/{day_record_id}/checkin/request-otp")
check("POST checkin/request-otp", r.status_code == 200, r.status_code)
checkin_otp = r.json().get("otp")

r = requests.post(f"{BASE}/day-records/{day_record_id}/checkin/confirm",
                   params={"code": checkin_otp, "worker_lat": 28.98, "worker_lon": 77.70})
check("POST checkin/confirm", r.status_code == 200 and r.json()["status"] == "in_progress", r.status_code)

r = requests.get(f"{BASE}/day-records/{day_record_id}")
check("GET /day-records/{id} (in_progress)", r.status_code == 200 and r.json()["status"] == "in_progress", r.status_code)

# check-out
r = requests.post(f"{BASE}/day-records/{day_record_id}/checkout/request-otp")
check("POST checkout/request-otp", r.status_code == 200, r.status_code)
checkout_otp = r.json().get("otp")

r = requests.post(f"{BASE}/day-records/{day_record_id}/checkout/confirm",
                   params={"code": checkout_otp, "worker_lat": 28.98, "worker_lon": 77.70})
check("POST checkout/confirm", r.status_code == 200 and r.json()["status"] == "completed", r.status_code)
wage_amount = r.json().get("wage_amount") if r.status_code == 200 else None

r = requests.post(f"{BASE}/day-records/{day_record_id}/checkout/confirm",
                   params={"code": "000000", "worker_lat": 28.98, "worker_lon": 77.70})
check("POST checkout/confirm again -> 400 (already completed)", r.status_code == 400, r.status_code)

r = requests.get(f"{BASE}/day-records/{day_record_id}")
check("GET /day-records/{id} (completed)", r.status_code == 200 and r.json()["status"] == "completed", r.status_code)

r = requests.get(f"{BASE}/day-records/999999")
check("GET /day-records/{bad_id} -> 404", r.status_code == 404, r.status_code)

# ---------- LEDGER ----------

r = requests.get(f"{BASE}/workers/{worker_user_id}/ledger")
check("GET /workers/{id}/ledger", r.status_code == 200 and r.json()["total_jobs"] >= 1, r.status_code)

# ---------- MODULE 4: complete + respond ----------

r = requests.patch(f"{BASE}/bookings/{booking_id}/complete")
check("PATCH /bookings/{id}/complete", r.status_code == 200 and r.json()["status"] == "completed", r.status_code)

# ---------- MODULE 5: REVIEW ----------

r = requests.post(f"{BASE}/bookings/{booking_id}/review", json={"rating": 5, "review_text": "Great work, on time."})
check("POST /bookings/{id}/review", r.status_code == 200, r.status_code)

r = requests.post(f"{BASE}/bookings/{booking_id}/review", json={"rating": 4, "review_text": "again"})
check("POST /bookings/{id}/review again -> 400", r.status_code == 400, r.status_code)

r = requests.get(f"{BASE}/workers/{worker_user_id}")
check("GET /workers/{id} shows updated rating_avg", r.status_code == 200 and r.json()["rating_avg"] == 5.0, r.json().get("rating_avg"))

# ---------- MODULE 6: ADMIN ----------

r = requests.get(f"{BASE}/unions/{local_union_id}/workers")
check("GET /unions/{id}/workers", r.status_code == 200 and any(w["id"] == worker_user_id for w in r.json()), r.status_code)

r = requests.get(f"{BASE}/unions/{district_id}/stats")
check("GET /unions/{district_id}/stats", r.status_code == 200, r.json() if r.status_code == 200 else r.status_code)

r = requests.post(f"{BASE}/price-bands", json={"union_id": local_union_id, "trade": "plumber", "floor": 700, "ceiling": 950})
check("POST /price-bands", r.status_code == 200, r.status_code)

r = requests.get(f"{BASE}/price-bands", params={"union_id": local_union_id, "trade": "plumber"})
check("GET /price-bands", r.status_code == 200, r.status_code)

r = requests.patch(f"{BASE}/workers/{worker_user_id}/price", json={"price": 1000})
check("PATCH /price now warns (above ceiling)", r.status_code == 200 and r.json().get("warning") is not None, r.json())

# ---------- SUMMARY ----------
print("\n--- SUMMARY ---")
passed = sum(1 for s, _, _ in results if s == "PASS")
print(f"{passed}/{len(results)} passed")
for s, label, extra in results:
    if s == "FAIL":
        print(f"FAILED: {label} ({extra})")