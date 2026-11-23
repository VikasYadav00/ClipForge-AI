import pytest
from app.services.video.youtube_downloader import YouTubeDownloader


def test_youtube_url_validation():
    # Valid standard watch URLs
    assert YouTubeDownloader.is_valid_youtube_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ") is True
    assert YouTubeDownloader.is_valid_youtube_url("http://youtube.com/watch?v=dQw4w9WgXcQ") is True
    assert YouTubeDownloader.is_valid_youtube_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s") is True

    # Valid short URLs (youtu.be)
    assert YouTubeDownloader.is_valid_youtube_url("https://youtu.be/dQw4w9WgXcQ") is True
    assert YouTubeDownloader.is_valid_youtube_url("http://youtu.be/dQw4w9WgXcQ?si=12345") is True

    # Valid Shorts URLs
    assert YouTubeDownloader.is_valid_youtube_url("https://www.youtube.com/shorts/dQw4w9WgXcQ") is True

    # Invalid URLs
    assert YouTubeDownloader.is_valid_youtube_url("https://vimeo.com/123456789") is False
    assert YouTubeDownloader.is_valid_youtube_url("https://notyoutube.com/watch?v=123") is False
    assert YouTubeDownloader.is_valid_youtube_url("not a url at all") is False
    assert YouTubeDownloader.is_valid_youtube_url("") is False
