# Start or verify PostgreSQL for Multivate (Docker Compose preferred on Windows).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Resolve-Docker {
    if (Get-Command docker -ErrorAction SilentlyContinue) { return "docker" }
    $p = "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe"
    if (Test-Path $p) { return $p }
    return $null
}

$docker = Resolve-Docker
if ($docker) {
    Write-Host "Starting Postgres with Docker Compose (service: db)..."
    & $docker compose up -d db
    Write-Host "Waiting for Postgres to accept connections..."
    $ready = $false
    for ($i = 0; $i -lt 90; $i++) {
        & $docker compose exec -T db pg_isready -U multivate -d multivate 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK: Postgres is ready on localhost:5432 (user/database: multivate)."
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        Write-Error "Postgres container did not become ready in time. Check: docker compose logs db"
        exit 1
    }
} else {
    Write-Host "Docker was not found in PATH or under Program Files."
    Write-Host ""
    Write-Host "Option A - Install Docker Desktop, then run this script again from repo root:"
    Write-Host "  .\scripts\setup-database.ps1"
    Write-Host ""
    Write-Host "Option B - Use an existing PostgreSQL server:"
    Write-Host "  1. Start your PostgreSQL service."
    Write-Host "  2. As superuser from repo root: psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f database\manual-init.sql"
    Write-Host "     (or run database\pgadmin\01-role.sql then 02-databases.sql in pgAdmin)"
    Write-Host "  3. Ensure backend\.env has DATABASE_URL=postgresql://multivate:multivate@localhost:5432/multivate"
    Write-Host ""
}

$envExample = Join-Path $Root "backend\.env.example"
$envTarget = Join-Path $Root "backend\.env"
if (-not (Test-Path $envTarget)) {
    Copy-Item $envExample $envTarget
    Write-Host "Created backend\.env from .env.example (edit SECRET_KEY if you like)."
} else {
    Write-Host "backend\.env already exists; left unchanged."
}

Write-Host ""
Write-Host "Next: cd backend; activate venv; uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
Write-Host "Then open http://127.0.0.1:8000/health/ready"
