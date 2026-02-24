import pytest


@pytest.mark.unit
@pytest.mark.asyncio
async def test_health_ok(client):
    """GET /health returns 200 and status ok."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data == {"status": "ok"}


@pytest.mark.unit
@pytest.mark.asyncio
async def test_health_openai_format(client):
    """GET /health/openai returns JSON with key_set (and optional ok/error)."""
    response = await client.get("/health/openai")
    assert response.status_code == 200
    data = response.json()
    assert "key_set" in data
    # Without OPENAI_API_KEY we expect key_set: false
    assert isinstance(data["key_set"], bool)
