import json
import logging
from typing import List, Dict, Any, Optional
from app.config import settings
from app.services.ai.base import AIProvider

logger = logging.getLogger(__name__)

class GeminiProvider(AIProvider):
    """
    Production Gemini API Provider for Transcript Analysis & Highlight Detection.
    Uses Google's Gemini models to detect high-retention moments with strict 30-second duration limits.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self._model = None
        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self._model = genai.GenerativeModel("gemini-1.5-flash")
            except Exception as e:
                logger.warning(f"Could not initialize google.generativeai: {e}")

    async def analyze_transcript(
        self,
        transcript: str,
        segments: List[Dict[str, Any]],
        settings_dict: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        if not self._model or not self.api_key:
            logger.info("Gemini API not configured, falling back to DemoProvider.")
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().analyze_transcript(transcript, segments, settings_dict)

        num_clips = settings_dict.get("num_clips", 5)
        max_duration = min(float(settings_dict.get("max_clip_duration", 30)), 30.0)
        min_duration = float(settings_dict.get("min_clip_duration", 10.0))
        clip_style = settings_dict.get("clip_style", "auto")

        prompt = f"""
You are an expert viral content editor for TikTok, YouTube Shorts, and Instagram Reels.
Your task is to analyze the following video transcript with timestamps and select the top {num_clips} most viral, engaging, and high-retention moments.

TARGET STYLE: {clip_style}

STRICT CONSTRAINTS (MANDATORY):
1. NO CLIP DURATION CAN EXCEED 30 SECONDS. (end_time - start_time <= 30.0)
2. Every clip must be at least {min_duration} seconds long.
3. Start close to the opening hook or punchy statement; avoid silence or dead air.
4. End immediately after the punchline or payoff; do not cut off words mid-sentence.
5. Clips must be standalone and comprehensible with high replay value.

VIRAL MOMENT SCORING SYSTEM (0-100 total):
- hook (0-20): strength of opening statement
- emotion (0-15): emotional engagement / reaction
- interesting (0-15): value / novelty of content
- replay (0-15): likelihood to rewatch or loop
- context (0-15): standalone clarity
- visual (0-10): visual action / dynamism
- ending (0-10): payoff quality

Return ONLY valid JSON format with this exact structure (no markdown, no backticks):
[
  {{
    "clip_number": 1,
    "title": "Short punchy title",
    "start_time": 12.5,
    "end_time": 38.0,
    "clip_type": "funny | podcast | educational | gaming | emotional | controversial",
    "hook_text": "HOOK IN ALL CAPS (e.g., WAIT FOR THE END...)",
    "caption_text": "Exact speech snippet for this clip",
    "viral_score": 94,
    "score_breakdown": {{
      "hook": 19,
      "emotion": 14,
      "interesting": 14,
      "replay": 14,
      "context": 14,
      "visual": 9,
      "ending": 10
    }},
    "hashtags": ["#shorts", "#viral", "#reels", "#fyp", "#content"],
    "ai_titles": [
      "Title Option 1",
      "Title Option 2",
      "Title Option 3"
    ],
    "ai_description": "Short social description with call to action",
    "youtube_title": "YouTube Shorts Title #Shorts",
    "instagram_caption": "Instagram Reel caption with hashtags"
  }}
]

TRANSCRIPT SEGMENTS WITH TIMESTAMPS:
{json.dumps(segments[:150], indent=2)}
"""

        try:
            response = self._model.generate_content(prompt)
            text_resp = response.text.strip()
            # Clean possible markdown ```json ... ``` wrapper
            if text_resp.startswith("```"):
                text_resp = text_resp.split("```")[1]
                if text_resp.startswith("json"):
                    text_resp = text_resp[4:]
            text_resp = text_resp.strip()

            parsed_clips = json.loads(text_resp)
            if isinstance(parsed_clips, list) and len(parsed_clips) > 0:
                return self.validate_and_clamp_clips(parsed_clips, max_duration=max_duration, min_duration=min_duration)
        except Exception as e:
            logger.error(f"Gemini API analysis failed: {e}. Falling back to demo generator.")

        from app.services.ai.demo_provider import DemoProvider
        return await DemoProvider().analyze_transcript(transcript, segments, settings_dict)

    async def generate_hook(self, clip_text: str, clip_type: str = "general") -> str:
        if not self._model:
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().generate_hook(clip_text, clip_type)
        try:
            prompt = f"Generate ONE short, punchy 3-5 word viral video hook overlay text in ALL CAPS for this clip text: '{clip_text[:200]}'. Examples: 'WAIT FOR THE END...', 'THIS WAS UNEXPECTED'. Output only the hook text, nothing else."
            res = self._model.generate_content(prompt)
            return res.text.strip().replace('"', '')
        except Exception:
            return "WAIT FOR THE END..."

    async def generate_titles_and_hashtags(self, clip_text: str, title: str) -> Dict[str, Any]:
        if not self._model:
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().generate_titles_and_hashtags(clip_text, title)
        try:
            prompt = f"""Generate 3 viral titles, 1 short description, 6 hashtags, 1 YouTube Shorts title, and 1 IG caption for this video clip titled '{title}' with content: '{clip_text[:300]}'.
Return strictly valid JSON:
{{
  "titles": ["title1", "title2", "title3"],
  "description": "text",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"],
  "youtube_title": "title",
  "instagram_caption": "caption"
}}"""
            res = self._model.generate_content(prompt)
            clean = res.text.strip()
            if "```" in clean:
                clean = clean.split("```")[1].replace("json", "").strip()
            return json.loads(clean)
        except Exception:
            from app.services.ai.demo_provider import DemoProvider
            return await DemoProvider().generate_titles_and_hashtags(clip_text, title)
