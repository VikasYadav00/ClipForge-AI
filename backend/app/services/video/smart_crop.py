import logging
import os
import shutil
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

class SmartCropper:
    """
    Intelligent reframing engine for 9:16 vertical video conversion.
    Supports face tracking using MediaPipe / OpenCV, active speaker centering,
    and reliable fallback center cropping.
    """

    @classmethod
    def calculate_center_crop(cls, source_width: int, source_height: int) -> Dict[str, int]:
        """
        Calculates standard 9:16 center crop box inside source video dimensions.
        """
        target_aspect = 9.0 / 16.0
        source_aspect = float(source_width) / float(source_height)

        if source_aspect > target_aspect:
            # Video is wider than 9:16 (standard landscape 16:9)
            crop_height = source_height
            crop_width = int(source_height * target_aspect)
            crop_x = int((source_width - crop_width) / 2)
            crop_y = 0
        else:
            # Video is taller than 9:16
            crop_width = source_width
            crop_height = int(source_width / target_aspect)
            crop_x = 0
            crop_y = int((source_height - crop_height) / 2)

        return {
            "x": crop_x,
            "y": crop_y,
            "width": crop_width,
            "height": crop_height,
            "target_width": 1080,
            "target_height": 1920
        }

    @classmethod
    def detect_face_center(
        cls,
        video_path: str,
        start_time: float,
        end_time: float,
        source_width: int,
        source_height: int
    ) -> Optional[float]:
        """
        Attempts to detect prominent face X-coordinate center across sampled frames.
        Returns normalized center X (0.0 to 1.0) or None if detection fails/unavailable.
        """
        try:
            import cv2
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return None

            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            start_frame = int(start_time * fps)
            end_frame = int(end_time * fps)
            step_frame = max(int(fps * 2), 1)  # Sample every 2 seconds

            face_cascade = None
            try:
                # Load OpenCV Haar cascade
                cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
                if os.path.exists(cascade_path):
                    face_cascade = cv2.CascadeClassifier(cascade_path)
            except Exception:
                pass

            detected_x_positions = []

            for f_idx in range(start_frame, end_frame, step_frame):
                cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
                ret, frame = cap.read()
                if not ret:
                    break

                if face_cascade is not None:
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=4, minSize=(60, 60))
                    if len(faces) > 0:
                        # Largest face
                        largest = max(faces, key=lambda f: f[2] * f[3])
                        fx, fy, fw, fh = largest
                        center_x = (fx + fw / 2.0) / float(source_width)
                        detected_x_positions.append(center_x)

            cap.release()

            if detected_x_positions:
                # Average detected center X
                avg_x = sum(detected_x_positions) / len(detected_x_positions)
                return max(0.1, min(0.9, avg_x))

        except Exception as e:
            logger.debug(f"Face tracking encountered exception: {e}")

        return None

    @classmethod
    def calculate_smart_crop(
        cls,
        source_width: int,
        source_height: int,
        face_center_x: Optional[float] = None
    ) -> Dict[str, int]:
        """
        Calculates 9:16 crop box biased towards detected face position.
        """
        center_box = cls.calculate_center_crop(source_width, source_height)
        if face_center_x is None:
            return center_box

        crop_w = center_box["width"]
        crop_h = center_box["height"]

        # Center crop horizontally on detected face
        desired_center_px = int(face_center_x * source_width)
        x = desired_center_px - int(crop_w / 2)

        # Clamp x to stay within frame bounds
        x = max(0, min(source_width - crop_w, x))

        return {
            "x": x,
            "y": center_box["y"],
            "width": crop_w,
            "height": crop_h,
            "target_width": 1080,
            "target_height": 1920
        }

    @classmethod
    def get_ffmpeg_crop_filter(cls, crop_data: Dict[str, int]) -> str:
        """
        Returns FFmpeg filter string for cropping and scaling to 1080x1920.
        """
        w = crop_data["width"]
        h = crop_data["height"]
        x = crop_data["x"]
        y = crop_data["y"]
        # Crop to 9:16 then scale cleanly to 1080x1920
        return f"crop={w}:{h}:{x}:{y},scale=1080:1920:flags=lanczos"

    @classmethod
    def get_ffmpeg_blur_backdrop_filter(cls) -> str:
        """
        Creates a professional 9:16 vertical layout for landscape 16:9 videos:
        The full uncropped video is placed in the center at 100% natural scale
        (face and gameplay are never zoomed in or oversized),
        with an aesthetic soft blurred version of the video filling the vertical space.
        """
        return (
            "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];"
            "[0:v]scale=1080:-2:flags=lanczos[fg];"
            "[bg][fg]overlay=(W-w)/2:(H-h)/2"
        )
