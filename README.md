## Running Locally

1. Install dependencies (from repo root):
   pip install -r backend/requirements.txt

2. Seed the database (first time only, or after any schema change —
   safe to re-run anytime otherwise):
   cd backend
   python -m app.seed_script

3. Start the backend (from backend/, keep this terminal open):
   python -m uvicorn app.main:app --reload

4. In a SEPARATE terminal, start the frontend (from the relevant
   frontend page's folder, e.g. frontend/customer/, keep this open too):
   cd frontend/customer
   python -m http.server 5500

5. Open html in your browser:
   

Both servers must run on the SAME machine as the browser — 127.0.0.1
always means "this computer," so it won't work across different
machines without changing API_BASE_URL in frontend/assets/js/config.js.

Backend API docs (for testing endpoints directly, without the frontend):
   http://127.0.0.1:8000/docs