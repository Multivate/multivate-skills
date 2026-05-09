# Wipe the local Docker Postgres volume and start a fresh empty database.
# Run from the repo root (same folder as docker-compose.yml):
#   .\reset-db.ps1
#
# This runs: docker compose down -v  (removes volume multivate_pg and ALL data)
# then:       docker compose up -d db
#
# After this, start the API from backend/ (e.g. .\run-api.ps1). With AUTO_CREATE_TABLES=true,
# FastAPI will create tables on first boot.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".\docker-compose.yml")) {
    Write-Error "Run this script from the multivate-edtech repo root (docker-compose.yml must be here)."
    exit 1
}

Write-Host "`n=== Stopping containers and REMOVING Postgres volume (all data lost) ===" -ForegroundColor Yellow
docker compose down -v

Write-Host "`n=== Starting Postgres (empty data directory) ===" -ForegroundColor Green
docker compose up -d db

Write-Host "`n=== Waiting for Postgres to accept connections ===" -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 45; $i++) {
    docker compose exec -T db pg_isready -U multivate -d multivate 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 1
}

if (-not $ready) {
    Write-Error "Postgres did not become ready in time. Check: docker compose logs db"
    exit 1
}

Write-Host "`nDone. Database is empty. Next:" -ForegroundColor Green
Write-Host "  1) cd backend" -ForegroundColor White
Write-Host "  2) .\run-api.ps1   (or: python scripts/ensure_dev_account.py after API has created tables)" -ForegroundColor White
Write-Host "  3) Optional wipe users + admin: `$env:RESET_USERS_CONFIRM='yes'; python scripts/reset_all_users_and_admin.py`" -ForegroundColor White
Write-Host ""
