import json
import logging
import os
import re
import shutil
import subprocess
from typing import Dict, Any, Optional, Tuple
from app.config import settings

# Guarantee local backend/bin is in PATH for all rendering threads
bin_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "bin"))
if os.path.exists(bin_dir) and bin_dir not in os.environ.get("PATH", ""):
    os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")

from app.services.video.metadata import VideoMetadataExtractor
from app.services.video.smart_crop import SmartCropper
from app.services.video.subtitle_generator import SubtitleGenerator
from app.services.export_manager import ExportManager

logger = logging.getLogger(__name__)

class ClipGenerator:
    """
    Renders 9:16 vertical clips (1080x1920) with strict 30-second duration enforcement,
    smart cropping, subtle/optional subtitle burning, and hook text overlay.
    """

    MAX_DURATION_SECONDS = 30.0

    @classmethod
    def validate_rendered_duration(cls, video_path: str) -> Tuple[bool, float]:
        """
        Validates that rendered file duration does not exceed 30.0 seconds using ffprobe.
        """
        meta = VideoMetadataExtractor.extract_metadata(video_path)
        duration = float(meta.get("duration", 0.0))
        is_valid = duration <= (cls.MAX_DURATION_SECONDS + 0.5)  # allow 0.5s margin for audio packet padding
        return is_valid, duration

    @classmethod
    def render_clip(
        cls,
        source_video: str,
        start_time: float,
        end_time: float,
        output_path: str,
        clip_settings: Optional[Dict[str, Any]] = None,
        subtitles_segments: Optional[list] = None,
        hook_text: Optional[str] = None,
        subtitles_path: Optional[str] = None,
    ) -> str:
        """
        Core rendering pipeline:
        1. Enforce start_time, end_time <= 30.0s
        2. Calculate smart 9:16 crop box or aesthetic blurred backdrop
        3. Compose FFmpeg filter graph (subtle subtitles, hook text overlay)
        4. Render to 1080x1920 H.264 / AAC MP4
        5. FFprobe duration validation; auto-retrim if > 30s
        6. Auto-export to local computer folder
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        clip_settings = clip_settings or {}

        # ----------------------------------------------------------------------
        # LAYER 1: Server-Side Duration Clamp & Validation
        # ----------------------------------------------------------------------
        raw_duration = end_time - start_time
        if raw_duration > cls.MAX_DURATION_SECONDS:
            logger.warning(
                f"[STRICT DURATION ENFORCEMENT] Requested {raw_duration:.2f}s exceeds 30s limit. "
                f"Clamping {start_time:.2f} -> {start_time + cls.MAX_DURATION_SECONDS:.2f}"
            )
            end_time = start_time + cls.MAX_DURATION_SECONDS
            duration = cls.MAX_DURATION_SECONDS
        else:
            duration = max(1.0, raw_duration)

        if not shutil.which("ffmpeg"):
            logger.warning("ffmpeg not found, creating placeholder output.")
            shutil.copy(source_video, output_path)
            return output_path

        # ----------------------------------------------------------------------
        # LAYER 2: Layout & Framing (Aesthetic Blurred Backdrop for 16:9)
        # ----------------------------------------------------------------------
        meta = VideoMetadataExtractor.extract_metadata(source_video)
        src_w = meta.get("width", 1920)
        src_h = meta.get("height", 1080)
        is_landscape = src_w > src_h

        # Default layout for landscape is blur_backdrop to preserve natural face size and full gameplay
        layout = clip_settings.get("layout", "blur_backdrop" if is_landscape else "crop")
        use_blur = (layout == "blur_backdrop") or (is_landscape and layout != "crop_zoom")

        temp_dir = os.path.dirname(output_path)
        caption_style = clip_settings.get("caption_style", "subtle")
        add_captions = clip_settings.get("add_captions", True) and caption_style != "none"
        add_hook = clip_settings.get("add_hook", True)
        add_watermark = clip_settings.get("add_watermark", False)

        filters_post = []

        # Subtitles (Compact, elegant 1-2 line modern Shorts captions)
        active_sub_path = None
        if add_captions:
            if subtitles_path and os.path.exists(subtitles_path):
                active_sub_path = subtitles_path
            elif subtitles_segments:
                srt_sub_path = os.path.join(temp_dir, f"sub_{os.path.basename(output_path)}.srt")
                SubtitleGenerator.generate_srt(subtitles_segments, start_time, end_time, srt_sub_path)
                active_sub_path = srt_sub_path

            if active_sub_path and os.path.exists(active_sub_path):
                escaped_sub = active_sub_path.replace("\\", "/").replace(":", "\\:")
                # Subtle, compact Shorts font style (FontSize=13, crisp black border, bottom margin 42)
                sub_style = (
                    "FontSize=13,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
                    "BorderStyle=1,Outline=1.2,Shadow=0,MarginV=42,Alignment=2"
                )
                filters_post.append(f"subtitles='{escaped_sub}':force_style='{sub_style}'")

        # Hook text overlay in upper banner area (y=180) - sanitized and cleanly proportioned
        clean_hook = ""
        if add_hook and hook_text:
            clean_hook = re.sub(r'[^\w\s\-\.\,\!\?]', '', hook_text).strip()
            clean_hook = clean_hook.replace("'", "").replace(":", "\\:").replace("%", "\\%")
            if clean_hook:
                hook_filter = (
                    f"drawtext=text='{clean_hook}':fontsize=40:fontcolor=white:"
                    f"box=1:boxcolor=black@0.65:boxborderw=14:x=(w-text_w)/2:y=180"
                )
                filters_post.append(hook_filter)

        # Watermark
        if add_watermark:
            filters_post.append("drawtext=text='ClipForge AI':fontsize=30:fontcolor=white@0.6:x=w-tw-40:y=h-th-80")

        post_chain = ("," + ",".join(filters_post)) if filters_post else ""

        # ----------------------------------------------------------------------
        # LAYER 3 & 4: FFmpeg High-Speed High-Quality Encoding
        # ----------------------------------------------------------------------
        if use_blur:
            filter_complex = (
                f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=12:2[bg];"
                f"[0:v]scale=1080:-2:flags=bicubic[fg];"
                f"[bg][fg]overlay=(W-w)/2:(H-h)/2{post_chain}[v]"
            )
            cmd = [
                "ffmpeg",
                "-y",
                "-ss", str(round(start_time, 3)),
                "-t", str(round(duration, 3)),
                "-i", source_video,
                "-filter_complex", filter_complex,
                "-map", "[v]",
                "-map", "0:a?",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "20",
                "-c:a", "aac",
                "-b:a", "192k",
                "-ar", "48000",
                "-movflags", "+faststart",
                output_path
            ]
        else:
            crop_data = SmartCropper.calculate_center_crop(src_w, src_h)
            crop_filter = SmartCropper.get_ffmpeg_crop_filter(crop_data)
            vf_filters = [crop_filter] + filters_post
            cmd = [
                "ffmpeg",
                "-y",
                "-ss", str(round(start_time, 3)),
                "-t", str(round(duration, 3)),
                "-i", source_video,
                "-vf", ",".join(vf_filters),
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "18",
                "-c:a", "aac",
                "-b:a", "256k",
                output_path
            ]

        logger.info(f"Rendering clip: {start_time:.2f}s to {end_time:.2f}s (duration: {duration:.2f}s)")
        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg render error: {e.stderr.decode('utf-8', errors='ignore')}")
            # Robust fallback: blurred backdrop without complex overlay
            fallback_complex = (
                "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];"
                "[0:v]scale=1080:-2:flags=lanczos[fg];"
                "[bg][fg]overlay=(W-w)/2:(H-h)/2[v]"
            )
            cmd_fallback = [
                "ffmpeg", "-y",
                "-ss", str(round(start_time, 3)),
                "-t", str(round(duration, 3)),
                "-i", source_video,
                "-filter_complex", fallback_complex,
                "-map", "[v]", "-map", "0:a?",
                "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac",
                output_path
            ]
            subprocess.run(cmd_fallback, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        # ----------------------------------------------------------------------
        # LAYER 5: Post-Render FFprobe Duration Verification & Auto-Retrim
        # ----------------------------------------------------------------------
        is_valid, actual_dur = cls.validate_rendered_duration(output_path)
        if not is_valid:
            logger.warning(
                f"[STRICT DURATION VIOLATION DETECTED] Rendered output is {actual_dur:.2f}s > 30.0s! "
                f"Triggering auto-retrim to 30.0s..."
            )
            trimmed_temp = output_path + ".trimmed.mp4"
            trim_cmd = [
                "ffmpeg", "-y",
                "-i", output_path,
                "-t", "30.0",
                "-c", "copy",
                trimmed_temp
            ]
            try:
                subprocess.run(trim_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                os.replace(trimmed_temp, output_path)
            except Exception as e:
                logger.error(f"Auto-trim failed: {e}")

        # ----------------------------------------------------------------------
        # LAYER 6: Auto-Export to Local Computer Folder
        # ----------------------------------------------------------------------
        try:
            p_name = clip_settings.get("project_name", "Clips")
            c_num = clip_settings.get("clip_number", 1)
            ExportManager.export_clip(
                project_name=p_name,
                clip_number=c_num,
                title_or_hook=clean_hook or clip_settings.get("title", f"Clip_{c_num}"),
                source_video_path=output_path,
            )
        except Exception as e:
            logger.warning(f"Auto-export hook caught error: {e}")

        return output_path
