import os
import zipfile
import pytest
from app.services.video.subtitle_generator import SubtitleGenerator

def test_srt_generation(tmp_path):
    segments = [
        {"start": 10.0, "end": 14.5, "text": "This is line one."},
        {"start": 15.0, "end": 22.0, "text": "This is line two."}
    ]
    out_srt = str(tmp_path / "test.srt")
    SubtitleGenerator.generate_srt(segments, clip_start=10.0, clip_end=25.0, output_srt_path=out_srt)

    assert os.path.exists(out_srt)
    with open(out_srt, "r", encoding="utf-8") as f:
        content = f.read()

    # Relative start time should be 00:00:00,000
    assert "00:00:00,000" in content
    assert "This is line one." in content
    assert "This is line two." in content

def test_ass_generation_with_styles(tmp_path):
    segments = [
        {"start": 0.0, "end": 5.0, "text": "Testing ASS subtitle format."}
    ]
    out_ass = str(tmp_path / "test.ass")
    SubtitleGenerator.generate_ass(segments, clip_start=0.0, clip_end=5.0, output_ass_path=out_ass, style_name="MrBeast")

    assert os.path.exists(out_ass)
    with open(out_ass, "r", encoding="utf-8") as f:
        content = f.read()

    assert "[Script Info]" in content
    assert "[V4+ Styles]" in content
    assert "Style: MrBeast" in content
    assert "Dialogue:" in content
