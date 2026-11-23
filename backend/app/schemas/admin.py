"""Admin-related Pydantic schemas for ClipForge AI API."""

import uuid
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Base user response (duplicated here to avoid circular imports with an auth
# module that may not exist yet).  When an auth schemas module is available
# this class can inherit from it instead.
# ---------------------------------------------------------------------------

class UserResponse(BaseModel):
    """Minimal user response schema used as a base for admin views."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    is_active: bool = True
    plan: str = "free"
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Admin schemas
# ---------------------------------------------------------------------------

class AdminStatsResponse(BaseModel):
    """Platform-wide statistics visible to admins."""

    total_users: int
    total_projects: int
    videos_processed: int
    total_clips: int
    storage_used_mb: float
    storage_used_gb: float = 0.0  # computed from storage_used_mb
    active_jobs: int
    failed_jobs: int
    new_users_today: int = 0
    clips_today: int = 0


class AdminUserResponse(UserResponse):
    """Extended user response for admin views."""

    is_suspended: bool = False
    videos_count: int = 0
    clips_count: int = 0


class AdminUserListResponse(BaseModel):
    """Paginated list of admin user records."""

    users: List[AdminUserResponse]
    total: int


class AdminSettingUpdate(BaseModel):
    """Request schema for updating a single admin setting."""

    key: str = Field(..., min_length=1, max_length=255)
    value: Any


class AdminJobResponse(BaseModel):
    """Response schema for a background processing job."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    job_type: str
    status: str
    progress: float = 0.0
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
