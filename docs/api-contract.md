# API Contract — Cooperative Gig Services Platform

## Module 1: Onboarding & Auth

### Get supported languages
Method + Path: GET /languages
Request: none
Response: { "languages": [{"code": "en", "label": "English"}, {"code": "hi", "label": "हिंदी"}] }
Notes: static list, no DB table needed

### Request OTP (login)
Method + Path: POST /send-otp
Request: { "phone": string }
Response: { "status": "sent", "expires_in_seconds": int }
Notes: writes an otp_codes row with purpose="login". 400 if phone malformed.

### Verify OTP (login)
Method + Path: POST /verify-otp
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
Request: { "user_id": int, "trade": string, "union_id": int, "skill_cert": bool, "description": string | null }
Response: { "id": int, "user_id": int, "trade": string, "union_id": int, "kyc_status": "pending", "price": null, "is_online": false, "description": string | null }
Notes: kyc_status always starts "pending". 404 if user_id or union_id doesn't exist.

## Module 2: Search & Booking

### Search workers
Method + Path: GET /search
Request: none (query params: trade string, locality string, lat float optional, lon float optional, proximity float optional — radius in km, not a boolean)
Response: [ { "id": int, "name": string, "trade": string, "locality": string, "price": float, "rating_avg": float, "kyc_status": string, "photo_urls": [string], "distance_km": float (only if lat/lon given) } ]
Notes: photo_urls = top 3 worker_photos ordered by position. When proximity radius given but no worker falls inside it, returns the single nearest worker instead of an empty list, with distance_km attached. 400 if proximity given without lat/lon. 200 with [] if no matches otherwise.

### Get worker profile
Method + Path: GET /workers/{worker_id}
Request: none (path param only)
Response: { "id": int, "name": string, "trade": string, "union_id": int, "union_name": string, "district_union_name": string, "state_union_name": string, "price": float, "rating_avg": float, "review_count": int, "photo_urls": [string], "kyc_status": string, "description": string | null }
Notes: union_name/district_union_name/state_union_name resolved server-side by following parent_union_id up two levels. review_count = count of reviews across that worker's bookings. 404 if not found.

### Create booking (gig or custom offer)
Method + Path: POST /bookings
Request: { "customer_id": int, "worker_id": int, "type": string, "payment_model": string, "price": float | null, "job_notes": string | null, "total_days": int }
Response: { "id": int, "status": "requested", "customer_id": int, "worker_id": int, "total_days": int }
Notes: type is "gig" or "custom_offer". payment_model is "hourly" or "daily". price/job_notes only for custom_offer. total_days must be >= 1 — 400 otherwise. 404 if customer_id/worker_id don't exist.

### Get booking detail
Method + Path: GET /bookings/{booking_id}
Request: none (path param only)
Response: { "id": int, "status": string, "customer_id": int, "worker_id": int, "payment_model": string, "total_days": int, "day_records": [ {"id": int, "day_number": int, "status": string} ] }
Notes: 404 if not found

### Booking history (list)
Method + Path: GET /bookings
Request: none (query params: customer_id int optional, worker_id int optional)
Response: [ { "id": int, "status": string, "worker_id": int, "customer_id": int, "created_at": string, "total_days": int } ]
Notes: pass exactly one query param depending on viewer — 400 if both or neither given. 200 with [] if none.

### Accept/reject a booking
Method + Path: PATCH /bookings/{booking_id}/respond
Request: { "action": string }
Response: { "booking_id": int, "status": string }
Notes: action is "accept" or "reject". 400 for any other value. 404 if booking not found.

### Mark job fully complete
Method + Path: PATCH /bookings/{booking_id}/complete
Request: none
Response: { "booking_id": int, "status": "completed" }
Notes: only valid once every day_record for the booking is "completed" — 400 otherwise. Unlocks Rate & Review on customer side. 404 if booking not found.

## Module 3: Checkout, Daily Check-in/Check-out & Wage

### Get fee breakdown (checkout screen)
Method + Path: GET /bookings/{booking_id}/checkout
Request: none (path param only)
Response: { "base_price": float, "commission": float, "remote_fee": float, "total": float }
Notes: base_price reflects the FULL booking cost — for standard gigs this is the worker's per-day rate × total_days, not a single day's rate; for custom_offer bookings, base_price is the manually agreed booking.price as-is, no per-day scaling. commission = 15% of base_price. remote_fee is currently a flat placeholder amount. base_price + commission + remote_fee = total, always. 404 if booking not found.

### Confirm payment (creates day_records + held payments)
Method + Path: POST /bookings/{booking_id}/checkout
Request: { "confirm": true }
Response: [ { "day_record_id": int, "day_number": int, "payment_status": "held", "amount": float } ]
Notes: creates one day_records row per day (1..total_days, status "pending") + one linked payments row each (status "held"). Each day's payment.amount = the full multi-day total (base_price + commission + remote_fee) divided evenly across total_days — NOT a single day's flat rate alone. 400 if checkout was already confirmed for this booking (one-time only, no re-confirm). This is the escrow simulation — no external API.

### Check-in (start of work-day)
Method + Path (step 1): POST /day-records/{day_record_id}/checkin/request-otp
Request: none (path param only)
Response: { "status": "sent", "expires_in_seconds": int }
Notes: generates and stores a one-time code, purpose="checkin", tied to this day_record_id. Expires after 5 minutes.

Method + Path (step 2): POST /day-records/{day_record_id}/checkin/confirm
Request: { "code": string, "worker_lat": float, "worker_lon": float } (code + lat/lon passed as query params in current implementation)
Response: { "day_record_id": int, "start_time": string, "status": "in_progress" }
Notes: validates the OTP (correct, unexpired, unverified) AND checks geopy.distance.geodesic against the customer's stored lat/lon (<=500m) — both required. 400 if OTP wrong/expired, or if distance > 500m, or if this day_record is already "in_progress"/"completed". 404 if day_record not found or OTP invalid.

### Check-out (end of work-day → wage + release)
Method + Path (step 1): POST /day-records/{day_record_id}/checkout/request-otp
Request: none (path param only)
Response: { "status": "sent", "expires_in_seconds": int }
Notes: same OTP mechanism as check-in, purpose="checkout".

Method + Path (step 2): POST /day-records/{day_record_id}/checkout/confirm
Request: { "code": string, "worker_lat": float, "worker_lon": float } (passed as query params)
Response: { "day_record_id": int, "end_time": string, "wage_amount": float, "payment_status": "released", "status": "completed" }
Notes: OTP + one-time GPS distance check (<=500m), both required. 400 if this day_record is already "completed" (no double checkout). On success: sets end_time, computes wage_amount via the flat-rate model — NOT hours × rate. For custom_offer bookings, wage_amount = booking.price as-is. For standard gigs, wage_amount = worker_profile.price, the same flat amount per completed day regardless of hours worked. Flips the matching payments.status to "released". IMPORTANT: payment.amount is NEVER overwritten at release — it stays as the original customer-facing held total (commission + remote_fee included). wage_amount is a separate, worker-facing payout figure. Platform's commission earned on a given day = payment.amount − wage_amount, computed on demand by whoever needs it, not stored as its own field. A ledger_entries row is also created automatically at this point (see Ledger below).

### Get single day record
Method + Path: GET /day-records/{day_record_id}
Request: none (path param only)
Response: { "id": int, "day_number": int, "start_time": string | null, "end_time": string | null, "wage_amount": float | null, "status": string, "remarks": string | null }

### Earnings ledger
Method + Path: GET /workers/{worker_id}/ledger
Request: none (path param only)
Response: { "total_jobs": int, "total_earnings": float, "entries": [ { "day_record_id": int, "day_number": int, "wage_amount": float | null, "remarks": string | null, "hash": string, "verified": bool } ] }
Notes: total_jobs counts completed day_records for this worker (joined through bookings), NOT completed bookings — booking-level completion status isn't reflected here. total_earnings sums wage_amount across all this worker's ledger entries. A ledger_entries row is created automatically the moment a day_record's checkout is confirmed, chaining off the worker's most recent previous entry's hash (or "0" for their first entry ever) — this is a hash-chain (compute_hash/verify_hash), not something the ledger endpoint itself computes. verified is recalculated fresh on every read by re-hashing the entry's current stored day_record data and comparing to the stored hash — so it correctly flips to false if wage_amount (or any hashed field) is later changed directly in the database. Known, disclosed limitation: this only proves internal DB consistency — it does not protect against an attacker with direct DB access who could recompute a matching hash themselves (no external anchoring). 404 if worker_id doesn't exist.

## Module 4: Worker Mode

### Set/update price
Method + Path: PATCH /workers/{worker_id}/price
Request: { "price": float }
Response: { "price": float, "union_floor": float | null, "union_ceiling": float | null, "warning": string | null }
Notes: looks up locality_price_bands via the worker's union_id + trade. warning is a plain-text flag (not blocking) if price is outside the floor/ceiling — price still saves. If no price band exists yet for that union+trade, union_floor/union_ceiling/warning are all null and price saves without validation. 404 if worker profile not found.

### Toggle online/offline
Method + Path: PATCH /workers/{worker_id}/status
Request: { "is_online": bool }
Response: { "worker_id": int, "is_online": bool }
Notes: 404 if worker profile not found.

### Set preferred working hours
Method + Path: PATCH /workers/{worker_id}/hours
Request: { "preferred_start": string, "preferred_end": string }
Response: { "preferred_start": string, "preferred_end": string }
Notes: strings like "09:00". Display-only, no scheduler logic. 404 if worker profile not found.

### Incoming job requests
Method + Path: GET /workers/{worker_id}/requests
Request: none (path param only)
Response: [ { "booking_id": int, "customer_id": int, "type": string, "total_days": int, "created_at": string } ]
Notes: filters bookings where worker_id matches and status="requested". 200 with [] if none.

## Module 5: Review

### Submit rating & review
Method + Path: POST /bookings/{booking_id}/review
Request: { "rating": int, "review_text": string }
Response: { "booking_id": int, "rating": int, "review_text": string }
Notes: only once booking.status = "completed" — 400 otherwise. 400 if a review already exists for this booking (one review per booking). On success, also recomputes and updates the worker's worker_profiles.rating_avg across all their reviews. 404 if booking not found.

## Module 6: Cooperative Admin Panel

### Worker directory for a union
Method + Path: GET /unions/{union_id}/workers
Request: none (path param only)
Response: [ { "id": int, "name": string, "trade": string, "kyc_status": string } ]
Notes: union_id scope includes the given union AND all unions nested beneath it (e.g. a district union's worker list includes every worker under its local unions).

### Approve/reject KYC
Method + Path: PATCH /workers/{worker_id}/kyc
Request: { "kyc_status": string }
Response: { "worker_id": int, "kyc_status": string }
Notes: kyc_status is "approved" or "rejected". 400 for any other value. 404 if worker profile not found.

### Admin aggregate stats
Method + Path: GET /unions/{union_id}/stats
Request: none (path param only)
Response: { "total_bookings": int, "total_distributed_earnings": float, "welfare_fund_balance": float }
Notes: union_id scope includes the given union AND all unions nested beneath it. total_bookings counts ALL bookings for workers in scope, regardless of whether they have real day_records/payments (so seeded demo bookings without a real checkout flow still count here). total_distributed_earnings = sum of wage_amount across completed day_records with released payments, in scope only (so it reflects only bookings that went through the real checkout/checkin/checkout pipeline). welfare_fund_balance = sum of (payment.amount − wage_amount) across that same set — i.e. accumulated platform commission, not a mock number.

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