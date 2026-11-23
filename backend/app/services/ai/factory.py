from app.config import settings
from app.services.ai.base import AIProvider
from app.services.ai.demo_provider import DemoProvider

def get_ai_provider() -> AIProvider:
    provider = settings.AI_PROVIDER.lower()
    if provider == "gemini" and settings.GEMINI_API_KEY:
        from app.services.ai.gemini_provider import GeminiProvider
        return GeminiProvider()
    elif provider == "openai" and settings.OPENAI_API_KEY:
        from app.services.ai.openai_provider import OpenAIProvider
        return OpenAIProvider()
    return DemoProvider()
