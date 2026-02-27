import pytest
from fastapi import HTTPException


def test_staff_password_policy_accepts_strong_password():
    from app.routers import staff as staff_router

    # Should not raise for strong password (letters + digits, >= min length)
    staff_router._validate_staff_password("Abcdefgh1234")


@pytest.mark.parametrize(
    "password",
    [
        "short1",
        "allletterslongpassword",
        "12345678901234",
    ],
)
def test_staff_password_policy_rejects_weak_passwords(password):
    from app.routers import staff as staff_router

    with pytest.raises(HTTPException):
        staff_router._validate_staff_password(password)
