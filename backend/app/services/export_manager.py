import os
import re
import shutil
import subprocess
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

class ExportManager:
    """
    Manages local filesystem auto-export of viral clips directly to the user's computer.
    Target directory: c:\\Users\\Vikas_yadav\\Desktop\\clipping\\exports\\<project_name>
    """

    @classmethod
    def get_base_export_dir(cls) -> str:
        # Resolve to <workspace_root>/exports
        base_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "exports")
        )
        os.makedirs(base_dir, exist_ok=True)
        return base_dir

    @classmethod
    def get_project_export_dir(cls, project_name: str) -> str:
        base_dir = cls.get_base_export_dir()
        clean_name = re.sub(r'[^\w\s\-]', '', project_name or "Project").strip()
        clean_name = re.sub(r'\s+', ' ', clean_name)
        if not clean_name:
            clean_name = "Project_Clips"
        project_dir = os.path.join(base_dir, clean_name)
        os.makedirs(project_dir, exist_ok=True)
        return project_dir

    @classmethod
    def export_clip(
        cls,
        project_name: str,
        clip_number: int,
        title_or_hook: str,
        source_video_path: str
    ) -> Optional[str]:
        """Copies rendered clip MP4 into user's local export folder."""
        if not source_video_path or not os.path.exists(source_video_path):
            return None

        project_dir = cls.get_project_export_dir(project_name)
        clean_label = re.sub(r'[^\w\s\-]', '', title_or_hook or f"Clip_{clip_number:02d}").strip()
        clean_label = clean_label.replace(" ", "_")[:35]
        target_filename = f"Clip_{clip_number:02d}_{clean_label}.mp4"
        target_path = os.path.join(project_dir, target_filename)

        try:
            shutil.copy2(source_video_path, target_path)
            logger.info(f"[AUTO-EXPORT] Successfully copied clip to: {target_path}")
            return target_path
        except Exception as e:
            logger.error(f"[AUTO-EXPORT] Failed copying to local export folder: {e}")
            return None

    @classmethod
    def open_in_explorer(cls, project_name: str) -> bool:
        """Opens Windows File Explorer window directly showing the export directory."""
        project_dir = cls.get_project_export_dir(project_name)
        try:
            subprocess.Popen(["explorer.exe", project_dir])
            logger.info(f"[AUTO-EXPORT] Opened Windows Explorer at: {project_dir}")
            return True
        except Exception as e:
            logger.error(f"[AUTO-EXPORT] Could not launch explorer: {e}")
            return False
