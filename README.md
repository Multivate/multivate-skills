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

1. From the **repository root**, start Postgres and create **`backend/.env`** if it is missing:

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
- **Primary production:** Ubuntu server + Docker Compose + Nginx + SSL — see **`DEPLOYMENT.md`**.
- Local dev: `docker compose up -d db redis` then run API and frontend separately (see Quick start).
- Run database migrations with **Alembic** before serving traffic in production; the API container runs `alembic upgrade head` on start.

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

The root `docker-compose.yml` defines **`db`** (PostgreSQL) and **`redis`** for local development. Start both with:

```bash
docker compose up -d db redis
```

Or use `scripts/dev-db-up.ps1` (Windows) / `scripts/dev-db-up.sh` (macOS/Linux).

For production deployment, see **`DEPLOYMENT.md`**.

---

## Repository

Remote: **https://github.com/AdewaleData/MULTIVATE.git**

```bash
git clone https://github.com/AdewaleData/Web-Application-Multivate.git
cd Multivate
```

For authentication with GitHub, use a personal access token or SSH:

```bash
git remote add origin git@github.com:AdewaleData/Web-Application-Multivate.git
```

---

## Contributing

We welcome contributions! To get started:

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/your-feature`)
3. **Commit your changes** (`git commit -m 'Add your feature'`)
4. **Push to the branch** (`git push origin feature/your-feature`)
5. **Open a Pull Request**

Please ensure your code follows the project conventions and includes tests where applicable.

---

## Support & Community

- 📖 For detailed backend setup, see [backend/README.md](backend/README.md)
- 🏠 For deployment guides, check [Production Notes](#production-notes)
- 💬 Have questions? Open an issue on [GitHub Issues](https://github.com/AdewaleData/Web-Application-Multivate/issues)

---

## License

This project is proprietary. A `LICENSE` file will be added when the project is ready for public release.

---

## Author

**Adewale Data** - [GitHub Profile](https://github.com/AdewaleData)
#
