## Running Locally

1. Install dependencies: pip install -r backend/requirements.txt
2. From backend/, seed the database (first time only, or after a schema change):
   python -m app.seed_script
3. Start the backend, from backend/:
   python -m uvicorn app.main:app --reload
4. In a separate terminal, start the frontend, from the relevant frontend page's folder 
   (e.g. frontend/customer/):
   python -m http.server 5500
5. Open http://localhost:5500/index.html in your browser.

Both servers must be running on the SAME machine as the browser — 
127.0.0.1 always means "this computer," so it won't work across 
different machines without changing the URL in frontend/assets/js/config.js.