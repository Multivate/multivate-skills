# Start the Multivate API locally (Windows).
# Run from backend folder:  .\run-api.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root

if ($env:DATABASE_URL) {
    Write-Host "WARNING: DATABASE_URL is set in this shell - removing so backend/.env is used." -ForegroundColor Yellow
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}

$py = if (Test-Path ".\.venv\Scripts\python.exe") { ".\.venv\Scripts\python.exe" } else { "python" }
Write-Host "Python: $py" -ForegroundColor Cyan

& $py scripts/verify_local_setup.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nFix database connectivity, then run .\run-api.ps1 again." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting API at http://127.0.0.1:8000  (API docs: http://127.0.0.1:8000/docs)  Ctrl+C to stop" -ForegroundColor Green
Write-Host ""
& $py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
