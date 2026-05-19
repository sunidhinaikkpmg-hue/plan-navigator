# Plan Navigator

Plan Navigator is a Vite + React dashboard for retirement-plan analytics. The frontend remains a TypeScript SPA, and the AI backend has been migrated from Supabase/Deno edge functions to a FastAPI service.

## Architecture

- Frontend: Vite, React, TypeScript, Tailwind
- Backend: FastAPI in [backend/app/main.py](backend/app/main.py)
- AI provider: Lovable AI Gateway via `LOVABLE_API_KEY`

The FastAPI app exposes these endpoints:

- `POST /api/explain-test`
- `POST /api/forecast-test`
- `POST /api/what-if-simulator`
- `POST /api/retirementiq-chat`
- `GET /health`

## Frontend setup

Install and run the frontend as before:

```bash
npm install
npm run dev
```

Set the frontend API base URL in a root `.env` file:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

An example is available in [\.env.example](.env.example).

## FastAPI setup
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
Create a Python environment, install the backend dependencies, and run the API:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
python -m 
```

Create `backend/.env` from [backend/.env.example](backend/.env.example) and set:

```env
LOVABLE_API_KEY=your-lovable-api-key
AI_GATEWAY_MODEL=google/gemini-3-flash-preview
ALLOWED_ORIGINS=http://127.0.0.1:8080,http://localhost:8080
```

## Notes

- Legacy Supabase edge-function sources have been removed from this repository; the frontend now calls FastAPI directly.
- Two endpoints stream server-sent events, and the FastAPI service preserves that streaming behavior for the UI.
