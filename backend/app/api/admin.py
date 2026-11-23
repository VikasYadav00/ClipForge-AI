import uuid
from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin
from app.database import get_db
from app.models.models import AdminSettings, Clip, ProcessingJob, Project, Usage, User
from app.schemas.admin import (
    AdminJobResponse,
    AdminSettingUpdate,
    AdminStatsResponse,
    AdminUserListResponse,
    AdminUserResponse,
)

router = APIRouter()

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    users_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    projects_count = (await db.execute(select(func.count(Project.id)))).scalar_one()
    clips_count = (await db.execute(select(func.count(Clip.id)))).scalar_one()

    # Videos processed from Usage
    processed_count = (
        await db.execute(select(func.coalesce(func.sum(Usage.videos_processed), 0)))
    ).scalar_one()

    storage_mb = (
        await db.execute(select(func.coalesce(func.sum(Usage.storage_used_mb), 0.0)))
    ).scalar_one()

    active_jobs = (
        await db.execute(
            select(func.count(Project.id)).where(
                Project.processing_status.in_([
                    "queued", "transcribing", "analyzing",
                    "detecting_highlights", "generating_clips",
                    "adding_captions", "rendering"
                ])
            )
        )
    ).scalar_one()

    failed_jobs = (
        await db.execute(
            select(func.count(Project.id)).where(Project.processing_status == "failed")
        )
    ).scalar_one()

    return AdminStatsResponse(
        total_users=users_count,
        total_projects=projects_count,
        videos_processed=processed_count,
        total_clips=clips_count,
        storage_used_mb=float(storage_mb),
        storage_used_gb=round(float(storage_mb) / 1024, 2),
        active_jobs=active_jobs,
        failed_jobs=failed_jobs,
        new_users_today=0,   # Extend later with date filter
        clips_today=0,       # Extend later with date filter
    )

@router.get("/users", response_model=AdminUserListResponse)
async def list_admin_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(stmt)
    users = res.scalars().all()

    total = (await db.execute(select(func.count(User.id)))).scalar_one()

    admin_users = []
    for u in users:
        v_count = (
            await db.execute(
                select(func.count(Project.id)).where(Project.user_id == u.id)
            )
        ).scalar_one()

        c_count = (
            await db.execute(
                select(func.count(Clip.id))
                .join(Project, Clip.project_id == Project.id)
                .where(Project.user_id == u.id)
            )
        ).scalar_one()

        admin_users.append(
            AdminUserResponse(
                id=u.id,
                email=u.email,
                full_name=u.name,
                is_active=not u.is_suspended,
                plan=u.subscription_plan,
                created_at=u.created_at,
                updated_at=u.updated_at or u.created_at,
                is_suspended=u.is_suspended,
                videos_count=v_count,
                clips_count=c_count,
            )
        )

    return AdminUserListResponse(users=admin_users, total=total)

@router.put("/users/{user_id}/suspend")
async def suspend_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Cannot suspend an admin user")
    user.is_suspended = True
    await db.commit()
    return {"message": "User suspended"}


@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_suspended = False
    await db.commit()
    return {"message": "User activated"}

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()
    return None

@router.get("/jobs", response_model=List[AdminJobResponse])
async def list_jobs(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ProcessingJob).order_by(ProcessingJob.created_at.desc()).limit(50)
    res = await db.execute(stmt)
    jobs = res.scalars().all()
    return list(jobs)


@router.get("/jobs/failed")
async def list_failed_jobs(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return failed processing jobs (projects with status=failed)."""
    stmt = (
        select(Project)
        .where(Project.processing_status == "failed")
        .order_by(Project.updated_at.desc())
        .limit(50)
    )
    res = await db.execute(stmt)
    projects = res.scalars().all()
    return {
        "jobs": [
            {
                "id": str(p.id),
                "project_id": str(p.id),
                "error_message": p.error_message or "Unknown error",
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            for p in projects
        ]
    }


@router.get("/settings")
async def get_admin_settings(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AdminSettings).order_by(AdminSettings.key)
    res = await db.execute(stmt)
    rows = res.scalars().all()
    return {"settings": [{"key": r.key, "value": r.value} for r in rows]}

@router.put("/settings")
async def update_admin_setting(
    setting: AdminSettingUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AdminSettings).where(AdminSettings.key == setting.key)
    res = await db.execute(stmt)
    row = res.scalar_one_or_none()

    if row:
        row.value = setting.value
        row.updated_by = admin.id
    else:
        new_row = AdminSettings(
            key=setting.key,
            value=setting.value,
            updated_by=admin.id,
        )
        db.add(new_row)

    await db.commit()
    return {"status": "success", "key": setting.key}
