"""
Pytest configuration and shared fixtures for ClipForge AI tests.
"""
import asyncio
import os
import uuid
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# Use in-memory SQLite for all tests — no Postgres required
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-key-not-for-production")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("STORAGE_BACKEND", "local")
os.environ.setdefault("LOCAL_STORAGE_PATH", "/tmp/clipforge_test_storage")
os.environ.setdefault("AI_PROVIDER", "demo")
os.environ.setdefault("WHISPER_MODEL", "tiny")

from app.models.models import Base
from app.main import app
from app.database import get_db

TEST_ENGINE = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
)
TestSessionLocal = async_sessionmaker(TEST_ENGINE, expire_on_commit=False)


@pytest_asyncio.fixture
async def setup_database():
    """Create all tables before tests, drop them after."""
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a clean database session for each test."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client with database override."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def test_user_data():
    """Sample user registration data."""
    unique = uuid.uuid4().hex[:8]
    return {
        "email": f"test_{unique}@clipforge.test",
        "password": "TestPassword123!",
        "full_name": f"Test User {unique}",
    }


@pytest_asyncio.fixture
async def registered_user(client: AsyncClient, test_user_data: dict):
    """Register a user and return their token + user data."""
    res = await client.post("/api/auth/register", json=test_user_data)
    assert res.status_code == 200, f"Registration failed: {res.text}"
    return res.json()


@pytest_asyncio.fixture
async def auth_headers(registered_user: dict):
    """Return auth headers for the registered user."""
    token = registered_user.get("access_token") or registered_user.get("token", "")
    return {"Authorization": f"Bearer {token}"}
