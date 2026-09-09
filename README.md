## Running Locally

### First time only

1. Install dependencies (from repo root):
   
   pip install -r backend/requirements.txt
   

2. Seed the database:
   
   cd backend
   python -m app.seed_script
   
   (Also re-run this any time the schema changes. Otherwise it's safe
   to re-run, but not required.)

### Every time

3. Start the backend (from `backend/`, keep this terminal open):
   
   python -m uvicorn app.main:app --reload
   

4. In a SEPARATE terminal, start the frontend from the `frontend/`
   folder itself — not a subfolder like `frontend/customer/`:
   
   cd frontend
   python -m http.server 5500
   
   Keep this terminal open too.

5. Open in your browser:
   
   http://127.0.0.1:5500/shared/intro.html
   
   (swap `customer` for whichever page you need)

Both servers must run on the SAME machine as the browser — `127.0.0.1`
always means "this computer," so it won't work across different
machines without changing `API_BASE_URL` in `frontend/assets/js/config.js`.

Backend API docs (for testing endpoints directly, without the frontend):
```
http://127.0.0.1:8000/docs
```