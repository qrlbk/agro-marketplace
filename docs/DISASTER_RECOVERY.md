# План восстановления после сбоя

## Восстановление БД из бэкапа

1. Остановить приложение (backend), чтобы не было записи в БД.
2. Восстановить дамп (пример для дампа в формате custom или plain SQL):
   - Plain SQL (наш скрипт создаёт .sql.gz):  
     `gunzip -c backend/backups/agro_marketplace_YYYYMMDD_HHMMSS.sql.gz | psql "postgresql://user:pass@host:port/agro_marketplace"`
   - Или через Docker:  
     `gunzip -c backup.sql.gz | docker compose -f docker/docker-compose.prod.yml exec -T postgres psql -U agro agro_marketplace`
3. При необходимости пересоздать БД перед восстановлением (полная замена):
   - Удалить БД и создать заново или выполнить `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` и затем восстановить дамп.
4. Запустить приложение и проверить `GET /health/ready` и тестовый вход.

## Порядок поднятия сервисов после сбоя

1. PostgreSQL (при необходимости восстановить из бэкапа до запуска).
2. Redis.
3. Backend API.
4. Frontend (или reverse proxy).
5. Проверка: `curl -s http://localhost:8000/health/ready`, затем проверка входа и основных сценариев.

## Откат деплоя при неудачном релизе

- При использовании Docker: пересобрать образ предыдущей версии (git tag/commit) и перезапустить контейнеры:
  `docker compose -f docker/docker-compose.prod.yml up -d --build`
  с нужной версией кода.
- Миграции БД: при откате кода убедиться, что обратные миграции (downgrade) при необходимости написаны и применены, либо восстанавливать БД из бэкапа до миграции.

## Контакты ответственных

- Ответственный за инфраструктуру / деплой: _указать контакт_
- Где хранятся бэкапы: _указать путь или хранилище_
