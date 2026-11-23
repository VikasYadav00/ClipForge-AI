"""
ClipForge AI — SQLAlchemy 2.0 database models.
"""

import uuid
from datetime import date, datetime
from typing import Any, List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    validates,
)


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    """Shared declarative base for every model."""
    pass


# ---------------------------------------------------------------------------
# 1. User
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False)
    subscription_plan: Mapped[str] = mapped_column(
        String(50), default="free", nullable=False
    )  # free | pro | enterprise
    profile_photo_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    google_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # -- relationships -------------------------------------------------------
    projects: Mapped[List["Project"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    usage_records: Mapped[List["Usage"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"


# ---------------------------------------------------------------------------
# 2. Project
# ---------------------------------------------------------------------------

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    project_name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_video_path: Mapped[str] = mapped_column(String(500), nullable=False)
    original_video_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    original_duration: Mapped[float] = mapped_column(Float, nullable=False)
    original_resolution: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    original_fps: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    # Processing state
    processing_status: Mapped[str] = mapped_column(
        String(50), default="uploaded", nullable=False
    )
    # uploaded | queued | transcribing | analyzing | detecting_highlights
    # generating_clips | adding_captions | rendering | completed | failed | cancelled
    processing_progress: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )  # 0-100
    processing_stage: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    clip_settings: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    ai_model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    thumbnail_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # -- relationships -------------------------------------------------------
    user: Mapped["User"] = relationship(back_populates="projects")
    transcription: Mapped[Optional["Transcription"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", uselist=False, lazy="selectin"
    )
    clips: Mapped[List["Clip"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", lazy="selectin"
    )
    processing_jobs: Mapped[List["ProcessingJob"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Project {self.project_name!r} ({self.processing_status})>"


# ---------------------------------------------------------------------------
# 3. Transcription
# ---------------------------------------------------------------------------

class Transcription(Base):
    __tablename__ = "transcriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    transcript: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    segments_json: Mapped[Optional[Any]] = mapped_column(
        JSON, nullable=True
    )  # [{start, end, text, words}, …]
    word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # -- relationships -------------------------------------------------------
    project: Mapped["Project"] = relationship(back_populates="transcription")

    def __repr__(self) -> str:
        return f"<Transcription project={self.project_id}>"


# ---------------------------------------------------------------------------
# 4. Clip
# ---------------------------------------------------------------------------

class Clip(Base):
    __tablename__ = "clips"
    __table_args__ = (
        CheckConstraint("duration <= 30", name="ck_clip_max_duration_30s"),
        CheckConstraint("viral_score >= 0 AND viral_score <= 100", name="ck_clip_viral_score_range"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )

    clip_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)  # seconds
    end_time: Mapped[float] = mapped_column(Float, nullable=False)    # seconds
    duration: Mapped[float] = mapped_column(Float, nullable=False)    # seconds, <= 30

    viral_score: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-100
    score_breakdown: Mapped[Optional[Any]] = mapped_column(
        JSON, nullable=True
    )  # {hook, emotion, replay, context, visual, ending, interesting}

    clip_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    # funny | educational | gaming | podcast | emotional
    # motivational | storytelling | controversial | informative

    hook_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    caption_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hashtags: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)      # ["#tag", …]
    ai_titles: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)     # [str, str, str]
    ai_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    video_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    video_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    thumbnail_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    subtitle_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    subtitle_style: Mapped[str] = mapped_column(
        String(50), default="bold", nullable=False
    )
    has_captions: Mapped[bool] = mapped_column(Boolean, default=True)
    has_hook: Mapped[bool] = mapped_column(Boolean, default=True)
    has_watermark: Mapped[bool] = mapped_column(Boolean, default=False)

    crop_data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    processing_status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # -- relationships -------------------------------------------------------
    project: Mapped["Project"] = relationship(back_populates="clips")

    # -- validators ----------------------------------------------------------
    @validates("duration")
    def validate_duration(self, _key: str, value: float) -> float:
        if value is not None and value > 30:
            raise ValueError(
                f"Clip duration must be <= 30 seconds, got {value}"
            )
        return value

    @validates("viral_score")
    def validate_viral_score(self, _key: str, value: int) -> int:
        if value is not None and not (0 <= value <= 100):
            raise ValueError(
                f"viral_score must be between 0 and 100, got {value}"
            )
        return value

    def __repr__(self) -> str:
        return f"<Clip #{self.clip_number} score={self.viral_score}>"


# ---------------------------------------------------------------------------
# 5. ProcessingJob
# ---------------------------------------------------------------------------

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )

    job_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # transcription | analysis | clip_generation | rendering | caption_generation
    celery_task_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
    )  # pending | running | completed | failed | cancelled
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # -- relationships -------------------------------------------------------
    project: Mapped["Project"] = relationship(back_populates="processing_jobs")

    def __repr__(self) -> str:
        return f"<ProcessingJob {self.job_type} ({self.status})>"


# ---------------------------------------------------------------------------
# 6. Usage
# ---------------------------------------------------------------------------

class Usage(Base):
    __tablename__ = "usage"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    videos_processed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    minutes_processed: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    clips_generated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    storage_used_mb: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    billing_period_start: Mapped[date] = mapped_column(Date, nullable=False)
    billing_period_end: Mapped[date] = mapped_column(Date, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # -- relationships -------------------------------------------------------
    user: Mapped["User"] = relationship(back_populates="usage_records")

    def __repr__(self) -> str:
        return f"<Usage user={self.user_id} videos={self.videos_processed}>"


# ---------------------------------------------------------------------------
# 7. AdminSettings
# ---------------------------------------------------------------------------

class AdminSettings(Base):
    __tablename__ = "admin_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    key: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    value: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<AdminSettings {self.key!r}>"
