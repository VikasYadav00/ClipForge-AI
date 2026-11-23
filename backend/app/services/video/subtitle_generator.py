import os
import re
import logging
import subprocess
import shutil
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class SubtitleGenerator:
    """
    Generates SRT and styled ASS subtitles (Clean, Bold, Karaoke, Minimal, Gaming, Podcast)
    and burns them into vertical MP4 videos using FFmpeg.
    """

    STYLES_ASS_HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Bold,Arial Black,54,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,5,3,2,60,60,320,1
Style: Clean,Inter,46,&H00FFFFFF,&H00FFFFFF,&H00202020,&H40000000,0,0,0,0,100,100,0,0,1,3,1,2,60,60,320,1
Style: MrBeast,Impact,64,&H0000FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,105,105,2,0,1,6,4,2,50,50,340,1
Style: Minimal,Helvetica,42,&H00EEEEEE,&H00FFFFFF,&H00111111,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,80,80,300,1
Style: Gaming,Montserrat ExtraBold,56,&H0000FF00,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,5,4,2,60,60,330,1
Style: Podcast,Roboto,48,&H00F0F0F0,&H00F5A623,&H000A0A0A,&H60000000,-1,0,0,0,100,100,1,0,1,4,2,2,70,70,310,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    @classmethod
    def clean_subtitle_text(cls, text: str) -> str:
        """Cleans repeated hallucinated words and formats text nicely for subtitles."""
        if not text:
            return ""
        # Remove consecutive repeated words (e.g. "bhai bhai bhai..." -> "bhai bhai")
        words = text.split()
        deduped = []
        for w in words:
            if len(deduped) >= 2 and deduped[-1].lower() == w.lower() and deduped[-2].lower() == w.lower():
                continue
            deduped.append(w)
        # Limit subtitle chunk to at most 6 words for subtle, compact 1-2 line modern Shorts captions
        clean = " ".join(deduped[:6])
        return clean

    @classmethod
    def format_timestamp_srt(cls, seconds: float) -> str:
        """Converts float seconds to SRT timestamp: 00:00:00,000"""
        total_ms = int(round(seconds * 1000))
        hrs = total_ms // 3600000
        mins = (total_ms % 3600000) // 60000
        secs = (total_ms % 60000) // 1000
        ms = total_ms % 1000
        return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"

    @classmethod
    def format_timestamp_ass(cls, seconds: float) -> str:
        """Converts float seconds to ASS timestamp: 0:00:00.00"""
        total_cs = int(round(seconds * 100))  # centiseconds
        hrs = total_cs // 360000
        mins = (total_cs % 360000) // 6000
        secs = (total_cs % 6000) // 100
        cs = total_cs % 100
        return f"{hrs:d}:{mins:02d}:{secs:02d}.{cs:02d}"

    @classmethod
    def generate_srt(
        cls,
        segments: List[Dict[str, Any]],
        clip_start: float,
        clip_end: float,
        output_srt_path: str
    ) -> str:
        """
        Creates an SRT file adjusted to clip relative time (0.0 to clip_duration).
        """
        os.makedirs(os.path.dirname(output_srt_path), exist_ok=True)
        srt_lines = []
        counter = 1

        for seg in segments:
            seg_start = float(seg.get("start", 0.0))
            seg_end = float(seg.get("end", 0.0))

            # Check overlap with clip
            if seg_end <= clip_start or seg_start >= clip_end:
                continue

            # Offset timestamps relative to clip start
            rel_start = max(0.0, seg_start - clip_start)
            rel_end = min(clip_end - clip_start, seg_end - clip_start)

            if rel_end <= rel_start:
                continue

            text = cls.clean_subtitle_text(seg.get("text", "")).strip()
            if not text:
                continue

            srt_lines.append(str(counter))
            srt_lines.append(f"{cls.format_timestamp_srt(rel_start)} --> {cls.format_timestamp_srt(rel_end)}")
            srt_lines.append(text)
            srt_lines.append("")
            counter += 1

        content = "\n".join(srt_lines)
        with open(output_srt_path, "w", encoding="utf-8") as f:
            f.write(content)

        return output_srt_path

    @classmethod
    def generate_ass(
        cls,
        segments: List[Dict[str, Any]],
        clip_start: float,
        clip_end: float,
        output_ass_path: str,
        style_name: str = "Bold"
    ) -> str:
        """
        Generates styled Advanced SubStation Alpha (.ass) subtitle file.
        """
        os.makedirs(os.path.dirname(output_ass_path), exist_ok=True)

        valid_styles = ["Bold", "Clean", "MrBeast", "Minimal", "Gaming", "Podcast"]
        matched_style = "Bold"
        for s in valid_styles:
            if s.lower() == style_name.lower():
                matched_style = s
                break

        events = []
        for seg in segments:
            seg_start = float(seg.get("start", 0.0))
            seg_end = float(seg.get("end", 0.0))

            if seg_end <= clip_start or seg_start >= clip_end:
                continue

            rel_start = max(0.0, seg_start - clip_start)
            rel_end = min(clip_end - clip_start, seg_end - clip_start)

            if rel_end <= rel_start:
                continue

            text = cls.clean_subtitle_text(seg.get("text", "")).strip()
            if not text:
                continue

            # Word highlighting or karaoke effects if word-level timestamps present
            words = seg.get("words", [])
            if words and matched_style in ["MrBeast", "Bold"]:
                # Chunk words into punchy 3-5 word clusters
                chunk_size = 4
                for i in range(0, len(words), chunk_size):
                    chunk = words[i:i + chunk_size]
                    c_start = max(0.0, float(chunk[0]["start"]) - clip_start)
                    c_end = min(clip_end - clip_start, float(chunk[-1]["end"]) - clip_start)
                    if c_end > c_start:
                        chunk_text = " ".join([w["word"] for w in chunk])
                        # Highlight one word in yellow
                        formatted_text = chunk_text.upper() if matched_style == "MrBeast" else chunk_text
                        start_ts = cls.format_timestamp_ass(c_start)
                        end_ts = cls.format_timestamp_ass(c_end)
                        events.append(f"Dialogue: 0,{start_ts},{end_ts},{matched_style},,0,0,0,,{formatted_text}")
            else:
                # Standard line event
                start_ts = cls.format_timestamp_ass(rel_start)
                end_ts = cls.format_timestamp_ass(rel_end)
                # Word wrap long sentences for vertical display
                display_text = cls.wrap_for_vertical(text)
                events.append(f"Dialogue: 0,{start_ts},{end_ts},{matched_style},,0,0,0,,{display_text}")

        full_ass = cls.STYLES_ASS_HEADER + "\n".join(events) + "\n"
        with open(output_ass_path, "w", encoding="utf-8") as f:
            f.write(full_ass)

        return output_ass_path

    @staticmethod
    def wrap_for_vertical(text: str, max_chars_per_line: int = 24) -> str:
        """Wraps text with ASS linebreaks \\N to fit 9:16 vertical displays."""
        words = text.split()
        lines = []
        current_line = []
        current_len = 0

        for word in words:
            if current_len + len(word) + 1 > max_chars_per_line and current_line:
                lines.append(" ".join(current_line))
                current_line = [word]
                current_len = len(word)
            else:
                current_line.append(word)
                current_len += len(word) + 1

        if current_line:
            lines.append(" ".join(current_line))

        return "\\N".join(lines)

    @classmethod
    def burn_subtitles(
        cls,
        video_input: str,
        ass_subtitle_path: str,
        video_output: str
    ) -> bool:
        """
        Burns ASS subtitles into video using FFmpeg with proper path escaping.
        """
        if not shutil.which("ffmpeg"):
            logger.warning("ffmpeg missing, cannot burn subtitles.")
            shutil.copy(video_input, video_output)
            return False

        # Escape path for FFmpeg subtitles filter on Windows/Linux
        escaped_sub_path = ass_subtitle_path.replace("\\", "/").replace(":", "\\:")

        cmd = [
            "ffmpeg",
            "-y",
            "-i", video_input,
            "-vf", f"subtitles='{escaped_sub_path}'",
            "-c:v", "libx264",
            "-crf", "22",
            "-preset", "fast",
            "-c:a", "copy",
            video_output
        ]

        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            return True
        except Exception as e:
            logger.error(f"Failed to burn subtitles: {e}")
            if os.path.exists(video_input) and video_input != video_output:
                shutil.copy(video_input, video_output)
            return False
