# Agro Marketplace MVP

Monorepo: FastAPI backend + React/TypeScript frontend. PostgreSQL, Redis, JWT auth, catalog, garage, checkout with order split, AI price normalization, 1C webhook, SMS gateway.

## Quick start

```bash
# Backend
cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
cp .env.example .env  # edit DATABASE_URL, REDIS_URL, JWT_SECRET, SMS_*, OPENAI_API_KEY
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev

# Optional: run PostgreSQL + Redis via Docker
docker compose -f docker/docker-compose.yml up -d
```

## Structure

- **`backend/`** — основное API: FastAPI, SQLAlchemy, Alembic, Redis, JWT, OTP, catalog, garage, cart, checkout, AI agents, webhooks
- **`frontend/`** — основное приложение: React 18, TypeScript, маршрутизация, каталог, гараж, корзина, админ-панель, Staff portal
- **`docker/`** — docker-compose для разработки (PostgreSQL, Redis)

Для запуска и деплоя используйте только `frontend/` и `backend/`.

## Security checklist

- Заполняйте `JWT_SECRET`, `STAFF_JWT_SECRET`, `WEBHOOK_1C_API_KEY`, `OPENAI_API_KEY` и другие чувствительные переменные в `backend/.env`. В production используйте разные и достаточно длинные секреты (например `openssl rand -hex 32`).
- В production задайте `ENVIRONMENT=prod` и оставьте `DEMO_AUTH_ENABLED=false`. Демо-вход в prod отключён на уровне кода (404).
- Перед первым запуском миграций в prod/stage задайте `STAFF_DEFAULT_LOGIN` и `STAFF_DEFAULT_PASSWORD` (миграция 008 создаёт первого сотрудника); используйте надёжный пароль.
- Если API развёрнуто за обратным прокси, задайте `TRUSTED_PROXIES` (через запятую) и при необходимости `HEALTH_API_KEY`, чтобы `/health/ready` не был публичным.
- Включайте `CHAT_STORE_ENABLED` только когда пользователи согласились на хранение чатов (флаг `chat_storage_opt_in`), иначе история LLM не сохраняется.
- Квота для хранилища продавца регулируется `VENDOR_STORAGE_QUOTA_MB`; превышение возвращает 413 и пишется в аудит.
- Файлы проверяются через ClamAV (`CLAMAV_SCAN_COMMAND`, по умолчанию `clamdscan`). Если антивирус не доступен, загрузки блокируются.
