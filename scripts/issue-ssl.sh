#!/usr/bin/env bash
# Issue Let's Encrypt certificate and switch Nginx to HTTPS.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env.production ]; then
  echo "Missing .env.production"
  exit 1
fi

# shellcheck disable=SC1091
source .env.production

DOMAIN="${DOMAIN:-www.multivateskills.com}"
EMAIL="${CERTBOT_EMAIL:?Set CERTBOT_EMAIL in .env.production}"

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

echo "==> Requesting certificate for ${DOMAIN} and multivateskill.com..."
docker run --rm \
  -v certbot_conf:/etc/letsencrypt \
  -v certbot_www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot -w /var/www/certbot \
  -d "${DOMAIN}" \
  -d multivateskill.com \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email

echo "==> Enabling HTTPS Nginx config..."
cp docker/nginx/templates/app.ssl.conf docker/nginx/conf.d/app.conf
rm -f docker/nginx/conf.d/app.http.conf

echo "==> Reloading Nginx..."
$COMPOSE exec nginx nginx -s reload

echo "==> HTTPS enabled at https://${DOMAIN}"
