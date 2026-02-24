# Тестирование

## Backend (FastAPI)

- **Локально:** из папки `backend`: `pytest tests/ -v`. С покрытием: `pytest tests/ -v --cov=app`.
- **Только unit (без БД/Redis):** `pytest tests/ -v -m unit`.
- **Интеграционные (нужны PostgreSQL и Redis):** `pytest tests/ -v -m integration`. Перед этим запустите `docker compose -f docker/docker-compose.yml up -d` из корня проекта.

Подробнее см. [backend/README.md](../backend/README.md).

## Frontend (React + Vite)

- **Запуск тестов:** из папки `frontend`: `npm run test` (watch) или `npm run test:run` (один прогон).
- **Покрытие:** `npm run test:coverage`.

Используются Vitest и React Testing Library. Тесты лежат рядом с модулями (`*.test.ts`, `*.test.tsx`).

## CI (GitHub Actions)

В `.github/workflows/tests.yml` при push/PR в `main` или `master`:

1. **Backend (unit)** — устанавливаются зависимости, запускается `pytest tests/ -v -m unit`. Интеграционные тесты в CI по умолчанию не запускаются (требуют PostgreSQL и Redis).
2. **Frontend** — `npm ci` и `npm run test:run`.

Порог покрытия в CI не задан; при необходимости его можно добавить в `pytest.ini` (`--cov-fail-under`) и в Vitest (`coverage.reporter` и пороги).
