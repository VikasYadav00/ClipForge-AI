from app.api.auth import router as auth_router
from app.api.projects import router as projects_router
from app.api.clips import router as clips_router
from app.api.downloads import router as downloads_router
from app.api.settings import router as settings_router
from app.api.usage import router as usage_router
from app.api.admin import router as admin_router

__all__ = [
    "auth_router",
    "projects_router",
    "clips_router",
    "downloads_router",
    "settings_router",
    "usage_router",
    "admin_router",
]
