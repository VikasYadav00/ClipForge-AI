"""Clip-related Pydantic schemas for ClipForge AI API."""

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ClipScoreBreakdown(BaseModel):
    """Breakdown of the viral-potential score for a clip."""

    hook: int = Field(..., ge=0, le=100, description="Hook strength score")
    emotion: int = Field(..., ge=0, le=100, description="Emotional impact score")
    interesting: int = Field(..., ge=0, le=100, description="Interestingness score")
    replay: int = Field(..., ge=0, le=100, description="Replay value score")
    context: int = Field(..., ge=0, le=100, description="Context clarity score")
    visual: int = Field(..., ge=0, le=100, description="Visual appeal score")
    ending: int = Field(..., ge=0, le=100, description="Ending strength score")


class ClipResponse(BaseModel):
    """Response schema for a single clip."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    clip_number: int
    title: Optional[str] = None
    start_time: float
    end_time: float
    duration: float
    viral_score: Optional[float] = None
    score_breakdown: Optional[ClipScoreBreakdown] = None
    clip_type: Optional[str] = None
    hook_text: Optional[str] = None
    caption_text: Optional[str] = None
    hashtags: Optional[List[str]] = None
    ai_titles: Optional[List[str]] = None
    ai_description: Optional[str] = None
    video_path: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_path: Optional[str] = None
    subtitle_path: Optional[str] = None
    subtitle_style: Optional[str] = None
    has_captions: bool = False
    has_hook: bool = False
    has_watermark: bool = False
    processing_status: str = "pending"
    created_at: datetime

    @field_validator("duration")
    @classmethod
    def duration_must_not_exceed_30(cls, v: float) -> float:
        """Clip duration must never exceed 30 seconds."""
        if v > 30:
            raise ValueError("Clip duration cannot exceed 30 seconds")
        return v


class ClipListResponse(BaseModel):
    """Paginated list of clips."""

    clips: List[ClipResponse]
    total: int


class UpdateClipRequest(BaseModel):
    """Request schema for updating a clip's metadata."""

    model_config = ConfigDict(str_strip_whitespace=True)

    title: Optional[str] = Field(default=None, max_length=500)
    start_time: Optional[float] = Field(default=None, ge=0)
    end_time: Optional[float] = Field(default=None, ge=0)
    hook_text: Optional[str] = Field(default=None, max_length=1000)
    caption_text: Optional[str] = None
    subtitle_style: Optional[str] = None
    has_captions: Optional[bool] = None
    has_hook: Optional[bool] = None
    has_watermark: Optional[bool] = None

    @model_validator(mode="after")
    def validate_clip_time_range(self) -> "UpdateClipRequest":
        """If both start_time and end_time are provided, the resulting
        duration must not exceed 30 seconds."""
        if self.start_time is not None and self.end_time is not None:
            if self.end_time <= self.start_time:
                raise ValueError("end_time must be greater than start_time")
            duration = self.end_time - self.start_time
            if duration > 30:
                raise ValueError(
                    "Clip duration (end_time - start_time) cannot exceed 30 seconds"
                )
        return self
