# Restore Multivate after a clean server install

Use this after the host OS is reinstalled and Docker is installed again.

## What you must have downloaded off the old server

- `multivate-FULL-BACKUP-*.tar.gz`
- `multivate-FULL-BACKUP-*.tar.gz.sha256`

Verify:

```bash
sha256sum -c multivate-FULL-BACKUP-*.sha256
```

## 1. Fresh server setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# log out/in

sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/Multivate/multivate-skills.git multivate
sudo chown -R $USER:$USER multivate
cd multivate
git checkout main
```

## 2. Unpack backup

```bash
sudo mkdir -p /root/restore
sudo tar xzf ~/multivate-FULL-BACKUP-*.tar.gz -C /root/restore
# folder will look like /root/restore/multivate-backup-YYYYMMDD-HHMMSS
BACKUP=$(echo /root/restore/multivate-backup-*)
```

## 3. Restore secrets

```bash
cp "$BACKUP/config/.env.production" /opt/multivate/.env.production
chmod 600 /opt/multivate/.env.production
```

Double-check secrets still look correct (`POSTGRES_PASSWORD`, `SECRET_KEY`, `RESEND_API_KEY`, etc.).

## 4. Start DB only, then restore database

```bash
cd /opt/multivate
docker compose -f docker-compose.prod.yml --env-file .env.production up -d db
# wait until healthy
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

```bash
# Drop into a clean restore (first boot DB is empty aside from default DB)
source .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db \
  pg_restore -U "${POSTGRES_USER:-multivate}" -d multivate --clean --if-exists --no-owner \
  < "$BACKUP/db/multivate.dump"
```

If `pg_restore` warns about errors, fall back to SQL:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db \
  psql -U "${POSTGRES_USER:-multivate}" -d multivate < "$BACKUP/db/multivate.sql"
```

## 5. Restore media (voices, videos, images)

```bash
# Start api once so the media volume exists, or create volume explicitly
docker compose -f docker-compose.prod.yml --env-file .env.production up -d api
MEDIA_VOL=$(docker volume ls -q | grep multivate_media | head -n 1)
docker run --rm -v "$MEDIA_VOL":/data -v "$BACKUP/media":/backup alpine \
  sh -c "cd /data && rm -rf ./* && tar xzf /backup/media.tar.gz"
```

## 6. Restore SSL (optional)

You can restore certs **or** reissue with Certbot after DNS points to the new IP.

```bash
CERT_VOL=$(docker volume ls -q | grep certbot_conf | head -n 1)
# ensure volume exists (start nginx/certbot once if needed)
docker run --rm -v "$CERT_VOL":/etc/letsencrypt -v "$BACKUP/ssl":/backup alpine \
  sh -c "cd /etc/letsencrypt && tar xzf /backup/letsencrypt.tar.gz"
```

If the server IP changed, prefer reissuing:

```bash
./scripts/deploy-ubuntu.sh
./scripts/issue-ssl.sh
```

## 7. Bring full stack up

```bash
cd /opt/multivate
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## 8. Smoke checks

- https://www.multivateskills.com loads
- Login works
- A course with audio plays
- Admin can see users / payments
- Uploaded media still appears

## Priority if time is short

1. `.env.production` (secrets)
2. Postgres dump (all app data)
3. Media archive (all course files / voice)
4. SSL (nice to have)
5. Redis (optional — users just re-login)
