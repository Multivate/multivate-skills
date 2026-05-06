# Start local Postgres (docker-compose `db` service) and wait until it accepts connections.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
docker compose up -d db
Write-Host "Waiting for Postgres..."
for ($i = 0; $i -lt 60; $i++) {
    docker compose exec -T db pg_isready -U multivate -d multivate 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Postgres is ready (user multivate, database multivate)."
        exit 0
    }
    Start-Sleep -Seconds 1
}
Write-Error "Timeout: Postgres did not become ready."
exit 1
