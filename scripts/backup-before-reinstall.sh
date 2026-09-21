#!/usr/bin/env bash
# Full Multivate production backup BEFORE server reinstall / wipe.
#
# On the CURRENT server:
#   cd /opt/multivate
#   sudo bash scripts/backup-before-reinstall.sh
#
# Then download the archive to your laptop (or another safe place)
# BEFORE the host is wiped. Do not keep the only copy on this server.

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/multivate}"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR:-/root/multivate-backup-$STAMP}"

echo "==> Backup folder: $OUT"
mkdir -p "$OUT"/{db,media,redis,ssl,config}

cd "$APP_DIR"

if [[ ! -f .env.production ]]; then
  echo "ERROR: $APP_DIR/.env.production not found"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.production
set +a
PGUSER="${POSTGRES_USER:-multivate}"
PGDB="multivate"

vol_name() {
  # Prefer compose project volumes: multivate-prod_<name>
  local short="$1"
  docker volume ls -q | grep -E "(^|_|-)${short}$" | head -n 1 || true
}

echo "==> 1/6 Postgres dump (all users, courses, payments, progress…)"
$COMPOSE exec -T db pg_dump -U "$PGUSER" -d "$PGDB" --no-owner --format=custom \
  > "$OUT/db/multivate.dump"
$COMPOSE exec -T db pg_dump -U "$PGUSER" -d "$PGDB" --no-owner --format=plain \
  > "$OUT/db/multivate.sql"
ls -lh "$OUT/db/"

echo "==> 2/6 Media volume (audio, videos, covers, uploads)"
MEDIA_VOL="$(vol_name multivate_media)"
if [[ -z "$MEDIA_VOL" ]]; then
  MEDIA_VOL="$(docker volume ls -q | grep media | head -n 1 || true)"
fi
if [[ -n "$MEDIA_VOL" ]]; then
  echo "    using volume: $MEDIA_VOL"
  docker run --rm -v "$MEDIA_VOL":/data -v "$OUT/media":/backup alpine \
    tar czf /backup/media.tar.gz -C /data .
else
  echo "    WARN: media volume not found — listing volumes:"
  docker volume ls
fi
ls -lh "$OUT/media/" 2>/dev/null || true

echo "==> 3/6 Redis (sessions / OTP — optional)"
REDIS_VOL="$(vol_name multivate_redis)"
if [[ -z "$REDIS_VOL" ]]; then
  REDIS_VOL="$(docker volume ls -q | grep redis | head -n 1 || true)"
fi
if [[ -n "$REDIS_VOL" ]]; then
  $COMPOSE exec -T redis redis-cli BGSAVE || true
  sleep 2
  docker run --rm -v "$REDIS_VOL":/data -v "$OUT/redis":/backup alpine \
    tar czf /backup/redis.tar.gz -C /data .
fi

echo "==> 4/6 SSL certificates (Let's Encrypt)"
CERT_VOL="$(vol_name certbot_conf)"
if [[ -z "$CERT_VOL" ]]; then
  CERT_VOL="$(docker volume ls -q | grep certbot_conf | head -n 1 || true)"
fi
if [[ -n "$CERT_VOL" ]]; then
  docker run --rm -v "$CERT_VOL":/etc/letsencrypt -v "$OUT/ssl":/backup alpine \
    tar czf /backup/letsencrypt.tar.gz -C /etc/letsencrypt .
fi

echo "==> 5/6 Secrets & config (KEEP PRIVATE)"
cp -a .env.production "$OUT/config/.env.production"
cp -a docker-compose.prod.yml "$OUT/config/" 2>/dev/null || true
cp -a docker/nginx "$OUT/config/nginx" 2>/dev/null || true
docker volume ls > "$OUT/config/docker-volumes.txt"
$COMPOSE ps > "$OUT/config/compose-ps.txt" 2>/dev/null || true
git -C "$APP_DIR" rev-parse HEAD > "$OUT/config/git-commit.txt" 2>/dev/null || echo "unknown" > "$OUT/config/git-commit.txt"
uname -a > "$OUT/config/server-uname.txt" || true

echo "==> 6/6 Compress + checksum"
ARCHIVE="/root/multivate-FULL-BACKUP-$STAMP.tar.gz"
tar czf "$ARCHIVE" -C "$(dirname "$OUT")" "$(basename "$OUT")"
sha256sum "$ARCHIVE" | tee "${ARCHIVE}.sha256"

echo
echo "============================================"
echo " BACKUP COMPLETE"
echo "============================================"
echo "Folder : $OUT"
echo "Archive: $ARCHIVE"
echo
echo "CRITICAL — download OFF this server before wipe:"
echo "  scp root@YOUR_SERVER_IP:$ARCHIVE ~/Desktop/"
echo "  scp root@YOUR_SERVER_IP:${ARCHIVE}.sha256 ~/Desktop/"
echo
echo "Must include in backup:"
echo "  [x] Postgres dump"
echo "  [x] Media (voices, videos, images)"
echo "  [x] .env.production (secrets)"
echo "  [x] SSL certs (optional — can reissue)"
echo "  [ ] Confirm archive size is not tiny (media should be large)"
echo
du -sh "$ARCHIVE" "$OUT/db" "$OUT/media" 2>/dev/null || true
