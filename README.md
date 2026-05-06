# MULTIVATE

**Multivate EdTech** is a full-stack learning platform for structured paths in **technology** and **German**, aimed at learners building a career in Germany. The product combines a modern **Next.js** web app with a **FastAPI** backend, using a **BFF (Backend-for-Frontend)** pattern so the browser talks to Next, and Next calls the private API securely.

---

## Table of contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Database setup (PostgreSQL)](#database-setup-postgresql)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Internationalization](#internationalization)
- [Optional demo data](#optional-demo-data)
- [Production notes](#production-notes)
- [Troubleshooting](#troubleshooting)
- [Repository](#repository)

---

## Architecture

| Layer | Stack | Role |
|--------|--------|------|
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS, `pnpm` | UI, locale routing, BFF routes under `/api/*` |
| **Backend** | FastAPI, SQLAlchemy, Pydantic | Auth, courses, enrollments, learning APIs |
| **Integration** | `INTERNAL_API_URL` (server-side only) | Next server → FastAPI; cookies/session for auth |

High-level flow:

1. The user signs in or registers through **Next** routes such as `/api/auth/*`.
2. Next forwards requests to **FastAPI** using `INTERNAL_API_URL` (never exposed as a public browser-to-API URL for those flows).
3. **CORS** on FastAPI must still allow your real site origin if you later call the API from the browser directly.

---

## Prerequisites

- **Node.js** 20+ (LTS recommended) and **pnpm** 9+ (or use `npx pnpm` as documented in `frontend/package.json`).
- **Python** 3.11+ and **pip** for the API.
- **Git** for version control.

**Docker Desktop** (or Docker Engine + Compose v2) for the local PostgreSQL service below.

---

## Database setup (PostgreSQL)

The API expects **PostgreSQL** by default (`DATABASE_URL` in `backend/.env`; see `backend/.env.example`). The repo ships a single **`db`** service in `docker-compose.yml` (user `multivate`, password `multivate`, database `multivate`, port **5432**).

1. From the **`multivate-edtech`** directory (repository root for this app), start Postgres and create **`backend/.env`** if it is missing:

   **Windows (recommended):**

   ```powershell
   .\scripts\setup-database.ps1
   ```

   This uses Docker Compose when Docker is available; otherwise it prints manual steps and still creates **`backend/.env`**.

   **Manual (any OS):**

   ```bash
   docker compose up -d db
   ```

   **Optional helper** (starts `db` and waits until `pg_isready` succeeds):

   ```powershell
   .\scripts\dev-db-up.ps1
   ```

   **macOS / Linux:**

   ```bash
   chmod +x scripts/dev-db-up.sh
   ./scripts/dev-db-up.sh
   ```

2. Confirm the container is healthy:

   ```bash
   docker compose exec db pg_isready -U multivate -d multivate
   ```

3. In **`backend/.env`**, set (or keep) a URL that matches compose:

   `postgresql://multivate:multivate@localhost:5432/multivate`

With **`ENVIRONMENT=development`** and **`AUTO_CREATE_TABLES=true`**, the API creates tables on first startup. For staging/production, use migrations and set **`AUTO_CREATE_TABLES=false`** (see `backend/README.md`).

---

## Quick start

### 1. Backend (FastAPI)

Start **PostgreSQL** first ([Database setup](#database-setup-postgresql)). Then from the `backend` directory:

```bash
cd backend
python -m venv .venv
```

**Windows (PowerShell):**

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**macOS / Linux:**

```bash
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API base: `http://127.0.0.1:8000`
- Interactive docs: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`

See `backend/README.md` for environment modes, production guards, and migrations guidance.

### 2. Frontend (Next.js)

From the `frontend` directory:

```bash
cd frontend
pnpm install
copy .env.example .env.local   # Windows; use cp on Unix
pnpm dev
```

**Without global pnpm:**

```bash
npx --yes pnpm@9.15.4 install
npx --yes pnpm@9.15.4 dev
```

- App: `http://localhost:3000` (locales use a prefix, e.g. `/en`, `/de`).
- If `INTERNAL_API_URL` is omitted from `.env.local`, the dev server defaults to `http://127.0.0.1:8000` for server-side API calls.

---

## Configuration

| Location | Purpose |
|----------|---------|
| `backend/.env` | `DATABASE_URL`, `SECRET_KEY`, `ENVIRONMENT`, `CORS_ORIGINS`, etc. |
| `frontend/.env.local` | `INTERNAL_API_URL` (production), optional overrides for local API URL |

**CORS:** `CORS_ORIGINS` in the backend must include your frontend origin (for example `http://localhost:3000`). Server-to-server calls from Next do not use browser CORS, but any future direct browser calls to FastAPI will.

---

## Internationalization

The frontend ships with **next-intl** and locale-prefixed routes for **English**, **French**, **German**, and **Spanish**. Copy and message files live under `frontend/messages/`. To add or change copy, edit the JSON per locale and keep keys aligned across `en`, `fr`, `de`, and `es`.

---

## Production notes

- Set **`ENVIRONMENT=production`**, a strong **`SECRET_KEY`**, and disable unsafe dev-only behavior as described in `backend/README.md`.
- Deploy the API on **[Render](https://render.com)** or **[Railway](https://railway.com)** using the **`backend`** root directory; see **`backend/README.md`** (Render: **`render.yaml`**, **`runtime.txt`**, **`PYTHON_VERSION`**; Railway: **`railway.json`**).
- Set **`INTERNAL_API_URL`** on the Next server to your **private** API URL (same network / VPC preferred).
- Run database migrations with **Alembic** before serving traffic; do not rely on `create_all()` in production.

---

## Troubleshooting

### ENOSPC / “no space left on device” (common on OneDrive)

Next writes under `frontend/.next`. If the disk or sync quota is full:

1. Stop the dev server.
2. Delete `frontend/.next`.
3. Free disk space or move the project off a constrained sync folder.

### Alternate dev bundler

From `frontend`, `pnpm dev` uses **Turbopack**. For webpack: `pnpm dev:webpack`.

---

## Docker

The root `docker-compose.yml` currently defines only the **`db`** (PostgreSQL) service for local development. Start it with:

```bash
docker compose up -d db
```

If you add more services (for example a frontend image), adjust `docker compose` commands and service names accordingly.

---

## Repository

Remote: **https://github.com/AdewaleData/MULTIVATE.git**

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/AdewaleData/MULTIVATE.git
git push -u origin main
```

Use a personal access token or SSH where GitHub requires authentication.

---

## License

Specify your license in a `LICENSE` file at the repository root when you are ready to publish.
