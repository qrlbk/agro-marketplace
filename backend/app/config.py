from pathlib import Path

from pydantic_settings import BaseSettings

# .env ищем в папке backend (родитель app), чтобы ключи подхватывались при любом cwd
_env_path = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
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
    openai_model: str = "gpt-4o"
    openai_chat_model: str = ""
    openai_tool_model: str = ""
    openai_chat_max_tokens: int = 500
    openai_timeout_seconds: float = 60.0
    cache_ttl_seconds: int = 300
    max_upload_mb: int = 10
    # OTP rate limit: max requests per phone per window (and per IP)
    otp_rate_limit_per_phone: int = 3
    otp_rate_limit_window_seconds: int = 900  # 15 min
    otp_rate_limit_per_ip: int = 10
    # Chat rate limit: max requests per user/IP per window (avoid OpenAI budget burn)
    chat_rate_limit_per_minute: int = 10
    chat_rate_limit_window_seconds: int = 60
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3002,http://127.0.0.1:3002"
    # Staff portal: optional separate JWT secret (defaults to jwt_secret); seed defaults
    staff_jwt_secret: str | None = None  # None = use jwt_secret with iss=staff-portal
    staff_default_login: str = "admin"
    staff_default_password: str = "admin"
    # Set False in production to disable demo login (phone+password)
    demo_auth_enabled: bool = True

    class Config:
        env_file = _env_path
        extra = "ignore"


settings = Settings()
