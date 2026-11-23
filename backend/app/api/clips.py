import os
import uuid
from typing import List, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.config import settings
from app.database import get_db
from app.models.models import Clip, Project, Transcription, User
from app.schemas.clips import ClipListResponse, ClipResponse, UpdateClipRequest
from app.services.video.clip_generator import ClipGenerator
from app.services.video.metadata import VideoMetadataExtractor
from app.services.export_manager import ExportManager

router = APIRouter()

@router.get("", response_model=ClipListResponse)
async def list_all_user_clips(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    clip_type: Optional[str] = None,
    sort_by: str = Query("viral_score", pattern="^(viral_score|duration|created_at)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all clips belonging to current user across all projects."""
    query = (
        select(Clip)
        .join(Project, Clip.project_id == Project.id)
        .where(Project.user_id == current_user.id)
    )

    if clip_type and clip_type != "all":
        query = query.where(Clip.clip_type == clip_type)

    if sort_by == "duration":
        query = query.order_by(Clip.duration.desc())
    elif sort_by == "created_at":
        query = query.order_by(Clip.created_at.desc())
    else:
        query = query.order_by(Clip.viral_score.desc())

    query = query.offset(skip).limit(limit)
    res = await db.execute(query)
    clips = res.scalars().all()

    # Total count
    count_query = (
        select(func.count(Clip.id))
        .join(Project, Clip.project_id == Project.id)
        .where(Project.user_id == current_user.id)
    )
    if clip_type and clip_type != "all":
        count_query = count_query.where(Clip.clip_type == clip_type)
    count_res = await db.execute(count_query)
    total = count_res.scalar_one()

    return ClipListResponse(clips=list(clips), total=total)

@router.get("/{clip_id}", response_model=ClipResponse)
async def get_clip(
    clip_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Clip)
        .join(Project, Clip.project_id == Project.id)
        .where(Clip.id == clip_id, Project.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    clip = res.scalar_one_or_none()
    if not clip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Clip not found"
        )
    return clip

@router.put("/{clip_id}", response_model=ClipResponse)
async def update_clip(
    clip_id: uuid.UUID,
    req: UpdateClipRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Clip)
        .join(Project, Clip.project_id == Project.id)
        .where(Clip.id == clip_id, Project.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    clip = res.scalar_one_or_none()
    if not clip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Clip not found"
        )

    # STRICT 30-SECOND DURATION CHECK ON UPDATE
    new_start = req.start_time if req.start_time is not None else clip.start_time
    new_end = req.end_time if req.end_time is not None else clip.end_time
    new_duration = new_end - new_start

    if new_duration > 30.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duration cannot exceed 30 seconds. Requested: {new_duration:.2f}s",
        )
    if new_duration < 1.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duration must be at least 1 second.",
        )

    if req.title is not None:
        clip.title = req.title
    if req.start_time is not None:
        clip.start_time = round(req.start_time, 2)
    if req.end_time is not None:
        clip.end_time = round(req.end_time, 2)
    clip.duration = round(new_duration, 2)

    if req.hook_text is not None:
        clip.hook_text = req.hook_text
    if req.caption_text is not None:
        clip.caption_text = req.caption_text
    if req.subtitle_style is not None:
        clip.subtitle_style = req.subtitle_style
    if req.has_captions is not None:
        clip.has_captions = req.has_captions
    if req.has_hook is not None:
        clip.has_hook = req.has_hook
    if req.has_watermark is not None:
        clip.has_watermark = req.has_watermark

    await db.commit()
    await db.refresh(clip)
    return clip

@router.delete("/{clip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_clip(
    clip_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Clip)
        .join(Project, Clip.project_id == Project.id)
        .where(Clip.id == clip_id, Project.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    clip = res.scalar_one_or_none()
    if not clip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Clip not found"
        )

    for p in [clip.video_path, clip.thumbnail_path, clip.subtitle_path]:
        if p and os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass

    await db.delete(clip)
    await db.commit()
    return None

@router.post("/{clip_id}/render", response_model=ClipResponse)
async def rerender_clip(
    clip_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Clip, Project)
        .join(Project, Clip.project_id == Project.id)
        .where(Clip.id == clip_id, Project.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Clip not found"
        )
    clip, project = row

    # Robust source video resolution
    source_video = project.original_video_path
    if not source_video or not os.path.exists(source_video):
        candidate = os.path.abspath(
            os.path.join(
                settings.UPLOAD_DIR,
                str(project.id),
                os.path.basename(source_video or "original_youtube.mp4"),
            )
        )
        if os.path.exists(candidate):
            source_video = candidate
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Original source video is missing",
            )

    # STRICT 30-SECOND DURATION CLAMP
    raw_duration = clip.end_time - clip.start_time
    if raw_duration > 30.0:
        clip.end_time = round(clip.start_time + 30.0, 2)
        clip.duration = 30.0
    elif raw_duration < 1.0:
        clip.end_time = round(clip.start_time + 10.0, 2)
        clip.duration = 10.0
    else:
        clip.duration = round(raw_duration, 2)

    # Re-render immediately
    clip.processing_status = "rendering"
    await db.commit()

    output_dir = os.path.join(settings.OUTPUT_DIR, str(project.id))
    os.makedirs(output_dir, exist_ok=True)
    clip_filename = f"clip_{clip.clip_number:02d}_edited_{uuid.uuid4().hex[:6]}.mp4"
    clip_out_path = os.path.join(output_dir, clip_filename)

    render_settings = {
        "add_captions": clip.has_captions,
        "caption_style": clip.subtitle_style,
        "add_hook": clip.has_hook,
        "add_watermark": clip.has_watermark,
        "project_name": project.project_name,
        "clip_number": clip.clip_number,
        "title": clip.title,
    }

    # Fetch subtitles segments if captions are requested
    sub_segments = None
    if clip.has_captions and not (clip.subtitle_path and os.path.exists(clip.subtitle_path)):
        try:
            stmt_t = select(Transcription).where(Transcription.project_id == project.id)
            res_t = await db.execute(stmt_t)
            trans = res_t.scalar_one_or_none()
            if trans and trans.segments_json:
                sub_segments = trans.segments_json
        except Exception as e:
            logger.warning(f"Could not load transcription segments: {e}")

    try:
        ClipGenerator.render_clip(
            source_video=source_video,
            start_time=clip.start_time,
            end_time=clip.end_time,
            output_path=clip_out_path,
            clip_settings=render_settings,
            subtitles_segments=sub_segments,
            subtitles_path=clip.subtitle_path if (clip.has_captions and clip.subtitle_path and os.path.exists(clip.subtitle_path)) else None,
            hook_text=clip.hook_text if clip.has_hook else None,
        )

        _, actual_dur = ClipGenerator.validate_rendered_duration(clip_out_path)
        clip.video_path = clip_out_path
        clip.video_url = f"/api/clips/file/{project.id}/{clip_filename}"
        clip.duration = min(round(actual_dur, 2), 30.0)
        clip.processing_status = "completed"

        # Update thumbnail
        thumb_path = os.path.join(output_dir, f"thumb_{clip.clip_number:02d}.jpg")
        try:
            VideoMetadataExtractor.generate_thumbnail(
                clip_out_path, thumb_path, timestamp=min(1.0, clip.duration / 2.0)
            )
            clip.thumbnail_path = thumb_path
        except Exception:
            pass

        # Auto-export to local folder
        ExportManager.export_clip(
            project_name=project.project_name,
            clip_number=clip.clip_number,
            title_or_hook=clip.hook_text or clip.title,
            source_video_path=clip_out_path,
        )

        await db.commit()
        await db.refresh(clip)
        return clip

    except Exception as e:
        logger.error(f"Re-render exception: {e}")
        clip.processing_status = "failed"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Re-render failed: {e}",
        )

@router.get("/{clip_id}/download")
async def download_clip_file(
    clip_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Clip)
        .join(Project, Clip.project_id == Project.id)
        .where(Clip.id == clip_id, Project.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    clip = res.scalar_one_or_none()
    if not clip or not clip.video_path or not os.path.exists(clip.video_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Clip video file not found"
        )

    safe_title = "".join(c for c in (clip.title or "clip") if c.isalnum() or c in " _-").strip()
    download_filename = f"{safe_title[:40]}.mp4"

    return FileResponse(
        clip.video_path,
        media_type="video/mp4",
        filename=download_filename,
    )

@router.get("/{clip_id}/download-srt")
async def download_clip_srt(
    clip_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Clip)
        .join(Project, Clip.project_id == Project.id)
        .where(Clip.id == clip_id, Project.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    clip = res.scalar_one_or_none()
    if not clip or not clip.subtitle_path or not os.path.exists(clip.subtitle_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Clip subtitle file not found"
        )

    return FileResponse(
        clip.subtitle_path,
        media_type="text/plain",
        filename=f"clip_{clip.clip_number:02d}.srt",
    )

@router.get("/file/{project_id}/{filename}")
async def serve_clip_stream(
    project_id: uuid.UUID,
    filename: str,
):
    """Stream clip mp4 for inline video player preview."""
    filepath = os.path.join(settings.OUTPUT_DIR, str(project_id), filename)
    if not os.path.exists(filepath):
        # Fallback check in upload dir for original video
        filepath = os.path.join(settings.UPLOAD_DIR, str(project_id), filename)
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="File not found")

    content_type = "video/mp4"
    if filename.endswith(".jpg") or filename.endswith(".jpeg"):
        content_type = "image/jpeg"
    elif filename.endswith(".srt"):
        content_type = "text/plain"

    return FileResponse(filepath, media_type=content_type)
