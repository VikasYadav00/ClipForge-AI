import pytest
from app.services.ai.base import AIProvider
from app.schemas.projects import ProjectSettingsRequest
from app.schemas.clips import UpdateClipRequest, ClipResponse
from app.models.models import Clip
import uuid

class DummyAIProvider(AIProvider):
    async def analyze_transcript(self, transcript, segments, settings):
        return []
    async def generate_hook(self, clip_text, clip_type="general"):
        return "HOOK"
    async def generate_titles_and_hashtags(self, clip_text, title):
        return {}

def test_critical_ai_timestamp_validation_exceeding_30s():
    """
    CRITICAL TEST (Specified in Master Prompt):
    If AI returns start_time = 100, end_time = 145 (45-second duration),
    the system must NEVER produce a 45-second clip.
    It must clamp/select the best 30-second segment (start=100, end=130, duration=30).
    """
    provider = DummyAIProvider()
    raw_ai_clips = [
        {
            "clip_number": 1,
            "title": "Shocking Moment",
            "start_time": 100.0,
            "end_time": 145.0,  # 45 seconds!
            "viral_score": 95,
            "score_breakdown": {
                "hook": 20, "emotion": 15, "interesting": 15,
                "replay": 15, "context": 15, "visual": 10, "ending": 10
            }
        }
    ]

    validated = provider.validate_and_clamp_clips(raw_ai_clips, max_duration=30.0)

    assert len(validated) == 1
    clip = validated[0]
    assert clip["start_time"] == 100.0
    assert clip["end_time"] <= 130.0
    assert clip["duration"] <= 30.0
    assert clip["duration"] == (clip["end_time"] - clip["start_time"])

def test_pydantic_project_settings_duration_validation():
    """Validates that project settings reject any max_clip_duration > 30s."""
    # Valid 30s
    req = ProjectSettingsRequest(max_clip_duration=30)
    assert req.max_clip_duration == 30

    # Valid 15s
    req15 = ProjectSettingsRequest(max_clip_duration=15, min_clip_duration=10)
    assert req15.max_clip_duration == 15

    # Reject 31s
    with pytest.raises(Exception):
        ProjectSettingsRequest(max_clip_duration=31)

    # Reject 45s
    with pytest.raises(Exception):
        ProjectSettingsRequest(max_clip_duration=45)

def test_pydantic_update_clip_duration_validation():
    """Validates that editing clip timestamps rejects duration > 30s."""
    # Valid 20s
    update_req = UpdateClipRequest(start_time=10.0, end_time=30.0)
    assert (update_req.end_time - update_req.start_time) == 20.0

    # Reject 35s edit
    with pytest.raises(ValueError):
        UpdateClipRequest(start_time=10.0, end_time=45.0)

def test_sqlalchemy_clip_model_duration_validation():
    """Validates that SQLAlchemy Clip model rejects duration > 30s."""
    clip = Clip(
        project_id=uuid.uuid4(),
        clip_number=1,
        title="Test Clip",
        start_time=0.0,
        end_time=25.0,
        duration=25.0,
        viral_score=90,
        clip_type="podcast"
    )
    assert clip.duration == 25.0

    # Attempting to assign duration > 30 triggers @validates("duration")
    with pytest.raises(ValueError):
        clip.duration = 35.0
