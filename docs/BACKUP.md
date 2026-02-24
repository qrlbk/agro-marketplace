# Бэкапы БД

## Ручной бэкап

Из папки **backend** (или из корня с указанием пути):

```bash
cd backend
chmod +x scripts/backup_db.sh
./scripts/backup_db.sh
```

Файл будет создан в `backend/backups/agro_marketplace_YYYYMMDD_HHMMSS.sql.gz`. Чтобы указать другую директорию:

```bash
./scripts/backup_db.sh /path/to/backups
```

Требуется переменная `DATABASE_URL` в окружении или в `backend/.env` (в формате `postgresql+asyncpg://...`; скрипт подменяет схему на `postgresql://` для `pg_dump`). На машине должны быть установлены `pg_dump` и `gzip`.

## Бэкап при БД в Docker

Если PostgreSQL запущен через Docker (например `docker compose -f docker/docker-compose.prod.yml`):

```bash
docker compose -f docker/docker-compose.prod.yml exec postgres pg_dump -U agro agro_marketplace | gzip > agro_marketplace_$(date +%Y%m%d_%H%M%S).sql.gz
```

Либо выполнять `scripts/backup_db.sh` на хосте, указав `DATABASE_URL` с хостом и портом до контейнера (например `localhost:5432` при проброшенном порте).

## Расписание и ротация

Рекомендуется настроить ежедневный бэкап (cron или планировщик в CI):

- Пример cron (каждый день в 03:00):  
  `0 3 * * * /path/to/agro-marketplace/backend/scripts/backup_db.sh /path/to/backups`
- Хранить последние N копий (например 7 или 30 дней) и при необходимости выгружать их в объектное хранилище (S3 и т.п.).

Восстановление из дампа см. в [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md).
