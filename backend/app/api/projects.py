import asyncio
import logging
import os
import shutil
import time
import uuid
from typing import List, Optional

logger = logging.getLogger(__name__)

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.config import settings
from app.database import async_session, get_db
from app.models.models import Clip, ProcessingJob, Project, Transcription, User
from app.schemas.clips import ClipListResponse, ClipResponse
from app.schemas.projects import (
    CreateProjectRequest,
    CreateFromYouTubeRequest,
    ProcessingStatusResponse,
    ProjectListResponse,
    ProjectResponse,
    ProjectSettingsRequest,
)
from app.services.storage.factory import get_storage
from app.services.video.metadata import VideoMetadataExtractor
from app.services.video.youtube_downloader import YouTubeDownloader
from app.services.video.highlight_detector import AudioHighlightDetector
from app.services.video.clip_generator import ClipGenerator
from app.services.video.subtitle_generator import SubtitleGenerator
from app.services.export_manager import ExportManager
from app.workers.inline_processor import InlineProcessor

router = APIRouter()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: CreateProjectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        user_id=current_user.id,
        project_name=data.project_name,
        original_filename="",
        original_video_path="",
        original_duration=0.0,
        processing_status="uploaded",
        processing_progress=0,
        processing_stage="Ready for video upload",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def _async_download_youtube(
    project_id: uuid.UUID,
    youtube_url: str,
    clip_settings: Optional[dict] = None,
):
    """Background task to download YouTube video and automatically launch AI clipping pipeline."""
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(project_id))
    os.makedirs(upload_dir, exist_ok=True)
    async with async_session() as db:
        stmt = select(Project).where(Project.id == project_id)
        res = await db.execute(stmt)
        project = res.scalar_one_or_none()
        if not project:
            return

        try:
            project.processing_status = "downloading"
            project.processing_stage = "Downloading YouTube video stream..."
            project.processing_progress = 10
            if clip_settings and not project.clip_settings:
                project.clip_settings = clip_settings
            await db.commit()

            # Progress callback to show live speed and remaining time to the user
            last_update = 0.0

            def sync_progress(percent: int, speed_str: str, eta_str: str):
                nonlocal last_update
                now = time.time()
                if (now - last_update) >= 1.5 or percent in [0, 50, 99, 100]:
                    last_update = now
                    stage_msg = f"Downloading stream: {percent}%"
                    if speed_str:
                        stage_msg += f" • {speed_str}"
                    if eta_str:
                        stage_msg += f" • {eta_str}"
                    scaled_progress = 10 + int(percent * 0.15)

                    async def _update_db():
                        try:
                            async with async_session() as update_db:
                                stmt_u = select(Project).where(Project.id == project_id)
                                res_u = await update_db.execute(stmt_u)
                                p = res_u.scalar_one_or_none()
                                if p and p.processing_status == "downloading":
                                    p.processing_progress = scaled_progress
                                    p.processing_stage = stage_msg
                                    await update_db.commit()
                        except Exception:
                            pass

                    asyncio.run_coroutine_threadsafe(_update_db(), loop)

            # Execute yt-dlp download in executor with progress updates
            loop = asyncio.get_event_loop()
            dl_info = await loop.run_in_executor(
                None,
                lambda: YouTubeDownloader.download_video(
                    youtube_url,
                    upload_dir,
                    max_duration_minutes=settings.MAX_VIDEO_DURATION_MINUTES,
                    progress_callback=sync_progress,
                ),
            )

            project.original_filename = os.path.basename(dl_info["video_path"])
            project.original_video_path = dl_info["video_path"]
            project.original_video_url = (
                f"/api/projects/file/{project_id}/{os.path.basename(dl_info['video_path'])}"
            )
            project.original_duration = dl_info["duration"]
            project.original_resolution = f"{dl_info['width']}x{dl_info['height']}"
            project.original_fps = dl_info["fps"]
            project.file_size = dl_info["file_size"]
            project.thumbnail_path = dl_info.get("thumbnail_path")
            project.processing_status = "uploaded"
            project.processing_progress = 20
            project.processing_stage = "YouTube download complete. Initializing AI clipping..."
            effective_settings = project.clip_settings or clip_settings
            await db.commit()

            # Automatically launch processing pipeline if clip_settings exist
            if effective_settings:
                logger.info(f"Automatically triggering InlineProcessor for project {project_id}")
                await InlineProcessor.process_project(
                    project.id,
                    async_session,
                    effective_settings,
                )

        except Exception as e:
            logger.error(f"YouTube processing error: {e}", exc_info=True)
            project.processing_status = "failed"
            project.error_message = f"YouTube processing failed: {str(e)}"
            await db.commit()


@router.post("/from-youtube", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project_from_youtube(
    data: CreateFromYouTubeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a project directly from a YouTube URL and initiate download and clipping."""
    if not YouTubeDownloader.is_valid_youtube_url(data.youtube_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid YouTube URL. Please provide a valid youtube.com or youtu.be link.",
        )

    # Extract quick info (title) if possible
    title = data.project_name
    if not title:
        try:
            info = YouTubeDownloader.extract_info(data.youtube_url)
            title = info.get("title") or "YouTube Project"
        except Exception:
            title = "YouTube Video Project"

    project = Project(
        user_id=current_user.id,
        project_name=title,
        original_filename="YouTube Stream",
        original_video_path="",
        original_duration=0.0,
        processing_status="downloading",
        processing_progress=5,
        processing_stage="Queued YouTube download...",
        clip_settings=data.clip_settings,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    background_tasks.add_task(
        _async_download_youtube, project.id, data.youtube_url, data.clip_settings
    )
    return project

@router.get("", response_model=ProjectListResponse)
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    count_stmt = select(func.count(Project.id)).where(Project.user_id == current_user.id)

    res = await db.execute(stmt)
    projects = res.scalars().all()

    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one()

    # Calculate clips_count for each project
    resp_projects = []
    for p in projects:
        c_count_stmt = select(func.count(Clip.id)).where(Clip.project_id == p.id)
        c_res = await db.execute(c_count_stmt)
        c_count = c_res.scalar_one()
        
        p_dict = {
            "id": p.id,
            "user_id": p.user_id,
            "project_name": p.project_name,
            "original_filename": p.original_filename,
            "original_duration": p.original_duration,
            "original_resolution": p.original_resolution,
            "file_size": p.file_size,
            "processing_status": p.processing_status,
            "processing_progress": p.processing_progress,
            "processing_stage": p.processing_stage,
            "clip_settings": p.clip_settings,
            "thumbnail_path": p.thumbnail_path,
            "error_message": p.error_message,
            "clips_count": c_count,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }
        resp_projects.append(ProjectResponse(**p_dict))

    return ProjectListResponse(projects=resp_projects, total=total)

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id, Project.user_id == current_user.id
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    c_count_stmt = select(func.count(Clip.id)).where(Clip.project_id == project.id)
    c_res = await db.execute(c_count_stmt)
    c_count = c_res.scalar_one()

    p_dict = {
        "id": project.id,
        "user_id": project.user_id,
        "project_name": project.project_name,
        "original_filename": project.original_filename,
        "original_duration": project.original_duration,
        "original_resolution": project.original_resolution,
        "file_size": project.file_size,
        "processing_status": project.processing_status,
        "processing_progress": project.processing_progress,
        "processing_stage": project.processing_stage,
        "clip_settings": project.clip_settings,
        "thumbnail_path": project.thumbnail_path,
        "error_message": project.error_message,
        "clips_count": c_count,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }
    return ProjectResponse(**p_dict)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id, Project.user_id == current_user.id
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Clean up local disk files
    storage = get_storage()
    if project.original_video_path:
        storage.delete_file(project.original_video_path)
    output_folder = os.path.join(settings.OUTPUT_DIR, str(project_id))
    storage.delete_file(output_folder)

    await db.delete(project)
    await db.commit()
    return None

@router.post("/{project_id}/upload", response_model=ProjectResponse)
async def upload_video(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id, Project.user_id == current_user.id
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # 1. Validate extension (supports any video format)
    filename = file.filename or "video.mp4"
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if "*" not in settings.allowed_extensions_list and ext not in settings.allowed_extensions_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format .{ext}. Allowed: {settings.ALLOWED_EXTENSIONS}",
        )

    # 2. Save upload to disk
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(project_id))
    os.makedirs(upload_dir, exist_ok=True)
    destination_path = os.path.join(upload_dir, f"original_{uuid.uuid4().hex[:8]}.{ext}")

    storage = get_storage()
    await storage.save_upload(file, destination_path)

    # 3. Validate video with FFprobe
    is_valid, validation_msg = VideoMetadataExtractor.validate_video(destination_path)
    if not is_valid:
        storage.delete_file(destination_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded file is corrupted or not a valid video: {validation_msg}",
        )

    # 4. Extract metadata
    meta = VideoMetadataExtractor.extract_metadata(destination_path)
    dur_minutes = meta["duration"] / 60.0
    if dur_minutes > settings.MAX_VIDEO_DURATION_MINUTES:
        storage.delete_file(destination_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video exceeds maximum allowed duration ({settings.MAX_VIDEO_DURATION_MINUTES} min)",
        )

    # 5. Generate thumbnail
    thumb_path = os.path.join(upload_dir, "thumb.jpg")
    VideoMetadataExtractor.generate_thumbnail(destination_path, thumb_path, timestamp=1.0)

    # 6. Update project model
    project.original_filename = filename
    project.original_video_path = destination_path
    project.original_video_url = f"/api/projects/file/{project_id}/{os.path.basename(destination_path)}"
    project.original_duration = meta["duration"]
    project.original_resolution = meta["resolution"]
    project.original_fps = meta["fps"]
    project.file_size = meta["file_size"]
    project.thumbnail_path = thumb_path
    project.processing_status = "uploaded"
    project.processing_progress = 0
    project.processing_stage = "Upload complete. Ready to process."

    await db.commit()
    await db.refresh(project)

    p_dict = {
        "id": project.id,
        "user_id": project.user_id,
        "project_name": project.project_name,
        "original_filename": project.original_filename,
        "original_duration": project.original_duration,
        "original_resolution": project.original_resolution,
        "file_size": project.file_size,
        "processing_status": project.processing_status,
        "processing_progress": project.processing_progress,
        "processing_stage": project.processing_stage,
        "clip_settings": project.clip_settings,
        "thumbnail_path": project.thumbnail_path,
        "error_message": project.error_message,
        "clips_count": 0,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }
    return ProjectResponse(**p_dict)

@router.post("/{project_id}/process", response_model=ProcessingStatusResponse)
async def process_project(
    project_id: uuid.UUID,
    settings_req: ProjectSettingsRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # STRICT RULE CHECK AT API LEVEL
    if settings_req.max_clip_duration > 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="max_clip_duration can NEVER exceed 30 seconds."
        )

    stmt = select(Project).where(
        Project.id == project_id, Project.user_id == current_user.id
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    if project.processing_status in ["downloading", "queued_download"]:
        # Project is actively downloading from YouTube; save settings and do not raise error
        settings_dict = settings_req.model_dump()
        project.clip_settings = settings_dict
        await db.commit()
        return ProcessingStatusResponse(
            project_id=project.id,
            status="downloading",
            progress=project.processing_progress or 10,
            stage=project.processing_stage or "Downloading YouTube stream...",
            error_message=None,
        )

    if not project.original_video_path or not os.path.exists(project.original_video_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No uploaded video found for this project. Please upload a video first.",
        )

    # Save settings into project
    settings_dict = settings_req.model_dump()
    project.clip_settings = settings_dict
    project.processing_status = "queued"
    project.processing_progress = 5
    project.processing_stage = "Job queued for processing"
    await db.commit()

    # Dispatch to background task using asyncio
    background_tasks.add_task(
        InlineProcessor.process_project,
        project_id,
        async_session,
        settings_dict,
    )

    return ProcessingStatusResponse(
        project_id=project.id,
        status="queued",
        progress=5,
        stage="Job queued for processing",
        error_message=None,
    )

@router.get("/{project_id}/status", response_model=ProcessingStatusResponse)
async def get_project_status(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id, Project.user_id == current_user.id
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    return ProcessingStatusResponse(
        project_id=project.id,
        status=project.processing_status,
        progress=project.processing_progress,
        stage=project.processing_stage or "",
        error_message=project.error_message,
    )

@router.get("/{project_id}/clips", response_model=ClipListResponse)
async def get_project_clips(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify project belongs to user
    p_stmt = select(Project).where(
        Project.id == project_id, Project.user_id == current_user.id
    )
    p_res = await db.execute(p_stmt)
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    c_stmt = (
        select(Clip)
        .where(Clip.project_id == project_id)
        .order_by(Clip.viral_score.desc())
    )
    c_res = await db.execute(c_stmt)
    clips = c_res.scalars().all()

    return ClipListResponse(clips=list(clips), total=len(clips))


async def _async_generate_more_clips(
    project_id: uuid.UUID,
    count: int = 5,
):
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(project_id))
    output_dir = os.path.join(settings.OUTPUT_DIR, str(project_id))
    os.makedirs(output_dir, exist_ok=True)

    async with async_session() as db:
        p_res = await db.execute(select(Project).where(Project.id == project_id))
        project = p_res.scalar_one_or_none()
        if not project or not project.original_video_path or not os.path.exists(project.original_video_path):
            return

        c_res = await db.execute(
            select(Clip).where(Clip.project_id == project_id).order_by(Clip.clip_number)
        )
        existing_clips = c_res.scalars().all()
        existing_starts = [c.start_time for c in existing_clips]
        start_clip_number = max([c.clip_number for c in existing_clips], default=0) + 1

        t_res = await db.execute(select(Transcription).where(Transcription.project_id == project_id))
        trans = t_res.scalar_one_or_none()
        all_segments = trans.segments_json if (trans and trans.segments_json) else []

        video_path = project.original_video_path
        total_duration = project.original_duration or 600.0
        clip_settings = project.clip_settings or {}
        project_name = project.project_name

        project.processing_status = "generating_clips"
        project.processing_stage = f"AI extracting {count} additional viral highlight clips..."
        project.processing_progress = 70
        await db.commit()

    # Detect new candidates outside DB transaction
    new_candidates = AudioHighlightDetector.find_viral_moments(
        video_path=video_path,
        total_duration=total_duration,
        num_clips=count,
        min_separation=90.0,
        exclude_times=existing_starts,
        start_clip_number=start_clip_number,
    )

    for idx, c_meta in enumerate(new_candidates):
        clip_num = c_meta["clip_number"]
        clip_filename = f"clip_{clip_num:02d}_{uuid.uuid4().hex[:6]}.mp4"
        clip_out_path = os.path.join(output_dir, clip_filename)
        clip_thumb_path = os.path.join(output_dir, f"thumb_{clip_num:02d}.jpg")
        clip_srt_path = os.path.join(output_dir, f"sub_{clip_num:02d}.srt")

        # Slice subtitle segments matching this time range
        clip_segments = [
            s for s in all_segments
            if not (float(s.get("end", 0)) <= c_meta["start_time"] or float(s.get("start", 0)) >= c_meta["end_time"])
        ]

        if clip_segments:
            SubtitleGenerator.generate_srt(clip_segments, c_meta["start_time"], c_meta["end_time"], clip_srt_path)

        render_settings = dict(clip_settings)
        render_settings["project_name"] = project_name
        render_settings["clip_number"] = clip_num
        render_settings["title"] = c_meta["title"]

        ClipGenerator.render_clip(
            source_video=video_path,
            start_time=c_meta["start_time"],
            end_time=c_meta["end_time"],
            output_path=clip_out_path,
            clip_settings=render_settings,
            subtitles_segments=clip_segments,
            hook_text=c_meta.get("hook_text")
        )

        VideoMetadataExtractor.generate_thumbnail(
            clip_out_path, clip_thumb_path, timestamp=min(1.0, c_meta["duration"] / 2.0)
        )

        _, actual_duration = ClipGenerator.validate_rendered_duration(clip_out_path)
        final_duration = min(round(actual_duration, 2), 30.0)

        # Auto-export to local folder
        ExportManager.export_clip(
            project_name=project_name,
            clip_number=clip_num,
            title_or_hook=c_meta.get("hook_text") or c_meta["title"],
            source_video_path=clip_out_path,
        )

        # Insert new Clip row in quick isolated session
        async with async_session() as db:
            clip_row = Clip(
                project_id=project_id,
                clip_number=clip_num,
                title=c_meta.get("title", f"Clip {clip_num}"),
                start_time=c_meta["start_time"],
                end_time=c_meta["end_time"],
                duration=final_duration,
                viral_score=c_meta.get("viral_score", 90),
                score_breakdown=c_meta.get("score_breakdown", {}),
                clip_type=c_meta.get("clip_type", "gaming"),
                hook_text=c_meta.get("hook_text"),
                caption_text=c_meta.get("caption_text"),
                hashtags=c_meta.get("hashtags", []),
                ai_titles=c_meta.get("ai_titles", []),
                ai_description=c_meta.get("ai_description"),
                video_path=clip_out_path,
                video_url=f"/api/clips/file/{project_id}/{clip_filename}",
                thumbnail_path=clip_thumb_path,
                subtitle_path=clip_srt_path if clip_segments else None,
                subtitle_style=clip_settings.get("caption_style", "subtle"),
                has_captions=clip_settings.get("add_captions", True),
                has_hook=clip_settings.get("add_hook", True),
                has_watermark=clip_settings.get("add_watermark", False),
                processing_status="completed"
            )
            db.add(clip_row)
            await db.commit()

    async with async_session() as db:
        p_res = await db.execute(select(Project).where(Project.id == project_id))
        project = p_res.scalar_one_or_none()
        if project:
            project.processing_status = "completed"
            project.processing_progress = 100
            project.processing_stage = f"Successfully generated {count} more viral clips!"
            await db.commit()


@router.post("/{project_id}/generate-more")
async def generate_more_clips(
    project_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    count: int = Query(5, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id, Project.user_id == current_user.id
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.original_video_path or not os.path.exists(project.original_video_path):
        raise HTTPException(
            status_code=400,
            detail="Original downloaded video not found on disk."
        )

    project.processing_status = "generating_clips"
    project.processing_stage = f"Queueing {count} additional clips..."
    project.processing_progress = 60
    await db.commit()

    background_tasks.add_task(_async_generate_more_clips, project.id, count)
    return {"status": "started", "message": f"Generating {count} more clips in background"}


@router.post("/{project_id}/open-folder")
async def open_export_folder(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id, Project.user_id == current_user.id
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    success = ExportManager.open_in_explorer(project.project_name)
    export_dir = ExportManager.get_project_export_dir(project.project_name)
    return {
        "status": "success" if success else "error",
        "export_folder": export_dir,
    }


@router.post("/{project_id}/export-all")
async def export_all_clips(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id, Project.user_id == current_user.id
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    c_stmt = select(Clip).where(Clip.project_id == project_id)
    c_res = await db.execute(c_stmt)
    clips = c_res.scalars().all()

    exported_paths = []
    for c in clips:
        if c.video_path and os.path.exists(c.video_path):
            p = ExportManager.export_clip(
                project_name=project.project_name,
                clip_number=c.clip_number,
                title_or_hook=c.hook_text or c.title,
                source_video_path=c.video_path,
            )
            if p:
                exported_paths.append(p)

    return {
        "status": "success",
        "exported_count": len(exported_paths),
        "export_folder": ExportManager.get_project_export_dir(project.project_name),
    }
