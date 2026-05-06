#!/bin/sh
set -e
cd /app

if [ ! -d node_modules/next ]; then
  echo "Installing dependencies..."
  if [ -f pnpm-lock.yaml ]; then
    pnpm install --frozen-lockfile
  else
    pnpm install
  fi
fi

exec pnpm exec next dev --hostname 0.0.0.0 --port 3000
