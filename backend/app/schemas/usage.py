"""Usage / billing Pydantic schemas for ClipForge AI API."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UsageResponse(BaseModel):
    """Response schema for the current user's usage statistics."""

    model_config = ConfigDict(from_attributes=True)

    videos_processed: int = 0
    minutes_processed: float = 0.0
    clips_generated: int = 0
    storage_used_mb: float = 0.0
    billing_period_start: datetime
    billing_period_end: datetime
    plan_limits: dict
