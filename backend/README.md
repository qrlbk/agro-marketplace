# Backend — локальный запуск

## 1. Запустить БД (PostgreSQL и Redis)

Из **корня проекта** `agro-marketplace`:

```bash
docker compose -f docker/docker-compose.yml up -d
```

PostgreSQL будет доступен на **localhost:5433**, Redis — на **localhost:6380**.

Убедитесь, что в `backend/.env` указано (если файла нет — скопируйте из `.env.example`):

```
DATABASE_URL=postgresql+asyncpg://agro:agro@localhost:5433/agro_marketplace
REDIS_URL=redis://localhost:6380/0
```

(В примере порт 5432 — для нашего Docker нужен **5433** на хосте.)

## 2. Миграции и сиды

Из папки **backend** (не из корня):

```bash
cd backend
alembic upgrade head
python -m scripts.seed
```

Если вы уже в `backend`, не пишите `cd backend` повторно — просто:

```bash
alembic upgrade head
python -m scripts.seed
```

## 3. Запуск API

Из папки **backend**:

```bash
uvicorn app.main:app --reload
```

Сервер будет на http://127.0.0.1:8000 (или порт из конфига).

## Итого: полная последовательность из корня

```bash
# Корень проекта
docker compose -f docker/docker-compose.yml up -d

cd backend
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload
```

После этого фронт (npm run dev из frontend) сможет обращаться к API без 500 на `/categories/tree`, `/machines`, `/products`.

## Разграничение доступа

Матрица ролей и страниц (кто что видит): см. [docs/ACCESS_MATRIX.md](../docs/ACCESS_MATRIX.md) в корне проекта.

## Тесты

Из папки **backend**:

```bash
pytest tests/ -v
```

Тесты `test_health.py` и `test_admin_auth.py` не требуют БД/Redis. Интеграционные тесты (`tests/test_checkout.py`) требуют запущенные PostgreSQL и Redis (например `docker compose -f docker/docker-compose.yml up -d` и корректный `DATABASE_URL` / `REDIS_URL` в `.env`).

## Безопасность

- **Production:** обязательно задайте в `.env` надёжный `JWT_SECRET` и при использовании Staff portal — `STAFF_JWT_SECRET`. Не используйте значения по умолчанию из `config.py`.
- **Staff portal:** дефолтные `staff_default_login` / `staff_default_password` (admin/admin) предназначены только для разработки. В проде смените их или отключите дефолтного сотрудника после первого входа.
- Не коммитьте файл `.env` с реальными секретами; используйте `.env.example` как шаблон.
