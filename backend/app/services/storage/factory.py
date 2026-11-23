from app.config import settings
from app.services.storage.local_storage import LocalStorage

def get_storage():
    if settings.STORAGE_PROVIDER in ("s3", "r2") and settings.S3_ACCESS_KEY and settings.S3_SECRET_KEY:
        try:
            from app.services.storage.s3_storage import S3Storage
            return S3Storage()
        except Exception:
            return LocalStorage()
    return LocalStorage()
