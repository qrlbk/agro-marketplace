import pytest
from fastapi import HTTPException

from app.services.storage_quota import ensure_storage_quota


def test_ensure_storage_quota_allows_within_limit():
    assert ensure_storage_quota(100.0, 500, 25.5) == pytest.approx(125.5)


def test_ensure_storage_quota_unlimited_when_quota_zero():
    assert ensure_storage_quota(0, 0, 300) == pytest.approx(300)


def test_ensure_storage_quota_raises_when_limit_exceeded():
    with pytest.raises(HTTPException) as exc:
        ensure_storage_quota(499.0, 500, 2.0)
    assert exc.value.status_code == 413
    assert "лимит" in exc.value.detail.lower()
