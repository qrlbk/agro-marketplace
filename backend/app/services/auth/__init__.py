# Auth services: OTP, tokens, login guard.
# Used by app.routers.auth.

from app.services.auth.otp import (
    OTP_KEY_PREFIX,
    OTP_LENGTH,
    OTP_TTL,
    check_otp_rate_limit,
    check_otp_verify_rate_limit,
    delete_hashed_otp,
    ensure_otp_not_blocked,
    generate_otp_code,
    hash_otp_code,
    load_hashed_otp,
    otp_lock_message,
    register_otp_failure,
    reset_otp_failure_counters,
    save_hashed_otp,
    raise_invalid_otp_code,
)
from app.services.auth.tokens import (
    MARKETPLACE_JWT_ISSUER,
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    make_token_out,
    refresh_secret,
)
from app.services.auth.login_guard import (
    check_demo_login_rate_limit,
    demo_role_to_user_role,
    is_login_blocked,
    register_login_failure,
    reset_login_counters,
)

__all__ = [
    "OTP_KEY_PREFIX",
    "OTP_LENGTH",
    "OTP_TTL",
    "check_otp_rate_limit",
    "check_otp_verify_rate_limit",
    "delete_hashed_otp",
    "ensure_otp_not_blocked",
    "generate_otp_code",
    "hash_otp_code",
    "load_hashed_otp",
    "otp_lock_message",
    "register_otp_failure",
    "reset_otp_failure_counters",
    "save_hashed_otp",
    "raise_invalid_otp_code",
    "MARKETPLACE_JWT_ISSUER",
    "REFRESH_TOKEN_TYPE",
    "create_access_token",
    "create_refresh_token",
    "make_token_out",
    "refresh_secret",
    "check_demo_login_rate_limit",
    "demo_role_to_user_role",
    "is_login_blocked",
    "register_login_failure",
    "reset_login_counters",
]
