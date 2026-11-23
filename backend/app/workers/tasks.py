import asyncio
import logging
from app.workers.celery_app import celery_app
from app.workers.inline_processor import InlineProcessor
from app.database import async_session

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name="process_video_task")
def process_video_task(self, project_id: str, clip_settings: dict):
    """
    Celery worker task for video processing pipeline.
    """
    import uuid
    p_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(
            InlineProcessor.process_project(p_uuid, async_session, clip_settings)
        )
    finally:
        loop.close()
