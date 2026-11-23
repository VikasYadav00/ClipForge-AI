import os
import shutil
import aiofiles
from typing import Optional
from fastapi import UploadFile
from app.config import settings

class LocalStorage:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        self.output_dir = settings.OUTPUT_DIR
        self.temp_dir = settings.TEMP_DIR
        for d in [self.upload_dir, self.output_dir, self.temp_dir]:
            os.makedirs(d, exist_ok=True)

    async def save_upload(self, upload_file: UploadFile, destination_path: str) -> str:
        os.makedirs(os.path.dirname(destination_path), exist_ok=True)
        async with aiofiles.open(destination_path, 'wb') as out_file:
            while content := await upload_file.read(1024 * 1024):  # 1MB chunks
                await out_file.write(content)
        return destination_path

    async def save_bytes(self, data: bytes, destination_path: str) -> str:
        os.makedirs(os.path.dirname(destination_path), exist_ok=True)
        async with aiofiles.open(destination_path, 'wb') as out_file:
            await out_file.write(data)
        return destination_path

    def get_file_path(self, relative_path: str) -> str:
        return os.path.abspath(relative_path)

    def file_exists(self, path: str) -> bool:
        return os.path.exists(path)

    def get_file_size(self, path: str) -> int:
        if os.path.exists(path):
            return os.path.getsize(path)
        return 0

    def delete_file(self, path: str) -> bool:
        try:
            if os.path.exists(path):
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    os.remove(path)
                return True
        except Exception:
            return False
        return False

    def get_url(self, relative_path: str) -> str:
        # Convert local path to backend static route or relative URL
        clean_path = relative_path.replace("\\", "/").lstrip("./")
        return f"/api/static/{clean_path}"
