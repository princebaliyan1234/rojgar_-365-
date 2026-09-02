# API Contract — Cooperative Gig Services Platform

## Module 1: Onboarding & Auth

### Get supported languages
Method + Path: GET /languages
Request: none
Response: { "languages": [{"code": "en", "label": "English"}, {"code": "hi", "label": "हिंदी"}] }
Notes: static list, no DB table needed

### Request OTP (login)
Method + Path: POST /auth/otp/request
Request: { "phone": string }
Response: { "status": "sent", "expires_in_seconds": int }
Notes: writes an otp_codes row with purpose="login". 400 if phone malformed.

### Verify OTP (login)
Method + Path: POST /auth/otp/verify
Request: { "phone": string, "code": string }
Response: { "verified": bool, "user_exists": bool, "user_id": int | null }
Notes: 400 if code wrong/expired. user_exists=false → frontend goes to profile setup next.

### Create user (buyer or worker's base record)
Method + Path: POST /users
Request: { "phone": string, "name": string, "role": string, "locality": string, "latitude": float, "longitude": float, "photo_url": string }
Response: { "id": int, "phone": string, "name": string, "role": string, "locality": string }
Notes: role is "buyer" or "worker". locality here is the person's home address / proximity search string — separate from a worker's union membership below. 400 if phone already registered.

### List district unions
Method + Path: GET /unions?level=district
Request: none
Response: [ { "id": int, "name": string, "level": "district" } ]
Notes: first dropdown in worker onboarding

### List local unions under a district
Method + Path: GET /unions?parent_union_id=&level=local
Request: none (query params)
Response: [ { "id": int, "name": string, "level": "local", "parent_union_id": int } ]
Notes: second dropdown, populated after district chosen. 200 with [] if none yet.

### Get one union's detail
Method + Path: GET /unions/{union_id}
Request: none (path param only)
Response: { "id": int, "name": string, "level": string, "parent_union_id": int | null }
Notes: 404 if not found

### Create worker profile
Method + Path: POST /workers/profile
Request: { "user_id": int, "trade": string, "union_id": int, "skill_cert": bool }
Response: { "id": int, "user_id": int, "trade": string, "union_id": int, "kyc_status": "pending", "price": null, "is_online": false }
Notes: kyc_status always starts "pending". 404 if user_id or union_id doesn't exist.

## Module 2: Search & Booking

### Search workers
Method + Path: GET /search
Request: none (query params: trade string, locality string, lat float optional, lon float optional, proximity bool optional)
Response: [ { "id": int, "name": string, "trade": string, "locality": string, "price": float, "rating_avg": float, "photo_urls": [string], "distance_km": float (only if proximity=true) } ]
Notes: photo_urls = top 3 worker_photos ordered by position. 200 with [] if no matches. 400 if proximity=true without lat/lon.

### Get worker profile
Method + Path: GET /workers/{worker_id}
Request: none (path param only)
Response: { "id": int, "name": string, "trade": string, "union_id": int, "union_name": string, "district_union_name": string, "state_union_name": string, "price": float, "rating_avg": float, "review_count": int, "photo_urls": [string], "description": string }
Notes: union_name/district_union_name/state_union_name resolved server-side by following parent_union_id up two levels. review_count = count of reviews across that worker's bookings. 404 if not found.

### Create booking (gig or custom offer)
Method + Path: POST /bookings
Request: { "customer_id": int, "worker_id": int, "type": string, "payment_model": string, "price": float | null, "job_notes": string | null, "total_days": int }
Response: { "id": int, "status": "requested", "customer_id": int, "worker_id": int, "total_days": int }
Notes: type is "gig" or "custom_offer". payment_model is "hourly" or "daily". price/job_notes only for custom_offer. 404 if customer_id/worker_id don't exist.

### Get booking detail
Method + Path: GET /bookings/{booking_id}
Request: none (path param only)
Response: { "id": int, "status": string, "customer_id": int, "worker_id": int, "payment_model": string, "total_days": int, "day_records": [ {"id": int, "day_number": int, "status": string} ] }
Notes: 404 if not found

### Booking history (list)
Method + Path: GET /bookings
Request: none (query params: customer_id int optional, worker_id int optional)
Response: [ { "id": int, "status": string, "worker_id": int, "customer_id": int, "created_at": string, "total_days": int } ]
Notes: pass exactly one query param depending on viewer. 200 with [] if none.

## Module 3: Checkout, Daily Check-in/Check-out & Wage

### Get fee breakdown (checkout screen)
Method + Path: GET /bookings/{booking_id}/checkout
Request: none (path param only)
Response: { "base_price": float, "commission": float, "remote_fee": float, "total": float }
Notes: computed from worker's price + business-logic percentages. 404 if booking not found.

### Confirm payment (creates day_records + held payments)
Method + Path: POST /bookings/{booking_id}/checkout
Request: { "confirm": true }
Response: [ { "day_record_id": int, "day_number": int, "payment_status": "held", "amount": float } ]
Notes: creates one day_records row per day (1..total_days, status "pending") + one linked payments row each (status "held"). This is the escrow simulation — no external API.

### Check-in (start of work-day)
Method + Path: POST /day-records/{day_record_id}/checkin
Request: { "worker_lat": float, "worker_lon": float }
Response: { "day_record_id": int, "start_time": string, "status": "in_progress" }
Notes: geopy.distance.geodesic against customer's stored lat/lon; if distance <= 500m, sets start_time. 400 if distance > 500m.

### Check-out (end of work-day → wage + release)
Method + Path: POST /day-records/{day_record_id}/checkout
Request: { "worker_lat": float, "worker_lon": float }
Response: { "day_record_id": int, "end_time": string, "wage_amount": float, "payment_status": "released", "status": "completed" }
Notes: same distance check. On success: sets end_time, computes wage_amount = hours_worked × rate, flips matching payments.status to "released".

### Get single day record
Method + Path: GET /day-records/{day_record_id}
Request: none (path param only)
Response: { "id": int, "day_number": int, "start_time": string | null, "end_time": string | null, "wage_amount": float | null, "status": string, "remarks": string | null }
Notes: 404 if not found

## Module 4: Worker Mode

### Set/update price
Method + Path: PATCH /workers/{worker_id}/price
Request: { "price": float }
Response: { "price": float, "union_floor": float, "union_ceiling": float, "warning": string | null }
Notes: looks up locality_price_bands via the worker's union_id. warning is a plain-text flag (not blocking) if price > ceiling — price still saves.

### Toggle online/offline
Method + Path: PATCH /workers/{worker_id}/status
Request: { "is_online": bool }
Response: { "worker_id": int, "is_online": bool }
Notes: —

### Set preferred working hours
Method + Path: PATCH /workers/{worker_id}/hours
Request: { "preferred_start": string, "preferred_end": string }
Response: { "preferred_start": string, "preferred_end": string }
Notes: strings like "09:00". Display-only, no scheduler logic.

### Incoming job requests
Method + Path: GET /workers/{worker_id}/requests
Request: none (path param only)
Response: [ { "booking_id": int, "customer_id": int, "type": string, "total_days": int, "created_at": string } ]
Notes: filters bookings where worker_id matches and status="requested". 200 with [] if none.

### Accept/reject a booking
Method + Path: PATCH /bookings/{booking_id}/respond
Request: { "action": string }
Response: { "booking_id": int, "status": string }
Notes: action is "accept" or "reject". 400 for any other value.

### Mark job fully complete
Method + Path: PATCH /bookings/{booking_id}/complete
Request: none
Response: { "booking_id": int, "status": "completed" }
Notes: only valid once every day_record is "completed" — 400 otherwise. Unlocks Rate & Review on customer side.

### Earnings ledger
Method + Path: GET /workers/{worker_id}/ledger
Request: none (path param only)
Response: { "total_jobs": int, "total_earnings": float, "entries": [ { "day_record_id": int, "day_number": int, "wage_amount": float, "remarks": string | null, "hash": string, "verified": bool } ] }
Notes: joins day_records + payments + ledger_entries. Visible only to the worker themself + cooperative admin — role-check enforced here.

## Module 5: Review

### Submit rating & review
Method + Path: POST /bookings/{booking_id}/review
Request: { "rating": int, "review_text": string }
Response: { "booking_id": int, "rating": int, "review_text": string }
Notes: only once booking.status = "completed" — 400 otherwise. 404 if booking not found.

## Module 6: Cooperative Admin Panel

### Worker directory for a union
Method + Path: GET /unions/{union_id}/workers
Request: none (path param only)
Response: [ { "id": int, "name": string, "trade": string, "kyc_status": string } ]
Notes: —

### Approve/reject KYC
Method + Path: PATCH /workers/{worker_id}/kyc
Request: { "kyc_status": string }
Response: { "worker_id": int, "kyc_status": string }
Notes: kyc_status is "approved" or "rejected". 400 for any other value.

### Admin aggregate stats
Method + Path: GET /unions/{union_id}/stats
Request: none (path param only)
Response: { "total_bookings": int, "total_distributed_earnings": float, "welfare_fund_balance": float }
Notes: mock numbers are fine per the doc. Scoped per-union (typically the district level, since that's the real oversight body).

### Get price band
Method + Path: GET /price-bands?union_id=&trade=
Request: none (query params)
Response: { "union_id": int, "trade": string, "floor": float, "ceiling": float }
Notes: 404 if no band set yet for that union+trade

### Set price band
Method + Path: POST /price-bands
Request: { "union_id": int, "trade": string, "floor": float, "ceiling": float }
Response: { "id": int, "union_id": int, "trade": string, "floor": float, "ceiling": float }
Notes: 400 if floor > ceiling