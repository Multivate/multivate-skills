#!/usr/bin/env bash
# Start local Postgres (docker-compose `db` service) and wait until it accepts connections.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
docker compose up -d db
echo "Waiting for Postgres..."
for i in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U multivate -d multivate >/dev/null 2>&1; then
    echo "Postgres is ready (multivate / multivate / DB multivate)."
    exit 0
  fi
  sleep 1
done
echo "Timeout: Postgres did not become ready." >&2
exit 1
