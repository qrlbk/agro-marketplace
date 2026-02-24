# Деплой Agro Marketplace

## Production Docker Compose

Из **корня репозитория**:

```bash
export POSTGRES_PASSWORD=your_secure_password
docker compose -f docker/docker-compose.prod.yml up -d --build
```

Обязательные переменные окружения (можно задать в `.env` в корне или в `backend/.env` для backend):

- `POSTGRES_PASSWORD` — пароль PostgreSQL (обязателен в prod-композе).
- В `backend/.env`: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (не дефолтный), при необходимости `DEMO_AUTH_ENABLED=false`, SMS, OpenAI и т.д. (см. `backend/.env.example`).

Порты по умолчанию:

- Frontend: 3000 (переопределяется `FRONTEND_PORT`).
- Backend: 8000 (переопределяется `BACKEND_PORT`).

При сборке фронта можно задать контакты поддержки (отображаются на странице «Обратная связь»): `VITE_SUPPORT_PHONE`, `VITE_SUPPORT_EMAIL` (передаются как build-args при `docker build` или в `.env` при локальной сборке).

Первый запуск:

1. После `up` выполнить миграции и при необходимости сиды на контейнере backend:
   ```bash
   docker compose -f docker/docker-compose.prod.yml exec backend alembic upgrade head
   docker compose -f docker/docker-compose.prod.yml exec backend python -m scripts.seed  # опционально
   ```

2. Приложение доступно: фронт — `http://localhost:3000`, API — `http://localhost:8000`. Для продакшена настройте reverse proxy (nginx/traefik) и задайте при сборке фронта `VITE_API_URL` на публичный URL API.

## Health-эндпоинты

- `GET /health` — liveness (всегда 200, если процесс жив).
- `GET /health/ready` — readiness: проверяет подключение к PostgreSQL и Redis; при недоступности возвращает **503**. Используйте для проверки готовности в оркестраторе (Kubernetes/Docker) и балансировщике.

## Рекомендации по мониторингу и алертам

- Следите за доступностью `GET /health/ready` (частота опроса по вашему стеку).
- Логи приложения: ошибки, предупреждения (в т.ч. JWT_SECRET, OTP rate limit).
- Ресурсы: использование диска/памяти контейнерами и хостом.
- Настройте алерты при 503 на `/health/ready` или при падении проверок в Prometheus/облачном мониторинге.

Бэкапы БД и план восстановления см. в [BACKUP.md](BACKUP.md) и [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md).
