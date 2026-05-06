# Multivate API (FastAPI)

This service is structured for a **real** deployment: explicit environment modes, readiness checks, structured logging, request correlation IDs, and **fail-fast** configuration in staging/production (strong `SECRET_KEY`, no `create_all()` in prod).

## Roadmap (backend, in order)

1. **Platform shell** (this iteration): `ENVIRONMENT`, logging, `/health` + `/health/ready`, `X-Request-ID`, validation error shape, production config guards.
2. **Migrations**: Alembic revisions as the single source of schema truth; `AUTO_CREATE_TABLES=false` everywhere except local dev.
3. **Domain APIs**: courses, enrollments, payments — each behind role checks and integration tests.
4. **Observability**: metrics, structured JSON logs in production, optional OpenTelemetry.

## Setup

1. Create a virtual environment and install dependencies:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and adjust values. For local Postgres with root `docker-compose.yml`:

```
DATABASE_URL=postgresql://multivate:multivate@localhost:5432/multivate
SECRET_KEY=<use-a-long-random-string>
```

3. Start PostgreSQL (from repo root):

```bash
docker compose up -d db
```

4. Run the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. (Optional) Run automated checks:

```bash
pip install -r requirements-dev.txt
pytest tests -q
```

- Docs: `http://localhost:8000/docs`
- Liveness: `http://localhost:8000/health`
- Readiness (DB): `http://localhost:8000/health/ready`

### Production checklist

- Set `ENVIRONMENT=production`, `AUTO_CREATE_TABLES=false`, and a unique `SECRET_KEY` (≥32 characters).
- Point `DATABASE_URL` at your managed Postgres; run Alembic migrations before traffic.
- Restrict `CORS_ORIGINS` to your real web origins (comma-separated).

## Auth endpoints

- `POST /api/v1/auth/register` — body: name, email, password, role (`student` | `instructor`)
- `POST /api/v1/auth/login` — body: email, password
- `POST /api/v1/auth/refresh` — body: `{ "refresh_token": "..." }`
- `GET /api/v1/auth/me` — header: `Authorization: Bearer <access_token>`

## Roles

- `GET /api/v1/users/` — **admin** only (lists users).
- Use `require_roles(...)` in `app/core/deps.py` for other routers.
