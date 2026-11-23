import json
import os
import uuid
import zipfile
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.config import settings
from app.database import get_db
from app.models.models import Clip, Project, User

router = APIRouter()

@router.post("/projects/{project_id}/zip")
async def generate_project_zip(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a ZIP archive containing all clips (MP4), subtitles (SRT),
    and metadata.json formatted as ClipForge_ProjectName.zip.
    """
    stmt = select(Project).where(
        Project.id == project_id, Project.user_id == current_user.id
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # Fetch clips
    c_stmt = (
        select(Clip)
        .where(Clip.project_id == project_id)
        .order_by(Clip.clip_number.asc())
    )
    c_res = await db.execute(c_stmt)
    clips = c_res.scalars().all()

    if not clips:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No clips have been generated for this project yet.",
        )

    clean_proj_name = "".join(
        c for c in project.project_name if c.isalnum() or c in " _-"
    ).strip() or "Project"
    folder_name = f"ClipForge_{clean_proj_name.replace(' ', '_')}"

    zip_dir = os.path.join(settings.TEMP_DIR, "zips")
    os.makedirs(zip_dir, exist_ok=True)
    zip_path = os.path.join(zip_dir, f"{folder_name}_{uuid.uuid4().hex[:6]}.zip")

    # Metadata dictionary for JSON file
    metadata_manifest = {
        "project_name": project.project_name,
        "original_duration_seconds": project.original_duration,
        "clips_count": len(clips),
        "exported_at": str(project.updated_at or project.created_at),
        "clips": [],
    }

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for c in clips:
            c_meta = {
                "clip_number": c.clip_number,
                "title": c.title,
                "duration_seconds": c.duration,
                "viral_score": c.viral_score,
                "score_breakdown": c.score_breakdown,
                "clip_type": c.clip_type,
                "hook_text": c.hook_text,
                "hashtags": c.hashtags,
                "ai_titles": c.ai_titles,
                "ai_description": c.ai_description,
                "start_time": c.start_time,
                "end_time": c.end_time,
            }
            metadata_manifest["clips"].append(c_meta)

            # Add MP4 file
            if c.video_path and os.path.exists(c.video_path):
                arc_mp4 = f"{folder_name}/Clip_{c.clip_number:02d}.mp4"
                zf.write(c.video_path, arcname=arc_mp4)

            # Add SRT file
            if c.subtitle_path and os.path.exists(c.subtitle_path):
                arc_srt = f"{folder_name}/Clip_{c.clip_number:02d}.srt"
                zf.write(c.subtitle_path, arcname=arc_srt)

        # Write metadata.json
        meta_json_str = json.dumps(metadata_manifest, indent=2)
        zf.writestr(f"{folder_name}/metadata.json", meta_json_str)

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=f"{folder_name}.zip",
    )
