import json
import logging
from typing import List, Dict, Any
from app.config import settings
from app.services.ai.base import AIProvider

logger = logging.getLogger(__name__)

class OpenAIProvider(AIProvider):
    """
    OpenAI API Provider for Transcript Analysis & Highlight Detection.
    """

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self._client = None
        if self.api_key:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Could not initialize AsyncOpenAI: {e}")

    async def analyze_transcript(
        self,
        transcript: str,
        segments: List[Dict[str, Any]],
        settings_dict: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        if not self._client:
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().analyze_transcript(transcript, segments, settings_dict)

        num_clips = settings_dict.get("num_clips", 5)
        max_duration = min(float(settings_dict.get("max_clip_duration", 30)), 30.0)
        min_duration = float(settings_dict.get("min_clip_duration", 10.0))
        clip_style = settings_dict.get("clip_style", "auto")

        prompt = f"""You are an elite short-form video editor for TikTok, YouTube Shorts, and Reels.
Analyze the transcript segments and select {num_clips} top viral moments.
STYLE: {clip_style}

MANDATORY RULES:
- Every clip MUST have: end_time - start_time <= 30.0 seconds.
- Minimum duration is {min_duration} seconds.
- Scores must be 0-100 based on: hook (0-20), emotion (0-15), interesting (0-15), replay (0-15), context (0-15), visual (0-10), ending (0-10).

Output pure JSON list:
[
  {{
    "clip_number": 1,
    "title": "Title",
    "start_time": 10.0,
    "end_time": 35.0,
    "clip_type": "podcast",
    "hook_text": "HOOK OVERLAY",
    "caption_text": "dialogue text",
    "viral_score": 92,
    "score_breakdown": {{"hook": 18, "emotion": 14, "interesting": 14, "replay": 14, "context": 14, "visual": 9, "ending": 9}},
    "hashtags": ["#shorts", "#viral"],
    "ai_titles": ["T1", "T2", "T3"],
    "ai_description": "description",
    "youtube_title": "YT Title #Shorts",
    "instagram_caption": "IG Caption"
  }}
]

Segments:
{json.dumps(segments[:150], indent=2)}
"""

        try:
            response = await self._client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a viral video AI assistant. Output strict JSON only."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            data = json.loads(content)
            clips = data.get("clips", data) if isinstance(data, dict) else data
            if isinstance(clips, list) and len(clips) > 0:
                return self.validate_and_clamp_clips(clips, max_duration=max_duration, min_duration=min_duration)
        except Exception as e:
            logger.error(f"OpenAI error: {e}")

        from app.services.ai.demo_provider import DemoProvider
        return await DemoProvider().analyze_transcript(transcript, segments, settings_dict)

    async def generate_hook(self, clip_text: str, clip_type: str = "general") -> str:
        from app.services.ai.demo_provider import DemoProvider
        return await DemoProvider().generate_hook(clip_text, clip_type)

    async def generate_titles_and_hashtags(self, clip_text: str, title: str) -> Dict[str, Any]:
        from app.services.ai.demo_provider import DemoProvider
        return await DemoProvider().generate_titles_and_hashtags(clip_text, title)
