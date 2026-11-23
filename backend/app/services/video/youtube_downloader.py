import logging
import os
import re
import urllib.request
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

YOUTUBE_REGEX = re.compile(
    r"^(https?://)?(www\.)?(youtube\.com/(watch\?v=|shorts/|live/)|youtu\.be/)[\w\-]{11}(.*)?$",
    re.IGNORECASE,
)


class YouTubeDownloader:
    """
    Downloads YouTube videos using yt-dlp in maximum quality MP4 format
    and extracts metadata, thumbnails, and duration.
    """

    @classmethod
    def is_valid_youtube_url(cls, url: str) -> bool:
        """Validate if the string is a valid YouTube URL."""
        if not url:
            return False
        return bool(YOUTUBE_REGEX.match(url.strip()))

    @classmethod
    def extract_info(cls, url: str) -> Dict[str, Any]:
        """Extract YouTube video info without downloading."""
        import yt_dlp

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "title": info.get("title", "YouTube Video"),
                "duration": float(info.get("duration", 0)),
                "thumbnail_url": info.get("thumbnail"),
                "uploader": info.get("uploader", ""),
                "description": info.get("description", ""),
                "view_count": info.get("view_count", 0),
            }

    @classmethod
    def download_video(
        cls,
        url: str,
        output_dir: str,
        max_duration_minutes: int = 1440,
        progress_callback: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Download YouTube video in best quality MP4 format.
        Automatically optimizes download stream for ultra-fast ingestion.
        Returns paths to the downloaded video, thumbnail, and metadata.
        """
        import yt_dlp

        os.makedirs(output_dir, exist_ok=True)
        outtmpl_video = os.path.join(output_dir, "original_youtube.%(ext)s")

        # Locate ffmpeg and ffprobe binaries
        bin_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "bin")
        )
        ffmpeg_bin = bin_dir if os.path.exists(os.path.join(bin_dir, "ffmpeg.exe")) else None
        if not ffmpeg_bin:
            alt_bin = r"C:\Program Files\Mani Clips\binaries"
            if os.path.exists(os.path.join(alt_bin, "ffmpeg-real.exe")):
                ffmpeg_bin = alt_bin

        # Extract info first to check duration and pick optimal stream speed
        duration = 0.0
        try:
            with yt_dlp.YoutubeDL({"quiet": True, "skip_download": True}) as ydl:
                quick_meta = ydl.extract_info(url, download=False)
                duration = float(quick_meta.get("duration") or 0.0)
        except Exception as e:
            logger.warning(f"Quick info extraction failed: {e}")

        # Ultra-long streams (> 2 hrs) use 360p/480p to download in minutes instead of hours
        # Standard videos (<= 2 hrs) use crisp 720p/1080p
        if duration > 7200:
            format_selector = (
                "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=360]/best"
            )
        else:
            format_selector = (
                "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]/best"
            )

        def _progress_hook(d):
            if d.get("status") == "downloading" and progress_callback:
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                downloaded = d.get("downloaded_bytes") or 0
                percent = int((downloaded / total) * 100) if total > 0 else 0
                speed = d.get("speed") or 0
                eta = d.get("eta") or 0
                speed_mb = f"{speed / (1024 * 1024):.1f} MB/s" if speed else ""
                eta_str = f"{int(eta)}s remaining" if eta else ""
                try:
                    progress_callback(percent, speed_mb, eta_str)
                except Exception:
                    pass

        ydl_opts = {
            "outtmpl": outtmpl_video,
            "format": format_selector,
            "merge_output_format": "mp4",
            "quiet": False,
            "no_warnings": True,
            "progress_hooks": [_progress_hook] if progress_callback else [],
            "concurrent_fragment_downloads": 4,
            "buffersize": 1024 * 64,
        }
        if ffmpeg_bin:
            ydl_opts["ffmpeg_location"] = ffmpeg_bin

        logger.info(f"Downloading YouTube video ({format_selector}): {url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get("title", "YouTube Video")
            video_duration = float(info.get("duration", duration))

            if max_duration_minutes and video_duration > (max_duration_minutes * 60):
                raise ValueError(
                    f"YouTube video exceeds maximum duration of {max_duration_minutes} minutes"
                )

            # Locate downloaded file
            final_video_path = os.path.join(output_dir, "original_youtube.mp4")
            if not os.path.exists(final_video_path):
                # Search for any valid video file with original_youtube in output_dir
                for fn in os.listdir(output_dir):
                    if (
                        fn.startswith("original_youtube")
                        and not fn.endswith(".part")
                        and not fn.endswith(".ytdl")
                    ):
                        final_video_path = os.path.join(output_dir, fn)
                        break

            file_size = os.path.getsize(final_video_path) if os.path.exists(final_video_path) else 0

            # Download or save thumbnail
            thumb_path = os.path.join(output_dir, "thumb.jpg")
            thumb_url = info.get("thumbnail")
            if thumb_url:
                try:
                    urllib.request.urlretrieve(thumb_url, thumb_path)
                except Exception as e:
                    logger.warning(f"Could not download YouTube thumbnail: {e}")

            return {
                "title": title,
                "duration": video_duration,
                "video_path": final_video_path,
                "thumbnail_path": thumb_path if os.path.exists(thumb_path) else None,
                "file_size": file_size,
                "width": info.get("width", 1280),
                "height": info.get("height", 720),
                "fps": float(info.get("fps") or 30.0),
                "uploader": info.get("uploader", ""),
            }
