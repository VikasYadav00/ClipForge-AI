import os
import boto3
from botocore.exceptions import ClientError
from typing import Optional
from fastapi import UploadFile
from app.config import settings

class S3Storage:
    def __init__(self):
        self.bucket = settings.S3_BUCKET
        client_kwargs = {
            'aws_access_key_id': settings.S3_ACCESS_KEY,
            'aws_secret_access_key': settings.S3_SECRET_KEY,
            'region_name': settings.S3_REGION or 'auto',
        }
        if settings.S3_ENDPOINT:
            client_kwargs['endpoint_url'] = settings.S3_ENDPOINT

        self.s3_client = boto3.client('s3', **client_kwargs)

    async def save_upload(self, upload_file: UploadFile, destination_path: str) -> str:
        s3_key = destination_path.replace("\\", "/").lstrip("/")
        # Seek to beginning
        await upload_file.seek(0)
        self.s3_client.upload_fileobj(
            upload_file.file,
            self.bucket,
            s3_key,
            ExtraArgs={'ContentType': upload_file.content_type or 'video/mp4'}
        )
        return s3_key

    async def save_bytes(self, data: bytes, destination_path: str) -> str:
        s3_key = destination_path.replace("\\", "/").lstrip("/")
        self.s3_client.put_object(
            Bucket=self.bucket,
            Key=s3_key,
            Body=data
        )
        return s3_key

    def delete_file(self, path: str) -> bool:
        s3_key = path.replace("\\", "/").lstrip("/")
        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=s3_key)
            return True
        except ClientError:
            return False

    def get_url(self, relative_path: str, expiration: int = 3600) -> str:
        s3_key = relative_path.replace("\\", "/").lstrip("/")
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
        except ClientError:
            return f"https://{self.bucket}.s3.amazonaws.com/{s3_key}"
