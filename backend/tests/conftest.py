import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.database import get_db, async_session_maker


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    """Async HTTP client for testing the FastAPI app (no DB/Redis required for health/auth tests)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def db_session():
    """Session that rolls back after test; use for integration tests so no data persists.
    Requires PostgreSQL and Redis (e.g. docker compose -f docker/docker-compose.yml up -d).
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.rollback()


@pytest.fixture
async def client_with_db(db_session):
    """HTTP client with get_db overridden to use db_session (rollback). For integration tests."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.pop(get_db, None)
