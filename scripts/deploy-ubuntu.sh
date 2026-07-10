#!/usr/bin/env bash
# Deploy Multivate on Ubuntu with Docker Compose + Nginx + Let's Encrypt.
# Run on the server from the repo root after cloning from GitHub.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker-compose -f docker-compose.prod.yml --env-file .env.production"

if [ ! -f .env.production ]; then
  echo "Missing .env.production — copy .env.production.example and fill in secrets."
  exit 1
fi

# shellcheck disable=SC1091
source .env.production

DOMAIN="${DOMAIN:-www.multivateskills.com}"
EMAIL="${CERTBOT_EMAIL:-}"

echo "==> Building and starting containers..."
$COMPOSE up -d --build

echo "==> Waiting for frontend..."
sleep 15

if [ ! -f "docker/nginx/conf.d/app.ssl.conf" ] || [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  echo "==> Using HTTP-only Nginx config (app.http.conf)."
  echo "    Site should be reachable at http://${DOMAIN}"
  echo ""
  echo "Next: issue SSL certificate, then enable HTTPS:"
  echo "  docker run --rm -v certbot_conf:/etc/letsencrypt \\"
  echo "    -v certbot_www:/var/www/certbot certbot/certbot certonly \\"
  echo "    --webroot -w /var/www/certbot -d ${DOMAIN} -d multivateskills.com \\"
  echo "    --email ${EMAIL} --agree-tos --no-eff-email"
  echo ""
  echo "  cp docker/nginx/conf.d/app.ssl.conf docker/nginx/conf.d/app.conf"
  echo "  rm docker/nginx/conf.d/app.http.conf"
  echo "  $COMPOSE exec nginx nginx -s reload"
else
  echo "==> SSL config detected."
fi

echo "==> Done. Check logs with: $COMPOSE logs -f"
