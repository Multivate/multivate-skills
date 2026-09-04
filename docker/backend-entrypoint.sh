#!/usr/bin/env sh
set -e

echo "[api] waiting for database..."
until python -c "
import os, sys, time
import psycopg2
url = os.environ.get('DATABASE_URL', '')
for _ in range(60):
    try:
        psycopg2.connect(url)
        sys.exit(0)
    except Exception:
        time.sleep(1)
sys.exit(1)
" 2>/dev/null; do
  sleep 1
done
echo "[api] database is up"

echo "[api] running alembic migrations..."
if ! alembic upgrade head; then
  echo "[api] WARNING: alembic upgrade failed - continuing with schema patches / create_all"
fi

echo "[api] applying schema patches..."
python -c "
from app.core.config import get_settings
from app.core.database import engine
from app.core.schema_patches import apply_schema_patches
import app.main  # noqa: F401 - register models on Base.metadata
s = get_settings()
apply_schema_patches(engine, database_url=s.database_url)
print('[api] schema patches done')
"

echo "[api] verifying schema vs models..."
if ! python scripts/verify_schema_alignment.py; then
  echo "[api] WARNING: schema alignment check failed - review missing columns before traffic"
fi

echo "[api] starting uvicorn on :8000"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
