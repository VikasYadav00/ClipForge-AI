import random
from typing import List, Dict, Any
from app.services.ai.base import AIProvider

class DemoProvider(AIProvider):
    """
    High-fidelity Demo Provider when external AI API keys are not configured.
    Generates realistic, timestamp-coherent viral clips based on actual transcript segments,
    strictly obeying the <= 30 second limit.
    """

    MOCK_HOOKS = [
        "WAIT FOR THE END...",
        "THIS WAS UNEXPECTED",
        "I NEVER SAW THIS COMING",
        "THE CRAZIEST MOMENT",
        "HE ACTUALLY SAID THIS",
        "THIS CHANGED EVERYTHING",
        "NOBODY EXPECTED THIS",
        "WATCH HIS REACTION",
    ]

    CLIP_TYPES = [
        "funny", "podcast", "educational", "gaming",
        "storytelling", "emotional", "controversial", "informative"
    ]

    async def analyze_transcript(
        self,
        transcript: str,
        segments: List[Dict[str, Any]],
        settings: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        num_clips = settings.get("num_clips", 5)
        max_duration = min(float(settings.get("max_clip_duration", 30)), 30.0)
        min_duration = float(settings.get("min_clip_duration", 10.0))
        target_style = settings.get("clip_style", "auto")

        raw_clips = []

        if not segments:
            # Fallback when no segments exist (e.g. silent video or quick demo)
            # Create segments from 0 to 90s
            mock_duration = 120.0
            step = min(mock_duration / max(num_clips, 1), 30.0)
            for i in range(num_clips):
                start = round(i * step, 2)
                end = round(start + min(random.uniform(15.0, 28.0), max_duration), 2)
                raw_clips.append(self._build_mock_clip(i + 1, start, end, "Engaging Moment Highlight", target_style))
        else:
            # Group transcript segments into candidate clips of 15-28 seconds
            total_segments = len(segments)
            stride = max(1, total_segments // num_clips)
            
            for idx in range(0, min(total_segments, num_clips * stride), stride):
                start_seg = segments[idx]
                start_time = float(start_seg.get("start", 0.0))
                
                # Accumulate segments until duration is between 15s and max_duration
                end_time = start_time
                text_acc = []
                for s in segments[idx:]:
                    s_end = float(s.get("end", end_time + 5.0))
                    if (s_end - start_time) > max_duration:
                        break
                    end_time = s_end
                    text_acc.append(s.get("text", ""))

                duration = end_time - start_time
                if duration < min_duration:
                    end_time = min(start_time + 20.0, start_time + max_duration)

                clip_text = " ".join(text_acc).strip() or "Interesting highlight from conversation"
                title = f"Highlight #{len(raw_clips) + 1} - {clip_text[:35]}..." if len(clip_text) > 35 else f"Viral Moment #{len(raw_clips) + 1}"
                
                raw_clips.append(self._build_mock_clip(
                    len(raw_clips) + 1,
                    start_time,
                    end_time,
                    title,
                    target_style,
                    clip_text
                ))

                if len(raw_clips) >= num_clips:
                    break

        # Pass through the strict duration clamp & scoring validation layer
        return self.validate_and_clamp_clips(raw_clips, max_duration=max_duration, min_duration=min_duration)

    def _build_mock_clip(
        self,
        clip_number: int,
        start_time: float,
        end_time: float,
        title: str,
        target_style: str,
        text: str = ""
    ) -> Dict[str, Any]:
        hook = random.choice(self.MOCK_HOOKS)
        clip_type = target_style if target_style != "auto" else random.choice(self.CLIP_TYPES)
        
        # Build category score breakdown
        hook_score = random.randint(16, 20)
        emotion_score = random.randint(11, 15)
        interesting_score = random.randint(12, 15)
        replay_score = random.randint(11, 15)
        context_score = random.randint(12, 15)
        visual_score = random.randint(7, 10)
        ending_score = random.randint(7, 10)
        total_score = hook_score + emotion_score + interesting_score + replay_score + context_score + visual_score + ending_score

        duration = min(round(end_time - start_time, 2), 30.0)

        clean_title = title.replace("\n", " ").strip()
        return {
            "clip_number": clip_number,
            "title": clean_title,
            "start_time": round(start_time, 2),
            "end_time": round(start_time + duration, 2),
            "duration": duration,
            "clip_type": clip_type,
            "hook_text": hook,
            "caption_text": text or "You won't believe what happened next in this incredible story.",
            "viral_score": total_score,
            "score_breakdown": {
                "hook": hook_score,
                "emotion": emotion_score,
                "interesting": interesting_score,
                "replay": replay_score,
                "context": context_score,
                "visual": visual_score,
                "ending": ending_score
            },
            "hashtags": [f"#{clip_type}", "#viral", "#shorts", "#trending", "#fyp", "#clipforge"],
            "ai_titles": [
                f"{hook}: {clean_title}",
                f"Why Everyone is Talking About This ({clip_type.capitalize()})",
                f"The Most Shocking Moment Ever Recorded"
            ],
            "ai_description": f"Check out this insane {clip_type} moment! What do you think about this? Drop your thoughts in the comments below! #shorts #viral",
            "youtube_title": f"{hook}! {clean_title} #Shorts",
            "instagram_caption": f"{hook} 😱 Can't believe this happened! Watch till the end. \n\n#reels #viral #{clip_type} #fyp"
        }

    async def generate_hook(self, clip_text: str, clip_type: str = "general") -> str:
        return random.choice(self.MOCK_HOOKS)

    async def generate_titles_and_hashtags(self, clip_text: str, title: str) -> Dict[str, Any]:
        return {
            "titles": [
                f"WAIT FOR IT: {title}",
                f"This Is Why You Never Give Up",
                f"The Most Unbelievable Reaction"
            ],
            "description": f"Highlight moment: {clip_text[:100]}... Subscribe for more clips!",
            "hashtags": ["#shorts", "#viral", "#trending", "#reels", "#fyp", "#contentcreator"],
            "youtube_title": f"UNEXPECTED: {title} #Shorts",
            "instagram_caption": f"Wait for the end... 🔥 Drop your thoughts! \n\n#reels #shorts #explorepage"
        }
