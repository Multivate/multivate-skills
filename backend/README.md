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

**Windows:** run **`.\scripts\setup-database.ps1`** (starts Docker `db` when Docker is installed, creates **`backend/.env`** from `.env.example` if missing).

**Any OS:** start the database:

```bash
docker compose up -d db
```

Wait until Postgres accepts connections (optional):

```bash
docker compose exec db pg_isready -U multivate -d multivate
```

Without Docker, create the role and databases once:

- **pgAdmin:** run **`database/pgadmin/01-role.sql`**, then **`database/pgadmin/02-databases.sql`** (superuser, database **postgres**). If **`create_all`** fails on **schema public** (PostgreSQL 15+), run **`database/pgadmin/03-grant-public.sql`** while connected to **multivate**, then again on **multivate_test**.
- **psql:** from repo root, `psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f database/manual-init.sql` (includes those steps via `\ir`).

Then set **`DATABASE_URL`** in **`backend/.env`** to match your host, user, password, and database name.

Or use **`scripts/dev-db-up.ps1`** (Windows) or **`scripts/dev-db-up.sh`** (Unix) from the same root to start `db` and wait for readiness.

### Delete the database and start fresh (Docker)

From the **repo root** (where **`docker-compose.yml`** is):

```powershell
.\reset-db.ps1
```

This runs **`docker compose down -v`** (removes the **`multivate_pg`** volume and **all** Postgres data), then **`docker compose up -d db`**. After that, start the API from **`backend/`** (e.g. **`.\run-api.ps1`**); with **`AUTO_CREATE_TABLES=true`**, tables are recreated on boot. Then run **`python scripts/ensure_dev_account.py`** or **`reset_all_users_and_admin.py`** if you want the dev admin user again.

**Without Docker:** connect as a superuser, drop and recreate the databases (or re-run **`database/pgadmin/02-databases.sql`** after dropping **`multivate`** / **`multivate_test`**), then start the API so **`create_all()`** runs.

### 2. Environment file

In `backend/`, copy `.env.example` to `.env` and set at least **`SECRET_KEY`**. **`DATABASE_URL`** should match compose unless you use another host:

```
DATABASE_URL=postgresql://multivate:multivate@localhost:5432/multivate
SECRET_KEY=<use-a-long-random-string>
```

With **`ENVIRONMENT=development`** and **`AUTO_CREATE_TABLES=true`**, missing tables are created when the app starts. Do not rely on that in production.

**Wrap-up after the database exists:** ensure **`backend/.env`** exists (copy from **`.env.example`** if needed), **`DATABASE_URL`** points at your **`multivate`** database, then from **`backend/`** run **`python scripts/verify_local_setup.py`**, start the API (**`run-api.ps1`** or uvicorn), confirm **`GET /health/ready`**, and optionally **`python scripts/ensure_dev_account.py`** for the dev admin user. Remove any old **`multivate.db`** file under **`backend/`** if you no longer need it.

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

**Windows (recommended):** from `backend/`, run **`.\run-api.ps1`** — it clears a stray **`DATABASE_URL`** in your shell (which overrides `.env`), runs **`scripts/verify_local_setup.py`**, then starts uvicorn on **`http://127.0.0.1:8000`**. If the script exits before uvicorn, Postgres is probably down or **`DATABASE_URL`** is wrong.

### 5. Verify

- **`/health`** — process is up.
- **`/health/ready`** — database reachable (use after API is running).
- **`/docs`** — OpenAPI UI.

**If “nothing works” locally:** run **`python scripts/verify_local_setup.py`** from `backend/` (checks DB + optional `/health`). **Outbound OTP email** uses **Resend** only: set **`RESEND_API_KEY`** and **`RESEND_FROM`** (see **`.env.example`**). One API key on the server; learners only enter the 6-digit code from email. With **`ENVIRONMENT=development`** and **`RESEND_API_KEY`** unset, **`POST /api/v1/auth/login`** can include **`dev_otp`**; codes are also logged as **`MULTIVATE_DEV_OTP`**. After changing email env, run **`python scripts/test_resend.py your@email.com`** and restart uvicorn.

### 6. (Optional) Run automated checks

Pytest expects PostgreSQL database **`multivate_test`** (same credentials as compose by default). It is created by **`database/pgadmin/02-databases.sql`** (or **`database/manual-init.sql`** via psql) and by Docker’s **`database/docker-entrypoint-initdb.d/`** on a fresh volume. If tests cannot connect, start **`db`** and ensure that database exists, or set **`TEST_DATABASE_URL`** to another Postgres URL.

```bash
pip install -r requirements-dev.txt
pytest tests -q
```

### Reset accounts, admin with email 2FA, and learner data model

**What you get**

- **`admin@example.com`** / **`Multivate2026!`** — role **admin**, **email two-factor enabled** (set **`RESEND_API_KEY`** + **`RESEND_FROM`** in `.env` to deliver codes). With no Resend key and **`ENVIRONMENT=development`**, login JSON may include **`dev_otp`** and **`MULTIVATE_DEV_OTP`** is logged.
- **Students** enroll via **`POST /api/v1/enrollments`** (student role only). **Instructors** see who enrolled in **their** courses at **`GET /api/v1/instructor/students`**. **Admins** see **all** enrollments (including instructor name/email per row) at **`GET /api/v1/admin/enrollments`**.
- The web app links these flows under **Admin → Data management** and shows **instructors on each enrolled course** in the student dashboard (“my courses” API).

**1) Delete every account, then recreate only the dev admin**

**Destructive:** removes all **users** and dependent rows (enrollments, messages, MFA challenges, profiles, etc.). Courses stay in the catalog.

From `backend/`:

```powershell
# Windows PowerShell
$env:RESET_USERS_CONFIRM = "yes"
python scripts/reset_all_users_and_admin.py
```

```bash
# Unix
RESET_USERS_CONFIRM=yes python scripts/reset_all_users_and_admin.py
```

**2) Or only create/refresh the admin (keeps other users)**

```bash
python scripts/ensure_dev_account.py
```

**3) Sign in as admin**

Use email + password, then the **one-time code** sent to that mailbox, or use **`dev_otp`** from the login response / **`MULTIVATE_DEV_OTP`** in API logs when Resend is not configured in development.

**Do not** use these defaults in production for real users.

**Admin on Render (live site):** the dev admin is not created automatically. Either:

1. **Render Shell** (web service → Shell, root directory `backend`):  
   `python scripts/ensure_dev_account.py`  
   Then sign in with `admin@example.com` / `Multivate2026!` (plus email OTP if 2FA is on).

2. **Promote your own account** (after you registered on the live site):  
   `python scripts/promote_user_to_admin.py your@email.com`  
   (run locally with **External Database URL** in `DATABASE_URL`, or from Render Shell). Sign out and sign in again.

### Production checklist

- Set `ENVIRONMENT=production`, `AUTO_CREATE_TABLES=false`, and a unique `SECRET_KEY` (≥32 characters).
- Point `DATABASE_URL` at your managed Postgres; run Alembic migrations before traffic.
- Restrict `CORS_ORIGINS` to your real web origins (comma-separated).

### Render.com

**Typical failure modes (and fixes):**

| Symptom | Likely cause | Fix |
|--------|----------------|-----|
| **`gunicorn: command not found`** or **`your_application.wsgi`** | Wrong **Start Command** (Django placeholder) | **Settings → Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. **Root Directory:** `backend`. Or use **`bash scripts/start-render.sh`**. |
| Build OK, then **“No open ports detected”** / deploy unhealthy | Process crashed on startup (not listening on `PORT`) | Check logs. Use **`uvicorn app.main:app --host 0.0.0.0 --port $PORT`** — **no `--reload`**. Root directory must be **`backend`** so `app` imports work. |
| Crash immediately on boot | **`ENVIRONMENT=production`** with default / short **`SECRET_KEY`**, or **`AUTO_CREATE_TABLES=true`** | For a **first** deploy, use **`ENVIRONMENT=development`** and **`AUTO_CREATE_TABLES=true`**, or satisfy production rules (≥32 char secret, **`AUTO_CREATE_TABLES=false`**, migrations applied). |
| **`/health/ready`** returns 503 | Database unreachable or wrong URL | Link Render Postgres to the web service so **`DATABASE_URL`** is set, or paste the **External** URL from the DB dashboard. Same region helps. |
| **`localhost:5432` / connection refused** on deploy | **`DATABASE_URL` missing** — the app falls back to the local Docker default | Web Service → **Environment** → add **`DATABASE_URL`** from your Render Postgres (**Info** → External or Internal URL), or **Link Database** so Render injects it. The app now fails fast on Render if this is missing. |
| Wrong Python / wheel build errors | Render defaults to **Python 3.14.x** on new services | Set **`PYTHON_VERSION=3.12.8`** in the service, and/or rely on **`backend/runtime.txt`** + **`backend/.python-version`** in this repo. |

**Manual Web Service setup**

1. **Root Directory:** `backend` (monorepo).
2. **Build:** `pip install -r requirements.txt`
3. **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Environment:** `PYTHON_VERSION=3.12.8`, linked **`DATABASE_URL`**, **`SECRET_KEY`**, **`CORS_ORIGINS`**, and (for first boot) **`ENVIRONMENT=development`** + **`AUTO_CREATE_TABLES=true`** unless you have migrations.

**Blueprint (optional):** repo root **`render.yaml`** defines a **free** Postgres (`multivate-db`) and a **free** web service with safe first-deploy env (development + `create_all`). You still need to set **`CORS_ORIGINS`** when prompted (`sync: false` in the blueprint).

### Railway

Config-as-code lives in **`railway.json`** (start command and **`/health`** check). **`runtime.txt`** pins **Python 3.12.8** for [Railpack](https://docs.railway.com/reference/railpack) so builds stay on 3.12 instead of a very new default.

1. **New project** → Deploy from this GitHub repo.
2. **Service root:** set the service **Root Directory** (or watch path) to **`backend`** so `requirements.txt`, `app/`, and `railway.json` are at the service root.
3. **Database:** add a **PostgreSQL** plugin (or template), open the database service, and **connect / reference** it from the API service so **`DATABASE_URL`** is injected automatically (often `DATABASE_PRIVATE_URL` is also available for private networking; use whichever matches your plan).
4. **Variables** on the API service (minimum for production):

   | Variable | Example |
   |----------|---------|
   | `ENVIRONMENT` | `production` |
   | `SECRET_KEY` | random string, **≥32 characters** |
   | `AUTO_CREATE_TABLES` | `false` (use migrations before traffic) |
   | `CORS_ORIGINS` | your real site origins, comma-separated (e.g. `https://yourapp.vercel.app`) |

5. **Do not** use **`--reload`** in production. **`PORT`** is set by Railway; the start command in **`railway.json`** already binds **`0.0.0.0`**.
6. After deploy, confirm **`/health`** and **`/health/ready`** (readiness needs a working **`DATABASE_URL`**).

## Auth endpoints

- **Registration (two-step, Redis + email OTP, 5-minute code):** `POST /api/v1/auth/register/student/start` | `.../instructor/start` — same body as before (name, email, password, questionnaire). Stores a pending signup in **Redis** (`REDIS_URL`), emails a **6-digit HTML OTP** (logo when configured), returns `{ signup_token, email_masked [, dev_otp] }`. Then `POST /api/v1/auth/register/student/verify` | `.../instructor/verify` — body `{ signup_token, code }`; on success creates the user and returns **JWT** (`access_token`, `refresh_token`, `user`) like login.
- `POST /api/v1/auth/login` — body: email, password; returns tokens **or** `{ "mfa_required": true, "mfa_token", "email_masked" [, "dev_otp"] }` when **`two_factor_enabled`** is true (`dev_otp` only in **development** when **`RESEND_API_KEY`** is unset). Returns 403 `profile_incomplete` for legacy incomplete profiles. **Completed registration** returns tokens from the **verify** step above; **later sign-ins** go through email OTP when 2FA is enabled.
- `POST /api/v1/auth/login/mfa` — body: `mfa_token`, `code` (email OTP) — returns tokens on success
- `POST /api/v1/auth/mfa/enable/start` | `.../confirm` | `.../disable` — manage email 2FA (authenticated; confirm/disable as documented in OpenAPI)
- `POST /api/v1/auth/refresh` — body: `{ "refresh_token": "..." }`
- `GET /api/v1/auth/me` — header: `Authorization: Bearer <access_token>`

## Enrollments (learner vs admin views)

- `POST /api/v1/enrollments` — **student role only**; body `{ "course_slug" }`. Instructors and admins manage courses instead; use a student account to take a course.
- `GET /api/v1/instructor/students` — instructor: learners enrolled in **your** courses (with progress).
- `GET /api/v1/admin/enrollments` — admin: all enrollments, including **instructor** name/email per course when assigned.

## Roles

- `GET /api/v1/users/` — **admin** only (lists users).
- Use `require_roles(...)` in `app/core/deps.py` for other routers.
