from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.models import Usage, User
from app.schemas.usage import UsageResponse

router = APIRouter()

UNLIMITED_LIMITS = {
    "max_videos_per_month": 999999,
    "max_clips_per_video": 999999,
    "max_duration_seconds": 30,
    "storage_mb": 99999999,
    "resolution": "1080p (Highest Quality)",
    "custom_watermark": True,
    "priority_support": True,
}

PLAN_LIMITS = {
    "free": UNLIMITED_LIMITS,
    "pro": UNLIMITED_LIMITS,
    "enterprise": UNLIMITED_LIMITS,
}

@router.get("", response_model=UsageResponse)
async def get_user_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Usage).where(Usage.user_id == current_user.id)
    res = await db.execute(stmt)
    usage = res.scalar_one_or_none()

    now = datetime.utcnow()
    period_start = datetime(now.year, now.month, 1)
    period_end = datetime(now.year, now.month + 1, 1) if now.month < 12 else datetime(now.year + 1, 1, 1)

    plan = current_user.subscription_plan or "free"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

    if not usage:
        return UsageResponse(
            videos_processed=0,
            minutes_processed=0.0,
            clips_generated=0,
            storage_used_mb=0.0,
            billing_period_start=period_start,
            billing_period_end=period_end,
            plan_limits=limits
        )

    return UsageResponse(
        videos_processed=usage.videos_processed,
        minutes_processed=usage.minutes_processed,
        clips_generated=usage.clips_generated,
        storage_used_mb=usage.storage_used_mb,
        billing_period_start=datetime.combine(usage.billing_period_start, datetime.min.time()) if hasattr(usage.billing_period_start, 'year') else period_start,
        billing_period_end=datetime.combine(usage.billing_period_end, datetime.min.time()) if hasattr(usage.billing_period_end, 'year') else period_end,
        plan_limits=limits
    )
