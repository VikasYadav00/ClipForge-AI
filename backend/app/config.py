from pydantic_settings import BaseSettings
from typing import Optional, List
import os


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://clipforge:clipforge@localhost:5432/clipforge"
    DATABASE_URL_SYNC: str = "postgresql://clipforge:clipforge@localhost:5432/clipforge"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = "change-me-to-a-long-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    AI_PROVIDER: str = "demo"  # gemini, openai, demo
    WHISPER_MODEL: str = "base"

    # SMTP
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@clipforge.ai"

    # Storage
    STORAGE_PROVIDER: str = "local"
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_BUCKET: str = "clipforge"
    S3_ENDPOINT: Optional[str] = None
    S3_REGION: str = "auto"

    UPLOAD_DIR: str = "./storage/uploads"
    OUTPUT_DIR: str = "./storage/output"
    TEMP_DIR: str = "./storage/temp"

    # Upload limits (Supports any video format up to 20 GB)
    MAX_UPLOAD_SIZE_MB: int = 20480  # 20 GB
    MAX_VIDEO_DURATION_MINUTES: int = 1440  # 24 hours (supports long streams and podcasts)
    ALLOWED_EXTENSIONS: str = "*"  # Any video format

    # Processing
    MAX_CLIP_DURATION_SECONDS: int = 30
    MIN_CLIP_DURATION_SECONDS: int = 10
    DEFAULT_CLIPS_COUNT: int = 10

    # App
    APP_NAME: str = "ClipForge AI"
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    CORS_ORIGINS: str = "http://localhost:3000"

    # Admin
    ADMIN_EMAIL: str = "admin@clipforge.ai"
    ADMIN_PASSWORD: str = "change-me"

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def allowed_extensions_list(self) -> List[str]:
        if self.ALLOWED_EXTENSIONS.strip() == "*":
            return ["*"]
        return [ext.strip().lower() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def is_demo_mode(self) -> bool:
        return self.AI_PROVIDER == "demo"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
