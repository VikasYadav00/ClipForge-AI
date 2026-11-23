import logging
import os
import sys

# Ensure local binaries directory (ffmpeg, ffprobe) is in PATH
bin_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "bin"))
if os.path.exists(bin_dir) and bin_dir not in os.environ.get("PATH", ""):
    os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import init_db
from app.api import (
    auth_router,
    projects_router,
    clips_router,
    downloads_router,
    settings_router,
    usage_router,
    admin_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    # Create storage directories
    for dir_path in [settings.UPLOAD_DIR, settings.OUTPUT_DIR, settings.TEMP_DIR]:
        os.makedirs(dir_path, exist_ok=True)
    yield
    # Shutdown


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Long Video to Viral Shorts Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


logger = logging.getLogger("clipforge")


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error processing request to {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred."},
    )


# Mount static files for storage
if settings.STORAGE_PROVIDER == "local":
    for mount_path, dir_path in [
        ("/storage/uploads", settings.UPLOAD_DIR),
        ("/storage/output", settings.OUTPUT_DIR),
    ]:
        os.makedirs(dir_path, exist_ok=True)
        app.mount(
            mount_path,
            StaticFiles(directory=dir_path),
            name=mount_path.replace("/", "_"),
        )

# Routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])
app.include_router(clips_router, prefix="/api/clips", tags=["Clips"])
app.include_router(downloads_router, prefix="/api/downloads", tags=["Downloads"])
app.include_router(settings_router, prefix="/api/settings", tags=["Settings"])
app.include_router(usage_router, prefix="/api/usage", tags=["Usage"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "demo_mode": settings.is_demo_mode,
    }
