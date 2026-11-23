"""Project-related Pydantic schemas for ClipForge AI API."""

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CreateProjectRequest(BaseModel):
    """Request schema for creating a new project."""

    model_config = ConfigDict(str_strip_whitespace=True)

    project_name: str = Field(
        ..., min_length=1, max_length=255, description="Name of the project"
    )


class CreateFromYouTubeRequest(BaseModel):
    """Request schema for creating a project directly from a YouTube URL."""

    model_config = ConfigDict(str_strip_whitespace=True)

    youtube_url: str = Field(..., min_length=10, description="Full YouTube URL")
    project_name: Optional[str] = Field(None, description="Optional custom project name")
    clip_settings: Optional[dict] = Field(None, description="Optional clip generation preferences")


class ProjectSettingsRequest(BaseModel):
    """Request schema for configuring project clip-generation settings."""

    model_config = ConfigDict(str_strip_whitespace=True)

    max_clip_duration: int = Field(
        default=30,
        ge=1,
        le=30,
        description="Maximum clip duration in seconds (cannot exceed 30)",
    )
    min_clip_duration: int = Field(
        default=10,
        ge=1,
        le=30,
        description="Minimum clip duration in seconds",
    )
    num_clips: int = Field(
        default=10, ge=1, le=100, description="Number of clips to generate"
    )
    clip_style: str = Field(
        default="auto",
        description="Style of clips to generate",
    )
    video_format: str = Field(
        default="9:16",
        description="Output video aspect ratio / format",
    )
    caption_style: str = Field(
        default="bold",
        description="Style for captions overlay",
    )
    add_captions: bool = Field(default=True, description="Add captions to clips")
    add_hook: bool = Field(default=True, description="Add hook text to clips")
    add_watermark: bool = Field(default=False, description="Add watermark to clips")
    smart_crop: bool = Field(default=True, description="Use AI smart-cropping")
    face_tracking: bool = Field(
        default=True, description="Enable face-tracking for cropping"
    )
    add_background_music: bool = Field(
        default=False, description="Add background music to clips"
    )
    generate_titles: bool = Field(
        default=True, description="Auto-generate titles for clips"
    )
    generate_hashtags: bool = Field(
        default=True, description="Auto-generate hashtags for clips"
    )

    @field_validator("max_clip_duration")
    @classmethod
    def max_clip_duration_must_not_exceed_30(cls, v: int) -> int:
        """Hard-enforce that max_clip_duration never exceeds 30 seconds."""
        if v > 30:
            raise ValueError("max_clip_duration cannot exceed 30 seconds")
        return v

    @field_validator("min_clip_duration")
    @classmethod
    def min_must_not_exceed_max(cls, v: int, info) -> int:
        """Ensure min_clip_duration does not exceed max_clip_duration."""
        max_dur = info.data.get("max_clip_duration")
        if max_dur is not None and v > max_dur:
            raise ValueError(
                "min_clip_duration cannot be greater than max_clip_duration"
            )
        return v


class ProjectResponse(BaseModel):
    """Response schema for a single project."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    project_name: str
    original_filename: Optional[str] = None
    original_duration: Optional[float] = None
    original_resolution: Optional[str] = None
    file_size: Optional[int] = None
    processing_status: str
    processing_progress: float = 0.0
    processing_stage: Optional[str] = None
    clip_settings: Optional[dict] = None
    thumbnail_path: Optional[str] = None
    error_message: Optional[str] = None
    clips_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    """Paginated list of projects."""

    projects: List[ProjectResponse]
    total: int


class ProcessingStatusResponse(BaseModel):
    """Response schema for project processing status."""

    model_config = ConfigDict(from_attributes=True)

    project_id: uuid.UUID
    status: str
    progress: float
    stage: Optional[str] = None
    error_message: Optional[str] = None
