# Multivate authentication (dev)

## 1. Database

From repo root:

```bash
docker compose up -d db
```

Optional: `.\scripts\dev-db-up.ps1` (Windows) or `./scripts/dev-db-up.sh` (Unix) starts `db` and waits until Postgres is ready.

## 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Edit .env — set SECRET_KEY and DATABASE_URL if needed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Tables are created automatically on startup (dev). For production, use Alembic migrations and `sql/schema.sql` as reference.

## 3. Frontend (Next.js)

```bash
cd frontend
copy .env.example .env.local
# Set INTERNAL_API_URL=http://localhost:8000
pnpm install
pnpm dev
```

Add your Next dev origin to the API `CORS_ORIGINS` in `backend/.env` (e.g. `http://localhost:3000`).

## 4. Try it

1. Open `http://localhost:3000/register`, create a **Student** or **Instructor** account.
2. You should land on **`/dashboard`** with HTTP-only cookies set by Next route handlers.
3. **`GET /api/v1/users/`** is **admin-only** — promote a user in the DB to `admin` to test.

JWTs are **not exposed to JavaScript**; the browser stores `access_token` and `refresh_token` as **httpOnly** cookies via `/api/auth/*` proxies.
