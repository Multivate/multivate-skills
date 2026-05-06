# Multivate API (FastAPI)

This service is structured for a **real** deployment: explicit environment modes, readiness checks, structured logging, request correlation IDs, and **fail-fast** configuration in staging/production (strong `SECRET_KEY`, no `create_all()` in prod).

## Roadmap (backend, in order)

1. **Platform shell** (this iteration): `ENVIRONMENT`, logging, `/health` + `/health/ready`, `X-Request-ID`, validation error shape, production config guards.
2. **Migrations**: Alembic revisions as the single source of schema truth; `AUTO_CREATE_TABLES=false` everywhere except local dev.
3. **Domain APIs**: courses, enrollments, payments — each behind role checks and integration tests.
4. **Observability**: metrics, structured JSON logs in production, optional OpenTelemetry.

## Setup

### 1. PostgreSQL (local)

From the **repository root** (parent of `backend/`, where `docker-compose.yml` lives):

```bash
docker compose up -d db
```

Wait until Postgres accepts connections (optional):

```bash
docker compose exec db pg_isready -U multivate -d multivate
```

Or use **`scripts/dev-db-up.ps1`** (Windows) or **`scripts/dev-db-up.sh`** (Unix) from that same root.

### 2. Environment file

In `backend/`, copy `.env.example` to `.env` and set at least **`SECRET_KEY`**. **`DATABASE_URL`** should match compose unless you use another host:

```
DATABASE_URL=postgresql://multivate:multivate@localhost:5432/multivate
SECRET_KEY=<use-a-long-random-string>
```

With **`ENVIRONMENT=development`** and **`AUTO_CREATE_TABLES=true`**, missing tables are created when the app starts. Do not rely on that in production.

### 3. Python virtualenv and dependencies

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 4. Run the API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Verify

- **`/health`** — process is up.
- **`/health/ready`** — database reachable (use after API is running).
- **`/docs`** — OpenAPI UI.

### 6. (Optional) Run automated checks

```bash
pip install -r requirements-dev.txt
pytest tests -q
```

### Production checklist

- Set `ENVIRONMENT=production`, `AUTO_CREATE_TABLES=false`, and a unique `SECRET_KEY` (≥32 characters).
- Point `DATABASE_URL` at your managed Postgres; run Alembic migrations before traffic.
- Restrict `CORS_ORIGINS` to your real web origins (comma-separated).

### Render.com

- Put **`runtime.txt`** in this `backend` folder (this repo pins **Python 3.12.8**) so Render does not pick **3.14**, which can break older SQLAlchemy typing paths.
- **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT` — Render sets **`PORT`**; do **not** use `--reload` in production (it breaks the health/port check and is unnecessary).
- If the Git repo root is the monorepo, set the service **Root Directory** to **`backend`** and **Build Command** to `pip install -r requirements.txt`.
- Set `DATABASE_URL`, `SECRET_KEY` (≥32 chars), `ENVIRONMENT`, and `CORS_ORIGINS` in the Render dashboard.

## Auth endpoints

- `POST /api/v1/auth/register` — body: name, email, password, role (`student` | `instructor`)
- `POST /api/v1/auth/login` — body: email, password
- `POST /api/v1/auth/refresh` — body: `{ "refresh_token": "..." }`
- `GET /api/v1/auth/me` — header: `Authorization: Bearer <access_token>`

## Roles

- `GET /api/v1/users/` — **admin** only (lists users).
- Use `require_roles(...)` in `app/core/deps.py` for other routers.
