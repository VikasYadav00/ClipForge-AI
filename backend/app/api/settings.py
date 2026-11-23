from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.password import verify_password, hash_password
from app.database import get_db
from app.models.models import User
from app.schemas.settings import (
    NotificationPreferences,
    UpdateSettingsRequest,
    UserSettingsResponse,
)

router = APIRouter()


class UpdateProfileRequest(BaseModel):
    full_name: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.get("", response_model=UserSettingsResponse)
async def get_user_settings(
    current_user: User = Depends(get_current_user),
):
    return UserSettingsResponse(
        full_name=current_user.name,
        display_name=current_user.name.split()[0] if current_user.name else "Creator",
        avatar_url=current_user.profile_photo_url,
        timezone="UTC",
        language="en",
        default_video_format="9:16",
        default_caption_style="bold",
        default_add_captions=True,
        default_add_hook=True,
        default_smart_crop=True,
        default_face_tracking=True,
        notification_preferences=NotificationPreferences(),
    )

@router.put("", response_model=UserSettingsResponse)
async def update_user_settings(
    req: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.full_name is not None:
        current_user.name = req.full_name
    if req.avatar_url is not None:
        current_user.profile_photo_url = req.avatar_url

    await db.commit()
    await db.refresh(current_user)

    return UserSettingsResponse(
        full_name=current_user.name,
        display_name=req.display_name or (current_user.name.split()[0] if current_user.name else "Creator"),
        avatar_url=current_user.profile_photo_url,
        timezone=req.timezone or "UTC",
        language=req.language or "en",
        default_video_format=req.default_video_format or "9:16",
        default_caption_style=req.default_caption_style or "bold",
        default_add_captions=req.default_add_captions if req.default_add_captions is not None else True,
        default_add_hook=req.default_add_hook if req.default_add_hook is not None else True,
        default_smart_crop=req.default_smart_crop if req.default_smart_crop is not None else True,
        default_face_tracking=req.default_face_tracking if req.default_face_tracking is not None else True,
        notification_preferences=req.notification_preferences or NotificationPreferences(),
    )


@router.put("/profile")
async def update_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user display name."""
    if req.full_name is not None:
        current_user.name = req.full_name
    await db.commit()
    return {"message": "Profile updated", "full_name": current_user.name}


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the authenticated user's password."""
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if len(req.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be at least 8 characters",
        )
    current_user.password_hash = hash_password(req.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}
