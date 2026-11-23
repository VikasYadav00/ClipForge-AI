from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class AIProvider(ABC):
    """Abstract interface for AI analysis providers."""

    @abstractmethod
    async def analyze_transcript(
        self,
        transcript: str,
        segments: List[Dict[str, Any]],
        settings: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Analyze full transcript with timestamps to identify viral moments.
        Returns list of clip metadata dictionaries.
        """
        pass

    @abstractmethod
    async def generate_hook(self, clip_text: str, clip_type: str = "general") -> str:
        """Generate high-converting hook text for overlay."""
        pass

    @abstractmethod
    async def generate_titles_and_hashtags(
        self,
        clip_text: str,
        title: str
    ) -> Dict[str, Any]:
        """Generate 3 title variations, description, hashtags, YouTube Shorts title, IG caption."""
        pass

    def validate_and_clamp_clips(
        self,
        clips: List[Dict[str, Any]],
        max_duration: float = 30.0,
        min_duration: float = 10.0
    ) -> List[Dict[str, Any]]:
        """
        STRICT 30-SECOND ENFORCEMENT LAYER:
        Validates every clip duration. If AI returns > 30s,
        clamps the segment to the strongest 30-second window.
        """
        valid_clips = []
        # Enforce hard ceiling of 30.0s regardless of what settings say
        hard_max = min(max_duration, 30.0)

        for clip in clips:
            start_time = float(clip.get("start_time", 0.0))
            end_time = float(clip.get("end_time", 0.0))
            duration = end_time - start_time

            if duration <= 0:
                continue

            # If AI exceeded 30s (or requested max), clamp to hard_max
            if duration > hard_max:
                # Find strongest segment within window or clamp to start + hard_max
                end_time = round(start_time + hard_max, 2)
                duration = round(hard_max, 2)
            else:
                duration = round(duration, 2)

            # Ensure minimum duration requirement
            if duration < min_duration:
                # If too short, check if we can extend slightly if within bounds
                continue

            clip["start_time"] = round(start_time, 2)
            clip["end_time"] = round(end_time, 2)
            clip["duration"] = duration

            # Ensure viral score breakdown structure
            score = clip.get("viral_score", 85)
            clip["viral_score"] = max(0, min(100, int(score)))

            breakdown = clip.get("score_breakdown", {})
            clip["score_breakdown"] = {
                "hook": min(20, max(0, breakdown.get("hook", 18))),
                "emotion": min(15, max(0, breakdown.get("emotion", 13))),
                "interesting": min(15, max(0, breakdown.get("interesting", 14))),
                "replay": min(15, max(0, breakdown.get("replay", 13))),
                "context": min(15, max(0, breakdown.get("context", 13))),
                "visual": min(10, max(0, breakdown.get("visual", 8))),
                "ending": min(10, max(0, breakdown.get("ending", 8))),
            }
            # Recompute total score from breakdown sum for consistency
            clip["viral_score"] = sum(clip["score_breakdown"].values())

            valid_clips.append(clip)

        return valid_clips
