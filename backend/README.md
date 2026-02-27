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

## Регистрация и вход пользователей маркетплейса

### Базовая модель

- Любой новый номер телефона после первой успешной верификации кода через `POST /auth/verify-otp` создаёт запись в таблице `users` с ролью `guest`.
- **Регистрация пользователя** в терминах бекенда — это:
  1. первый успешный `verify-otp` (создание `User` с ролью `guest` и выдача JWT),
  2. последующий `POST /auth/onboarding`, который присваивает пользователю финальную роль:
     - `user` — обычный покупатель;
     - `farmer` — фермер (может вести гараж и делать закупки для хозяйства);
     - `vendor` — поставщик (привязан к компании, видит вендорские разделы).

После успешного онбординга пользователь считается **полностью зарегистрированным**. Повторные входы выполняются либо по SMS‑коду, либо по паролю.

### Вход по SMS (OTP)

1. `POST /auth/request-otp` — отправка одноразового кода по телефону:
   - тело: `{"phone": "+7700..."}`;
   - действует rate limit по телефону и IP (Redis‑счётчики).
2. `POST /auth/verify-otp` — проверка кода:
   - тело: `{"phone": "...", "code": "123456"}`;
   - при успехе:
     - создаётся `User(role=guest, phone=...)`, если раньше не было записи;
     - возвращается `TokenOut { access_token, token_type="bearer" }`.

Фронтенд после этого делает `GET /auth/me` и, если `role == "guest"`, перенаправляет пользователя в онбординг (`/auth/onboarding` / экран выбора роли).

### Вход по паролю

- `POST /auth/login-password`:
  - тело: `{"phone": "...", "password": "..."}`;
  - используется для пользователей, у которых уже задан `password_hash`;
  - при неверных данных или отсутствии пароля возвращается 400 и увеличиваются счётчики попыток логина (Redis).
- Ограничения по частоте:
  - `_is_login_blocked` проверяет лимиты по телефону и IP;
  - `_register_login_failure` увеличивает счётчики и при превышении лимита возвращает 429.

### Установка и смена пароля

- `POST /auth/set-password`:
  - тело: `{"current_password": "...", "new_password": "..."}`.
- Правила:
  - если у текущего пользователя **нет** `password_hash` (гость после OTP или пользователь, который ещё не задавал пароль), достаточно передать только `new_password`;
  - если `password_hash` уже есть, `current_password` обязателен и должен совпадать с текущим паролем;
  - пароль валидируется через `_validate_user_password`:
    - минимальная длина `settings.user_password_min_length`;
    - должен содержать хотя бы одну букву и одну цифру.

Рекомендуемый сценарий «классической регистрации»:

1. Пользователь подтверждает номер через OTP (`request-otp` → `verify-otp`) и получает JWT.
2. Сразу после первой авторизации фронтенд предлагает задать пароль и вызывает `POST /auth/set-password` с `new_password`.
3. Далее пользователь может входить как по SMS‑коду, так и по телефону/паролю (`login-password`).

## Тесты

Из папки **backend**:

```bash
pytest tests/ -v
```

С отчётом покрытия:

```bash
pytest tests/ -v --cov=app
```

Отчёт в HTML: `backend/htmlcov/index.html`.

**Маркеры:**

- Тесты без маркера и с `@pytest.mark.unit` не требуют БД/Redis.
- Тесты с `@pytest.mark.integration` требуют запущенные **PostgreSQL и Redis** (например `docker compose -f docker/docker-compose.yml up -d` и корректный `DATABASE_URL` / `REDIS_URL` в `.env`).

Запуск только unit-тестов (без Docker):

```bash
pytest tests/ -v -m unit
```

Запуск только интеграционных:

```bash
pytest tests/ -v -m integration
```

**CI:** В GitHub Actions (`.github/workflows/tests.yml`) по умолчанию запускаются только unit-тесты бэкенда (без Docker). Интеграционные тесты нужно запускать локально или в CI с поднятыми PostgreSQL и Redis.

## Безопасность

- **Production:** обязательно задайте в `.env` надёжный `JWT_SECRET` и при использовании Staff portal — `STAFF_JWT_SECRET`. Не используйте значения по умолчанию из `config.py`.
- **Staff portal:** дефолтные `staff_default_login` / `staff_default_password` (admin/admin) предназначены только для разработки. В проде смените их или отключите дефолтного сотрудника после первого входа.
- Не коммитьте файл `.env` с реальными секретами; используйте `.env.example` как шаблон.
- Для `/health` и `/health/ready` можно задать `HEALTH_API_KEY`; тогда мониторинг должен отправлять заголовок `X-Health-API-Key`. Ответы всегда приходят с `Cache-Control: no-store`, поэтому их можно смело кэшировать только на уровне балансировщика.
- Если API развёрнуто за прокси или Ingress, заполните `TRUSTED_PROXIES` (через запятую). Только в этом случае читается `X-Forwarded-For`; иначе берётся IP непосредственного клиента.
- Сохранение истории LLM-чата работает только при `CHAT_STORE_ENABLED=true` и пользовательском `chat_storage_opt_in=true`. По умолчанию история не пишется и регион пользователя не передаётся в LLM.
- Все загрузки проходят через ClamAV. Убедитесь, что установлен `clamdscan` (или укажите путь в `CLAMAV_SCAN_COMMAND`). Если сканер недоступен, загрузки вернут 503.
