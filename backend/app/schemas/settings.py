"""User settings Pydantic schemas for ClipForge AI API."""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class NotificationPreferences(BaseModel):
    """Nested schema for notification preferences."""

    email_on_processing_complete: bool = True
    email_on_clip_ready: bool = True
    email_weekly_digest: bool = False
    push_notifications: bool = True


class UserSettingsResponse(BaseModel):
    """Response schema for the current user's profile & notification settings."""

    model_config = ConfigDict(from_attributes=True)

    # Profile settings
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: str = "UTC"
    language: str = "en"

    # Default clip settings
    default_video_format: str = "9:16"
    default_caption_style: str = "bold"
    default_add_captions: bool = True
    default_add_hook: bool = True
    default_smart_crop: bool = True
    default_face_tracking: bool = True

    # Notification preferences
    notification_preferences: NotificationPreferences = Field(
        default_factory=NotificationPreferences
    )


class UpdateSettingsRequest(BaseModel):
    """Request schema for updating user settings (all fields optional)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    # Profile settings
    full_name: Optional[str] = Field(default=None, max_length=255)
    display_name: Optional[str] = Field(default=None, max_length=100)
    avatar_url: Optional[str] = Field(default=None, max_length=2048)
    timezone: Optional[str] = Field(default=None, max_length=50)
    language: Optional[str] = Field(default=None, max_length=10)

    # Default clip settings
    default_video_format: Optional[str] = None
    default_caption_style: Optional[str] = None
    default_add_captions: Optional[bool] = None
    default_add_hook: Optional[bool] = None
    default_smart_crop: Optional[bool] = None
    default_face_tracking: Optional[bool] = None

    # Notification preferences
    notification_preferences: Optional[NotificationPreferences] = None
