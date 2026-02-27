from pathlib import Path
from typing import Final

from pydantic_settings import BaseSettings

# .env ищем в папке backend (родитель app), чтобы ключи подхватывались при любом cwd
_env_path = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    environment: str = "dev"  # dev | stage | prod
    database_url: str = "postgresql+asyncpg://agro:agro@localhost:5432/agro_marketplace"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 30
    otp_expire_minutes: int = 10
    sms_api_url: str = ""
    sms_api_key: str = ""
    webhook_1c_api_key: str = ""
    adata_api_key: str = ""
    adata_bin_lookup_url: str = "https://api.adata.kz/v1/bin"
    openai_api_key: str = ""
    llm_features_enabled: bool = True
    openai_model: str = "gpt-4o"
    openai_chat_model: str = ""
    openai_tool_model: str = ""
    openai_chat_max_tokens: int = 500
    openai_timeout_seconds: float = 60.0
    cache_ttl_seconds: int = 300
    max_upload_mb: int = 10
    trusted_proxies: str = ""
    chat_store_enabled: bool = True
    chat_prompt_log_level: str = "masked"  # none | masked | full
    # OTP rate limit: max requests per phone per window (and per IP)
    otp_rate_limit_per_phone: int = 3
    otp_rate_limit_window_seconds: int = 900  # 15 min
    otp_rate_limit_per_ip: int = 10
    # OTP verify control
    otp_verify_rate_limit_per_phone: int = 5
    otp_verify_rate_limit_per_ip: int = 15
    otp_verify_rate_limit_window_seconds: int = 900
    otp_verify_max_attempts: int = 5
    otp_code_secret: str | None = None
    # Chat rate limit: max requests per user/IP per window (avoid OpenAI budget burn)
    chat_rate_limit_per_minute: int = 10
    chat_rate_limit_window_seconds: int = 60
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3002,http://127.0.0.1:3002"
    # Staff portal: use a separate STAFF_JWT_SECRET in production to separate staff tokens from user tokens.
    # None = use jwt_secret with iss=staff-portal (dev only).
    staff_jwt_secret: str | None = None
    staff_default_login: str = "admin"
    staff_default_password: str = "admin"
    demo_auth_enabled: bool = False
    demo_login_rate_limit_per_ip: int = 10
    demo_login_rate_limit_window_seconds: int = 300
    staff_login_rate_limit_per_ip: int = 5
    staff_login_rate_limit_per_login: int = 5
    staff_login_rate_limit_window_seconds: int = 60
    staff_totp_required: bool = False
    staff_totp_secret: str | None = None
    staff_password_min_length: int = 12
    # Marketplace users: password auth & rate limiting
    user_password_min_length: int = 8
    user_login_rate_limit_per_ip: int = 20
    user_login_rate_limit_per_phone: int = 10
    user_login_rate_limit_window_seconds: int = 900
    health_api_key: str = ""
    vendor_storage_quota_mb: int = 500
    clamav_scan_command: str = "clamdscan"

    class Config:
        env_file = _env_path
        extra = "ignore"


class ConfigError(RuntimeError):
    """Raised when critical configuration is missing or insecure."""


_WEAK_JWT_SECRETS: Final[set[str]] = {"", "change-me", "change-me-to-random-secret-in-production"}
_PROD_ENV_NAMES: Final[set[str]] = {"prod", "production", "stage", "staging"}


def _clean_secret(value: str | None) -> str:
    return (value or "").strip()


def _is_prod_like(env_name: str) -> bool:
    return env_name.strip().lower() in _PROD_ENV_NAMES


def validate_secrets() -> None:
    """Fail-fast if critical secrets are missing or insecure."""
    jwt_secret = _clean_secret(settings.jwt_secret)
    if jwt_secret.lower() in _WEAK_JWT_SECRETS:
        raise ConfigError("JWT_SECRET is empty or uses a default development value.")

    staff_secret = _clean_secret(settings.staff_jwt_secret)
    if not staff_secret and _is_prod_like(settings.environment):
        raise ConfigError("STAFF_JWT_SECRET must be set for production/stage environments.")
    if staff_secret and staff_secret == jwt_secret:
        raise ConfigError("STAFF_JWT_SECRET must be different from JWT_SECRET.")

    webhook_key = _clean_secret(settings.webhook_1c_api_key)
    if not webhook_key:
        raise ConfigError("WEBHOOK_1C_API_KEY must be configured.")

    if settings.llm_features_enabled:
        if not _clean_secret(settings.openai_api_key):
            raise ConfigError("OPENAI_API_KEY must be configured when LLM features are enabled.")

    otp_secret = _clean_secret(settings.otp_code_secret) or jwt_secret
    if not otp_secret:
        raise ConfigError("OTP_CODE_SECRET (or fallback JWT_SECRET) must be configured.")

    if settings.staff_totp_required:
        if not _clean_secret(settings.staff_totp_secret):
            raise ConfigError("STAFF_TOTP_SECRET must be set when staff_totp_required=True.")

    if _is_prod_like(settings.environment):
        pwd = (settings.staff_default_password or "").strip()
        if pwd == "admin" or len(pwd) < settings.staff_password_min_length:
            raise ConfigError(
                "STAFF_DEFAULT_PASSWORD must be set and strong in production/stage "
                f"(min length {settings.staff_password_min_length}, cannot be 'admin')."
            )


settings = Settings()
