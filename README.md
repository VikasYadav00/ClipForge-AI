# ClipForge AI ✂️

> **Turn Long Videos Into Viral Moments.**

ClipForge AI is a production-ready AI SaaS platform that automatically converts long-form videos into short, viral clips ready for YouTube Shorts, Instagram Reels, and TikTok. It uses AI to find the best moments, adds animated captions, smart-crops to 9:16 vertical format, and enforces a strict 30-second maximum clip duration at every layer.

---

## ✨ Features

| Feature | Description |
|---|---|
| **AI Viral Moment Detection** | Analyzes the full transcript to find hooks, emotional peaks, funny moments, and high-replay segments |
| **Strict 30s Enforcement** | Clips are enforced ≤ 30 seconds at schema, model, API, rendering, and FFprobe layers |
| **Smart Vertical Reframing** | Auto-crops to 9:16 (1080×1920) with optional face tracking |
| **Animated Captions** | 6 subtitle styles: Clean, Bold, MrBeast-inspired, Minimal, Karaoke, Highlight |
| **Viral Score** | 0–100 AI-predicted score per clip (hook, emotion, replay, context, visual, ending) |
| **Batch ZIP Download** | Download all clips for a project in a single ZIP |
| **Demo Mode** | Runs without any AI API keys using a realistic demo provider |
| **Admin Dashboard** | User management, platform stats, failed job inspection |

---

## 🏗️ Tech Stack

**Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, Lucide Icons  
**Backend:** Python 3.11, FastAPI, SQLAlchemy (async), Alembic  
**AI:** Whisper (transcription), Gemini API or OpenAI (analysis), Demo mode  
**Video:** FFmpeg, FFprobe, PySceneDetect, MediaPipe, OpenCV  
**Queue:** Celery + Redis  
**Database:** PostgreSQL (production) / SQLite (development)  
**Storage:** Local filesystem (dev) / Cloudflare R2 / AWS S3 (production)  
**Auth:** JWT (Argon2 / bcrypt password hashing)

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Python 3.11+
- Node.js 20+
- FFmpeg (must be in PATH)
- PostgreSQL 15+ **or** use SQLite (zero config)
- Redis (optional — only needed for Celery workers)

### 1. Clone & configure

```bash
git clone https://github.com/yourorg/clipforge-ai.git
cd clipforge-ai
cp .env.example .env
# Edit .env with your settings
```

### 2a. Windows (PowerShell)

```powershell
.\scripts\start_dev.ps1
```

### 2b. Linux / macOS

```bash
chmod +x scripts/start_dev.sh
./scripts/start_dev.sh
```

### 2c. Manual setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend (new terminal):**
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

### URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Interactive API Docs | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

---

## 🐳 Docker Compose

```bash
# Start everything (Postgres, Redis, Backend, Worker, Frontend)
docker compose up --build

# Stop
docker compose down

# View logs
docker compose logs -f backend
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# ── Database ──────────────────────────────────────────────────────────────────
# SQLite (zero-config dev):
DATABASE_URL=sqlite+aiosqlite:///./clipforge.db
# PostgreSQL (production):
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/clipforge

# ── Authentication ────────────────────────────────────────────────────────────
JWT_SECRET=your-very-long-random-secret-here
JWT_EXPIRE_MINUTES=10080            # 7 days

# ── AI Provider ───────────────────────────────────────────────────────────────
# Options: demo | gemini | openai
AI_PROVIDER=demo

# Gemini (get key at https://aistudio.google.com)
GEMINI_API_KEY=

# OpenAI (get key at https://platform.openai.com)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# ── Whisper ───────────────────────────────────────────────────────────────────
# Options: tiny | base | small | medium | large (larger = slower + more accurate)
WHISPER_MODEL=base

# ── Storage ───────────────────────────────────────────────────────────────────
# Options: local | s3
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./storage

# S3-compatible (Cloudflare R2, AWS S3, MinIO, etc.)
S3_ENDPOINT_URL=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=clipforge
S3_REGION=auto

# ── Redis (Celery background workers) ────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── Upload limits ────────────────────────────────────────────────────────────
MAX_UPLOAD_SIZE_MB=2048             # 2 GB
MAX_VIDEO_DURATION_SECONDS=7200     # 2 hours

# ── CORS ─────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 🤖 AI Providers

### Demo Mode (default — no API key needed)

When `AI_PROVIDER=demo`, ClipForge AI runs without any external API calls. The demo provider:
- Generates a realistic synthetic transcript
- Selects segments based on keyword scoring (hooks, emotions, etc.)
- Assigns plausible viral scores
- Clearly labels all outputs as demo data

### Gemini (recommended)

1. Get a free API key at [Google AI Studio](https://aistudio.google.com)
2. Set `AI_PROVIDER=gemini` and `GEMINI_API_KEY=...` in `.env`

### OpenAI

1. Get an API key at [OpenAI Platform](https://platform.openai.com)
2. Set `AI_PROVIDER=openai`, `OPENAI_API_KEY=...`, and optionally `OPENAI_MODEL=gpt-4o-mini`

---

## 🎬 Processing Pipeline

```
Upload → FFprobe metadata → Whisper transcription → Scene detection
  → AI highlight analysis → Viral scoring → FFmpeg clip extraction
  → 9:16 smart crop → Subtitle generation → FFprobe 30s verification
  → Output ready
```

The **30-second rule** is enforced at every step:
1. Frontend sliders cap at 30s
2. Pydantic schema validators reject > 30s
3. SQLAlchemy model `@validates` clamps to 30s
4. Database `CHECK CONSTRAINT` blocks > 30s rows
5. Rendering pre-clamp before FFmpeg
6. Post-render FFprobe verification + auto-retrim if needed

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v

# With coverage
pytest tests/ -v --cov=app --cov-report=html
```

Tests use SQLite in-memory — no database setup required.

---

## 📁 Project Structure

```
clipforge-ai/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI route handlers
│   │   ├── auth/          # JWT, password hashing, dependencies
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── ai/        # AI providers (Gemini, OpenAI, Demo)
│   │   │   ├── storage/   # Local & S3 storage backends
│   │   │   └── video/     # FFmpeg, Whisper, smart crop, subtitles
│   │   ├── workers/       # Celery tasks & inline processor
│   │   ├── config.py      # Pydantic settings
│   │   ├── database.py    # Async SQLAlchemy engine
│   │   └── main.py        # FastAPI app + CORS + routers
│   ├── migrations/        # Alembic migrations
│   ├── tests/             # pytest test suite
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── dashboard/     # Protected dashboard pages
│   │   │   ├── create/    # Upload & process video
│   │   │   ├── projects/  # Project list & detail
│   │   │   ├── clips/     # Clip editor & preview
│   │   │   ├── downloads/ # Download manager
│   │   │   ├── settings/  # User settings
│   │   │   ├── billing/   # Plan & usage
│   │   │   └── admin/     # Admin panel
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── page.tsx       # Landing page
│   ├── lib/
│   │   ├── api.ts         # Namespaced API client
│   │   ├── auth-context.tsx
│   │   └── utils.ts
│   ├── Dockerfile
│   └── package.json
│
├── scripts/
│   ├── start_dev.ps1      # Windows dev startup
│   └── start_dev.sh       # Linux/macOS dev startup
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ⚠️ Important Notes

- **Payment processing** is not implemented. The billing page is UI-only. Stripe integration will be added in a future release.
- **Viral scores** are AI predictions, not guarantees of actual viral performance.
- **Demo mode** is clearly separated from production AI results.
- **Email verification** requires SMTP configuration (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` in `.env`).
- **FFmpeg** must be installed and in your system PATH for video processing to work.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ using Next.js, FastAPI, and Gemini AI.
