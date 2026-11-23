#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "==========================================="
echo "  ClipForge AI — Development Startup"
echo "==========================================="
echo ""

# ── Backend ──────────────────────────────────────────────────────────────────
echo "[1/4] Setting up Python backend..."
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "  Installing Python dependencies..."
pip install -r requirements.txt -q

if [ ! -f ".env" ]; then
    if [ -f "$ROOT_DIR/.env.example" ]; then
        cp "$ROOT_DIR/.env.example" .env
        echo "  .env created from .env.example — EDIT IT before continuing!"
    fi
fi

echo "  Running database migrations..."
alembic upgrade head

echo ""
echo "[2/4] Starting FastAPI backend on :8000..."
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "[3/4] Setting up Next.js frontend..."
cd "$ROOT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "  Installing Node dependencies..."
    npm install --legacy-peer-deps
fi

echo ""
echo "[4/4] Starting Next.js frontend on :3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "==========================================="
echo "  ClipForge AI is running!"
echo "  Frontend : http://localhost:3000"
echo "  Backend  : http://localhost:8000"
echo "  API Docs : http://localhost:8000/docs"
echo "==========================================="
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for both
wait $BACKEND_PID $FRONTEND_PID
