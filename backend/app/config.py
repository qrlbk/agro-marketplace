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
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    cache_ttl_seconds: int = 300
    max_upload_mb: int = 10
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"

    class Config:
        env_file = _env_path
        extra = "ignore"


settings = Settings()
