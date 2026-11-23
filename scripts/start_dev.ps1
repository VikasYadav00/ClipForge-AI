# PowerShell dev startup for ClipForge AI (Windows)
param(
    [switch]$SkipInstall,
    [switch]$FrontendOnly,
    [switch]$BackendOnly
)

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  ClipForge AI — Development Startup" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$RootDir = Split-Path -Parent $PSScriptRoot

# ── Backend ──────────────────────────────────────────────────────────────────
if (-not $FrontendOnly) {
    Write-Host "[1/4] Setting up Python backend..." -ForegroundColor Yellow
    Set-Location "$RootDir\backend"

    if (-not (Test-Path "venv")) {
        Write-Host "  Creating virtual environment..." -ForegroundColor Gray
        python -m venv venv
    }

    # Activate venv
    & ".\venv\Scripts\Activate.ps1"

    if (-not $SkipInstall) {
        Write-Host "  Installing Python dependencies..." -ForegroundColor Gray
        pip install -r requirements.txt --quiet
    }

    # Copy .env if not exists
    if (-not (Test-Path ".env")) {
        if (Test-Path "$RootDir\.env.example") {
            Copy-Item "$RootDir\.env.example" ".env"
            Write-Host "  .env created from .env.example — EDIT IT before proceeding!" -ForegroundColor Red
        }
    }

    Write-Host "  Running database migrations..." -ForegroundColor Gray
    alembic upgrade head

    Write-Host ""
    Write-Host "[2/4] Starting FastAPI backend on :8000 ..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootDir\backend'; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"
}

# ── Frontend ─────────────────────────────────────────────────────────────────
if (-not $BackendOnly) {
    Write-Host "[3/4] Setting up Next.js frontend..." -ForegroundColor Yellow
    Set-Location "$RootDir\frontend"

    if (-not $SkipInstall) {
        Write-Host "  Installing Node dependencies (this may take a minute)..." -ForegroundColor Gray
        npm install --legacy-peer-deps
    }

    Write-Host ""
    Write-Host "[4/4] Starting Next.js frontend on :3000 ..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootDir\frontend'; npm run dev"
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "  ClipForge AI is starting!" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend  : http://localhost:8000" -ForegroundColor Green
Write-Host "  API Docs : http://localhost:8000/docs" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""
