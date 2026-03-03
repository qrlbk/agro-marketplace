# Мониторинг и проверка безопасности

Документ фиксирует результаты проверки по пунктам: IDOR, админка, rate-limiting, санитизация ввода, RLS, пароли и JWT.

---

## 1. IDOR (Insecure Direct Object Reference)

**Риск:** пользователь подставляет чужой ID в запросе и получает доступ к чужим данным.

**Проверено:**

| Эндпоинт | Проверка доступа |
|----------|-------------------|
| `GET/PATCH /orders/{order_id}` | Доступ только если `order.user_id == current_user.id` (покупатель), или `order.vendor_id == current_user.id`, или тот же vendor по компании, или `UserRole.admin`. |
| `GET/DELETE /garage/machines/{garage_id}` | В выборке всегда `Garage.user_id == current_user.id`. |
| `GET/PATCH /notifications/{notification_id}/read` | В выборке `Notification.user_id == current_user.id`. |
| `GET /chat/sessions/{session_id}/messages` | В выборке `ChatSession.user_id == current_user.id`. |
| `POST /feedback` с `order_id` | Проверка `order.user_id == current_user.id` перед привязкой заказа к обращению. |
| Товары, корзина, чекаут | Корзина и заказы привязаны к `current_user.id`; товары читаются по каталогу без привязки к пользователю. |

**Админские маршруты** (`/admin/*`): доступ к произвольным `user_id`, `order_id`, `company_id` по дизайну — только для пользователей с ролью админ или staff с нужным permission; все эндпоинты защищены через `require_admin_or_staff("...")` или `get_current_admin`.

**Рекомендация:** при добавлении новых эндпоинтов с ID в пути всегда фильтровать по владельцу (или по роли для админки).

---

## 2. Админка: проверка роли

**Риск:** в админку может зайти кто угодно.

**Проверено:**

- Все маршруты под префиксом `/admin` защищены зависимостями:
  - `require_admin_or_staff("permission_code")` — доступ есть у marketplace User с ролью `admin` или у Staff с указанной permission;
  - для категорий используется `get_current_admin` (только marketplace admin).
- Маршруты Staff portal (`/staff/*`) защищены `get_current_staff` или `get_current_staff_with_permission(...)`.

**Отдельных маршрутов без проверки роли/прав в админке и staff не обнаружено.**

---

## 3. Rate-limiting (защита от брутфорса)

**Проверено и настроено:**

| Эндпоинт / сценарий | Ограничение |
|----------------------|-------------|
| `POST /auth/request-otp` | По номеру телефона и по IP (окно и лимиты в `config`: `otp_rate_limit_per_phone`, `otp_rate_limit_per_ip`, `otp_rate_limit_window_seconds`). |
| `POST /auth/verify-otp` | Лимиты по телефону и IP + блокировка после N неудачных попыток (`otp_verify_max_attempts`, `otpfail` в Redis). |
| `POST /auth/demo-login` | Лимит по IP: `demo_login_rate_limit_per_ip` попыток за `demo_login_rate_limit_window_seconds` (по умолчанию 10 за 300 с). |
| Staff login | Лимиты по логину и по IP (`staff_login_rate_limit_per_login`, `staff_login_rate_limit_per_ip`, окно в секундах). |
| Чат | Лимит запросов в минуту по пользователю или IP (`check_chat_rate_limit`). |

**Рекомендация:** при добавлении новых эндпоинтов входа или чувствительных действий добавлять rate limit по IP и при необходимости по идентификатору пользователя.

---

## 4. Санитизация входящих данных

**Риск:** «что пришло, то ушло в БД» — управляющие символы, слишком длинные строки, потенциально опасные последовательности.

**Сделано:**

- Введён модуль `app.utils.sanitize`: `sanitize_text()` / `sanitize_text_required()`:
  - обрезка пробелов по краям;
  - нормализация Unicode (NFC);
  - удаление управляющих символов (C0, C1, DEL);
  - при необходимости ограничение длины строки.
- Санитизация перед записью в БД применена к:
  - профилю пользователя: имя (`PATCH /auth/me`);
  - обращению: тема, текст, контактный телефон (`POST /feedback`);
  - заказу: адрес доставки, комментарий (`POST /checkout`);
  - onboarding (`POST /auth/onboarding`): имя, company_name, legal_address, chairman_name, contact_name, bank_iik, bank_bik (auth.py);
  - товарам: имя, описание, composition, article_number (products.py);
  - категориям: name, slug при создании (categories.py);
  - шаблонам ответов обращений: name, body (admin.py);
  - сотрудникам и ролям Staff: имя сотрудника, имя и slug роли (staff.py).

**Рекомендация:** для всех новых текстовых полей от пользователя перед сохранением вызывать `sanitize_text(..., max_length=...)` с лимитом по схеме/колонке. SQL-инъекции исключены за счёт ORM (параметризованные запросы).

---

## 5. RLS (Row Level Security)

**Текущее состояние:** в проекте **RLS в PostgreSQL не настраивается**. Разграничение доступа к строкам выполняется только на уровне приложения (проверки `current_user.id`, ролей и прав в эндпоинтах).

**Риск:** при ошибке в коде или обходе API (например, прямой доступ к БД) возможен доступ к чужим строкам.

**Рекомендация:** для повышения защиты в будущем рассмотреть включение RLS по таблицам (users, orders, notifications, feedback и т.д.) с политиками по `user_id` / `vendor_id` / `company_id`. Текущая реализация полагается на корректность проверок в API.

---

## 6. Пароли и JWT

**Пароли:**

- **Marketplace users:** входа по паролю нет; используется только OTP по телефону. Демо-логин сравнивает пароль с константой в коде (только при включённом демо и не в prod).
- **Staff:** пароли хранятся в виде хэша (bcrypt) в поле `staff.password_hash`; при логине проверка через `pwd_ctx.verify(password, staff.password_hash)`. В БД и в логах пароли не пишутся.

**JWT:**

- В payload маркетплейсного токена передаются только `sub` (user_id), `role`, `phone`, `exp`, `iss`. **Паролей и хэшей в JWT нет.**
- В payload staff-токена: `sub` (staff_id), `exp`, `permissions`, `iss`. **Паролей и хэшей в JWT нет.**

**Рекомендация:** при любом изменении формата JWT проверять, что в payload не попадают пароль, хэш пароля или иные секреты.

---

## Security headers

Backend выставляет следующие заголовки ответа (middleware в `app/main.py`):

| Заголовок | Значение по умолчанию | Назначение |
|-----------|------------------------|------------|
| `X-Content-Type-Options` | `nosniff` | Запрет MIME-sniffing. |
| `X-Frame-Options` | `DENY` | Запрет встраивания в iframe. |
| `X-XSS-Protection` | `0` | Отключение устаревшего XSS-фильтра браузера. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Ограничение данных в Referer. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Отключение доступа к устройствам. |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` | Для чистого JSON API: запрет загрузки ресурсов и встраивания. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Только при HTTPS. |

**CSP:** текущая политика рассчитана на API, отдающий только JSON. Если тот же бэкенд начнёт отдавать HTML-страницы (например, админка или статика с инлайновыми скриптами), политику нужно пересмотреть и при необходимости задать через `SECURITY_CSP_HEADER` в `.env`.

**Настраиваемость:** строка CSP задаётся в `backend/app/config.py` (`security_csp_header`); по умолчанию — значение выше. Для stage/prod при необходимости можно ослабить или ужесточить политику без правки кода.

---

## Чек-лист при добавлении нового функционала

- [ ] Эндпоинты с ID в пути: проверка владельца или прав (admin/staff).
- [ ] Админские/Staff маршруты: зависимость `require_admin_or_staff(...)` или `get_current_staff_with_permission(...)`.
- [ ] Логин/регистрация/критичные действия: rate limit по IP (и при необходимости по пользователю).
- [ ] Текстовые поля от пользователя: санитизация через `sanitize_text` с ограничением длины перед записью в БД.
- [ ] JWT и ответы API: не возвращать и не класть в токен пароли, хэши, внутренние ошибки.

---

## 7. Мониторинг безопасности (проверка на баги)

**Дата проверки:** 2025-02-26.

### Найденные и исправленные уязвимости

| Проблема | Риск | Статус |
|----------|------|--------|
| **GET /health/openai без аутентификации** | Раскрытие информации: наличие OPENAI_API_KEY, сообщения об ошибках API, имя модели. Доступен любому без заголовка. | **Исправлено:** эндпоинт защищён через `_require_health_api_key(request)` так же, как `/health` и `/health/ready`. При заданном `HEALTH_API_KEY` требуется заголовок `x-health-api-key`. |

### Проверено, уязвимостей не обнаружено

- **IDOR:** заказы, чат-сессии, уведомления, feedback — везде проверка владельца или прав.
- **SQL-инъекции:** везде ORM/SQLAlchemy с параметрами; в admin audit fallback используется `text()` с `params` (без конкатенации строк).
- **Загрузка файлов (vendor):** имя файла не подставляется в путь — используется `uuid4().hex + ext`; расширение проверяется по whitelist; есть проверка MIME и опционально ClamAV.
- **JWT:** алгоритм из конфига (HS256), issuer различает marketplace и staff; `sub` приводится к int безопасно.
- **Вебхук 1C:** защищён `verify_webhook_1c_key` (X-API-Key).
- **XSS (фронт):** не найдено использования `dangerouslySetInnerHTML` / `innerHTML` / `eval`.
- **Админка и Staff:** все маршруты с зависимостями по роли/правам; категории POST/DELETE только для `get_current_admin`.

### Рекомендации для мониторинга

- В продакшене задавать `HEALTH_API_KEY` и не открывать `/health*` наружу без ключа (или закрыть их файрволом).
- Не использовать алгоритм JWT `none`; оставлять `jwt_algorithm` в whitelist (например, только HS256).
- При добавлении новых эндпоинтов с ID в path — сразу добавлять проверку владельца или прав в чек-лист выше.

---

## 8. Аудит аутентификации и авторизации (детальный разбор)

**Дата проверки:** 2025-03-03.

### 8.1 Эндпоинты аутентификации (auth.py)

| Эндпоинт | Защита | Замечания |
|----------|--------|-----------|
| `POST /auth/request-otp` | Rate limit по телефону и IP | ОК. |
| `POST /auth/verify-otp` | Rate limit + блокировка после N неудачных попыток, OTP сравнивается через `hmac.compare_digest` | ОК. |
| `POST /auth/demo-login` | 404 в prod, rate limit по IP, пароль сравнивается с константой из настроек | ОК при DEMO_AUTH_ENABLED=false в prod. |
| `POST /auth/login-password` | Rate limit (is_login_blocked), bcrypt через `pwd_ctx.verify`, аудит при неудаче | ОК. |
| `POST /auth/refresh` | JWT проверяется с `refresh_secret()`, issuer, type=refresh, blacklist по jti, после выдачи refresh ротируется (jti blacklist) | ОК. |
| `POST /auth/logout` | Опционально: blacklist access jti (Bearer) и/или refresh (body), `verify_iss: False` только для приёма обоих типов токенов при инвалидации; секрет и алгоритм проверяются | ОК. |

**Пароли:** Marketplace users — опциональный `password_hash` (bcrypt, CryptContext); при смене пароля проверяется текущий. Staff — отдельная модель с `password_hash` (проверка в staff login). В JWT пароли и хэши не передаются.

### 8.2 Токены (services/auth/tokens.py)

- Access: `sub`, `role`, `phone`, `iat`, `exp`, `iss`, `jti`; при `jwt_bind_ip` добавляется `ip_hash` (SHA-256, первые 32 hex). Алгоритм из конфига (HS256), отдельный `jwt_secret`.
- Refresh: отдельный секрет `jwt_refresh_secret` (fallback на jwt_secret), тип `refresh`, срок из `jwt_refresh_expire_days`. Подпись и алгоритм проверяются при decode.
- Риск: при пустом `jwt_refresh_secret` в dev используется тот же секрет, что и для access — в prod `validate_secrets()` требует отдельный JWT_REFRESH_SECRET.

### 8.3 Зависимости (dependencies.py)

- `get_current_user_optional` / `get_current_user`: JWT с issuer `marketplace`, проверка blacklist по jti, при `jwt_bind_ip` — сравнение ip_hash с текущим IP. `user_id` из payload приводится к int при запросе к БД; подстановка в `SET LOCAL app.current_user_id` использует только целое (user.id или -1), не пользовательский ввод — инъекция исключена.
- `get_current_staff`: отдельный секрет (staff_jwt_secret или fallback jwt_secret), issuer `staff-portal`, blacklist, проверка is_active.
- `get_current_admin`: только User с role=admin.
- `require_admin_or_staff(permission_code)`: либо User admin, либо Staff с данным permission; super_admin bypass.
- `get_current_staff_with_permission` / `get_current_staff_with_any_permission`: проверка по кодам прав роли.

**IP для rate limit и audit:** `get_real_ip` учитывает `X-Forwarded-For` только если прямой client в `TRUSTED_PROXIES`; иначе используется direct client — подмена X-Forwarded-For не принимается без доверенного прокси.

### 8.4 Staff и Admin роуты

- Все маршруты в `routers/staff.py` используют `get_current_staff` или `get_current_staff_with_permission` / `get_current_staff_with_any_permission`. Публичен только эндпоинт входа (логин/пароль).
- Все маршруты в `routers/admin.py` используют `require_admin_or_staff("...")` с указанием кода права.
- Категории (create/delete) в `routers/categories.py` защищены `get_current_admin`; list/tree — публичное чтение.

### 8.5 Blacklist (token_blacklist.py)

- Redis ключ `jwt_blacklist:{jti}`, TTL = оставшееся время жизни токена. При `jwt_blacklist_enabled=False` blacklist не используется — токены до истечения срока остаются валидными. Рекомендация: в prod держать `jwt_blacklist_enabled=true` и обеспечивать доступность Redis.

### 8.6 Выводы

- Уязвимостей в логике аутентификации/авторизации не выявлено. Алгоритм JWT задаётся конфигом (рекомендуется whitelist только HS256). Секреты валидируются в `config.validate_secrets()` для prod/stage.

---

## 9. Обработка пользовательского ввода и загрузки файлов

**Дата проверки:** 2025-03-03.

### 9.1 Санитизация текста (app/utils/sanitize.py)

- `sanitize_text` / `sanitize_text_required`: обрезка пробелов, нормализация NFC, удаление управляющих символов (C0, C1, DEL), опциональное ограничение длины по символам. Не выполняет HTML-экранирование (предполагается вывод через API/фронт).
- `validate_image_url` / `sanitize_image_urls`: блокировка javascript:, data:text/html, vbscript:; разрешены относительные пути `/uploads/` и HTTPS (плюс localhost для dev).

**Где применено:**

| Место | Поля | Статус |
|-------|------|--------|
| `auth.py` PATCH /me | name | sanitize_text(..., max_length=255) |
| `feedback.py` POST /feedback | subject, message, contact_phone | sanitize_text_required / sanitize_text с лимитами |
| `checkout.py` POST /checkout | delivery_address, comment | sanitize_text(..., max_length=512/1024) |
| `products.py` | images (URLs) | sanitize_image_urls |

**Рекомендация:** перед записью в БД применять sanitize_text с max_length к полям onboarding (company_name, legal_address, chairman_name, contact_name, bank_iik, bank_bik в auth.py), к имени/описанию товара в products, к name/slug в categories (админка), к name/body в reply-templates и к полям имени в staff (employee, role). Сейчас часть полей только обрезается по strip() без удаления управляющих символов и без жёсткого лимита длины.

### 9.2 Загрузки файлов (vendor_upload.py)

- **Изображения товаров:** расширение только из whitelist (.jpg, .jpeg, .png, .webp, .gif); MIME проверяется по содержимому (python-magic); размер до MAX_IMAGE_MB; имя файла на диске — `uuid4().hex + ext`, путь не содержит пользовательского ввода (нет path traversal). Квота хранилища проверяется до записи; при превышении — 413 и запись в аудит.
- **Прайс-листы (Excel):** только .xlsx/.xls; MIME по содержимому; размер до MAX_MB; при включённом ClamAV — сканирование контента перед обработкой.
- **ClamAV:** при `CLAMAV_SCAN_COMMAND` пустом загрузки не блокируются (ClamAV просто не вызывается); при заданной команде — subprocess с shlex.split, при returncode 1 файл удаляется и возвращается 400. В production рекомендуется задавать `CLAMAV_SCAN_COMMAND` (например, `clamdscan`) и обеспечивать доступность антивируса; квоту `VENDOR_STORAGE_QUOTA_MB` задавать по политике хранилища (см. также README).
- **Rate limit:** upload_image 30/60 с, upload_pricelist 5/60 с по IP.

### 9.3 Квоты (storage_quota.py)

- `ensure_storage_quota(current_usage_mb, quota_mb, addition_mb)` вызывается перед записью файла; при превышении лимита — HTTP 413, аудит `storage_quota_exceeded`. Обновление `company.storage_used_mb` выполняется после успешной проверки.

### 9.4 Чат (chat_assistant.py)

- `sanitize_user_message`: ограничение длины (1000 символов), замена типичных фраз prompt-injection на пробел, маскирование телефонов/BIN/координат перед отправкой в LLM. Сообщение пользователя перед вызовом LLM проходит через эту функцию.

---

## 10. База данных, миграции и RLS

**Дата проверки:** 2025-03-03.

### 10.1 Подключение и сессия (database.py)

- Движок создаётся из `settings.database_url` (asyncpg). В проде рекомендуется использовать SSL (sslmode=require в URL).
- При открытии сессии в `get_db()` выполняется `SET LOCAL app.current_user_id = -1` (константа RLS_DEFAULT_USER_ID). После аутентификации в `get_current_user_optional` выполняется `SET LOCAL app.current_user_id = {uid}`, где `uid` — целое число (user.id или -1), не пользовательский ввод — риск SQL-инъекции отсутствует.

### 10.2 Миграция 008 (staff, roles, permissions)

- Создание таблиц permissions, roles, role_permissions, staff. Вставки выполняются через параметризованные запросы (`:code`, `:name`, `:login`, `:password_hash` и т.д.) — инъекции нет.
- Первый сотрудник (Super Admin) создаётся из переменных окружения `STAFF_DEFAULT_LOGIN` и `STAFF_DEFAULT_PASSWORD`; при их отсутствии миграция падает с RuntimeError. Жёстко зашитых паролей в коде нет. В prod необходимо задать надёжный пароль до первого запуска миграций.

### 10.3 Миграция 021 (password_hash у users)

- Добавляется nullable колонка `password_hash` в таблицу users. Миграций данных нет, дефолтные пароли не задаются.

### 10.4 Миграции 022 и 023 (RLS)

- **022:** включается RLS на таблицах orders, notifications, cart_items, feedback_tickets; политики с `USING (true)` (разрешают всё — временный шаг).
- **023:** политики заменены на фильтрацию по `current_setting('app.current_user_id', true)::int = user_id`. Имена таблиц и выражение политики заданы константами в коде, пользовательский ввод не подставляется.
- В текущей реализации приложение при каждом запросе выставляет `app.current_user_id` (в dependencies после проверки JWT). В документации указано, что RLS в проде пока не включается; разграничение выполняется на уровне API. Если в будущем RLS будет включён, необходимо убедиться, что роль приложения в БД не является владельцем таблиц (иначе RLS не применяется к владельцу).

### 10.5 Alembic (env.py)

- URL для миграций получается из settings с заменой драйвера на psycopg2 (sync). Секреты не логируются. Подключение к БД выполняется в рамках миграции под учётной записью, имеющей права на DDL.

---

## 11. Frontend: хранение токенов и auth-флоу

**Дата проверки:** 2025-03-03.

### 11.1 API-клиент (core.ts)

- Базовый URL: `import.meta.env.VITE_API_URL ?? "/api"` — в сборку не попадают секреты сервера, только публичный URL API.
- Запросы: заголовок `Authorization: Bearer ${token}` передаётся при вызове `request(..., { token })`. При 401 и наличии токена вызывается `authRefresher` или `staffAuthRefresher`; при успешном обновлении запрос повторяется один раз (`_retried: true`).

### 11.2 Клиентское приложение (useAuth, RequireAuth)

- Токены хранятся в **localStorage**: ключи `agro_token`, `agro_refresh_token`. При загрузке проверяется только срок действия по полю `exp` в payload (без верификации подписи); истёкший токен удаляется.
- Refresh: при 401 core вызывает зарегистрированный authRefresher, который читает refresh из localStorage, вызывает POST /auth/refresh и сохраняет новую пару токенов.
- `RequireAuth`: при отсутствии пользователя выполняется редирект на `/login` с сохранением `location` в state. `RequireOnboardingDone`: при роли guest — редирект на `/onboarding`. Итоговая авторизация выполняется на backend; клиент лишь скрывает UI и перенаправляет неавторизованных.

**Риск:** хранение токенов в localStorage уязвимо к XSS: при выполнении чужого скрипта токены могут быть прочитаны. Рекомендация: по возможности перейти на HttpOnly cookie для refresh/access при условии настройки CORS и SameSite на backend.

### 11.3 Staff portal (StaffAuthContext, routes)

- Токены Staff: **localStorage** `staff_token`, `staff_refresh_token`. Отдельный refresher регистрируется в core (`setStaffAuthRefresher`); при 401 для запросов с staff-токеном используется он.
- Демо-режим: при `import.meta.env.DEV && VITE_SHOW_DEMO === "true"` и недоступности API логин admin/admin записывает в localStorage фейковый маркер `__staff_demo__`; для вызовов /admin/* в демо используется основной `agro_token`. В production build демо не подставляется.
- Маршруты: `/staff/login` доступен без авторизации; все остальные пути под `path="*"` обёрнуты в `RequireStaff` (редирект на `/staff/login` при отсутствии staff). Для страниц с ограничением по правам используется `RequireStaffPermission(permission)` — редирект на первый разрешённый путь при отсутствии права. Проверка прав на backend остаётся обязательной; клиент лишь скрывает пункты меню и маршруты.

### 11.4 XSS

- Поиск по коду: использования `dangerouslySetInnerHTML`, `innerHTML`, `eval(` в `frontend/src` не найдено. Отображение данных с API идёт через React (экранирование по умолчанию).

---

## 12. Инфраструктура, Docker и CI/CD

**Дата проверки:** 2025-03-03.

### 12.1 Backend Dockerfile

- Базовый образ: `python:3.11-slim` (двухэтапная сборка: builder устанавливает зависимости, финальный образ копирует site-packages и код). Секреты в образ не зашиваются; переменные окружения задаются при запуске контейнера.
- `COPY . .` копирует всё дерево контекста сборки. В проекте нет `.dockerignore` — при наличии файла `.env` в каталоге backend он может попасть в образ. Рекомендация: добавить `.dockerignore` с исключением `.env`, `__pycache__`, `.venv`, `.git`, `*.pyc`, `tests`, `.pytest_cache`, `*.md`.
- Контейнер запускается от root (USER не задан). Для ужесточения в проде можно создать непривилегированного пользователя и переключиться на него перед CMD.
- EXPOSE 8000; приложение слушает 0.0.0.0:8000.

### 12.2 Frontend Dockerfile

- Сборка: `node:20-alpine`, сборка через `npm run build` с `ARG VITE_API_URL=/api`. Итоговый образ: `nginx:alpine`, раздача статики из `/usr/share/nginx/html`. В образ попадает только результат сборки; в коде фронтенда могут быть запечены только `VITE_*` переменные, использованные при build (например, `VITE_API_URL`). Секреты API не должны быть в `VITE_*` — только публичный URL.
- Nginx по умолчанию слушает 80 и может работать от root. При необходимости — отдельный пользователь и ограничение прав.

### 12.3 docker-compose.yml (docker/)

- Сервисы: Postgres 15 (пользователь/пароль agro/agro, порт 5433), Redis 7 (порт 6380). Пароль Redis не задан — типично для локальной разработки.
- Рекомендация: этот compose предназначен для локальной разработки; в production не использовать те же учётные данные и не экспонировать порты БД/Redis наружу без необходимости. Для prod использовать отдельный compose или оркестратор с секретами из внешнего хранилища.

### 12.4 GitHub Actions (tests.yml)

- Запуск: push/PR на main/master. Backend: unit-тесты с `pytest -m unit`; в `env` заданы фиксированные значения: `STAFF_JWT_SECRET`, `JWT_SECRET`, `WEBHOOK_1C_API_KEY` (не GitHub Secrets), `LLM_FEATURES_ENABLED: "false"` — ключ OpenAI не требуется. Секреты production в workflow не подставляются; утечки прод-ключей через логи при таком подходе нет.
- Frontend: `npm ci`, `npm run build`, `npm run test:run`. Секреты не передаются.
- Рекомендация: для усиления безопасности в CI можно добавить шаги: `pip-audit` / `npm audit` (SCA), Bandit или Semgrep для Python (SAST), при необходимости — сканирование образа Docker на уязвимости.

---

## 13. Анализ зависимостей и статический анализ (SCA/SAST)

**Дата проверки:** 2025-03-03.

### 13.1 Backend (Python)

- **pip-audit:** при запуске в текущем окружении возникла ошибка разрешения зависимостей (conflict pytest/requirements); в изолированном venv проекта рекомендуется выполнять `pip-audit -r requirements.txt` регулярно и в CI.
- **Bandit:** выполнен `bandit -r app -ll`. Обнаружены срабатывания **B104 (hardcoded_bind_all_interfaces)** в местах вида `get_client_ip(request) or "0.0.0.0"` — это не привязка сокета, а подстановка строки по умолчанию для ключа rate-limit при отсутствии IP. Риск безопасности отсутствует; при желании можно заменить на константу с другим именем или добавить `# nosec B104` с пояснением. Остальные предупреждения Bandit (Low/Medium) — по усмотрению команды (например, assert в тестах).

### 13.2 Frontend (npm)

- **npm audit:** выявлено 7 уязвимостей (5 moderate, 2 high):
  - **esbuild** (moderate): уязвимость в dev-сервере (GHSA-67mh-4wv8-2f99); затронуты vite, vitest, @vitest/coverage-v8. Исправление через `npm audit fix --force` ведёт к переходу на vite 7 (breaking change). Для production-сборки риск ниже, так как в образ попадает только статика; dev-сервер не должен быть доступен извне.
  - **minimatch** (high): ReDoS в определённых паттернах. Рекомендуется `npm audit fix` (без --force), если не ломает сборку.
  - **rollup** (high): path traversal (GHSA-mw96-cpmx-2vgc). Обновление через зависимости Vite; после выхода патча обновить vite/rollup.
- Рекомендация: включить `npm audit` в CI (например, с `--audit-level=high` и fail при high/critical); по возможности обновлять зависимости в рамках допустимых мажорных версий.

---

## 14. Динамическое тестирование и итоговая сводка

**Дата проверки:** 2025-03-03.

### 14.1 Покрытие существующими автотестами

В репозитории уже есть тесты, затрагивающие безопасность:

| Область | Тесты | Что проверяют |
|---------|-------|-------------------------------|
| Auth | test_auth.py | 401 при невалидном/истёкшем JWT; успешный demo-login и login-password; refresh выдаёт новую пару; marketplace-токен отклоняется staff-эндпоинтом; JWT не содержит пароля/хэша; set-password устанавливает хэш. |
| Admin | test_admin.py, test_admin_auth.py | 403 при токене farmer; 200 при токене admin; dashboard требует аутентификации. |
| Orders | test_orders.py | Список заказов требует auth; farmer видит только свои; GET order по id: разрешён владельцу, 403 для чужого, 404 для несуществующего; смена статуса разрешена vendor, запрещена farmer. |
| Cart/Checkout | test_cart.py, test_checkout.py | Корзина требует auth; checkout с пустой корзиной/недостатком товара/невалидным телом возвращает ошибки; успешный checkout создаёт заказы и уменьшает остатки. |
| Health | test_health.py | Формат ответа health; наличие security headers. |
| Storage/ClamAV | test_storage_quota.py, test_clamav_scan.py | Квота: разрешено в лимите, 413 при превышении; ClamAV: обнаружение malware, обработка недоступности. |
| Chat/Privacy | test_chat_privacy.py | Маскирование телефона/BIN/координат; извлечение реального IP при доверенном прокси. |

Эти тесты подтверждают проверки доступа (IDOR по заказам, разграничение admin/farmer/vendor) и часть auth-флоу. Рекомендуется сохранять и расширять их при добавлении новых эндпоинтов.

### 14.2 Рекомендуемые ручные/полуавтоматические проверки

- **Auth:** полный сценарий OTP (request → verify) с реальным или мокнутым SMS; logout и повторное использование refresh после blacklist (ожидается 401); при включённом jwt_bind_ip — смена IP после выдачи токена (ожидается отказ).
- **IDOR:** запросы к `/orders/{id}`, `/notifications/{id}`, `/chat/sessions/{id}/messages` с токеном другого пользователя — ожидается 403/404.
- **Загрузки:** загрузка файла с расширением из whitelist и подменённым MIME; попытка path traversal в имени; превышение квоты (ожидается 413).
- **Вебхук 1C:** запрос без X-API-Key и с неверным ключом — 401; при необходимости — проверка повторной обработки одного и того же payload (replay).
- **Health:** доступ к `/health`, `/health/ready`, `/health/openai` без заголовка x-health-api-key при заданном HEALTH_API_KEY — ожидается 401.

При появлении доступа к тестовому/stage окружению можно добавить в CI интеграционные тесты с реальной БД/Redis и вышеуказанными сценариями.

### 14.3 Сводная таблица результатов аудита

| Категория | Статус | Замечания |
|-----------|--------|-----------|
| Модель угроз | Выполнено | Документ docs/THREAT_MODEL.md создан. |
| Конфиг и секреты | Проверено | validate_secrets() в prod; .env.example без секретов. Рекомендация: .dockerignore. |
| Auth/авторизация backend | Проверено | JWT, blacklist, staff/admin зависимости, rate limit — без выявленных уязвимостей. |
| Ввод и загрузки | Проверено | Санитизация в части эндпоинтов; расширить на onboarding, products, categories, staff. ClamAV и квоты настроены. |
| БД и RLS | Проверено | Миграции 008, 021, 022, 023 без инъекций; RLS не включён в проде. |
| Frontend auth | Проверено | Токены в localStorage; XSS-риск; маршруты staff защищены RequireStaff/RequireStaffPermission. |
| Инфраструктура и CI | Проверено | В образы не попадают секреты; CI использует тестовые секреты. Рекомендация: SCA/SAST в CI. |
| SCA/SAST | Выполнено | npm audit: 7 уязвимостей (minimatch, rollup, esbuild); Bandit: B104 false positive. pip-audit — запускать в venv. |
| Динамические тесты | Частично | Существующие тесты покрывают auth, IDOR по заказам, квоты, ClamAV. Ручные сценарии описаны в п. 14.2. |

---

## 15. Внедрённые улучшения (по плану THREAT_MODEL / SECURITY_AUDIT)

**Дата:** 2025-03-03.

- **A.1** Добавлен `backend/.dockerignore`: исключены `.env`, `.env.*`, `__pycache__`, `.venv`, `.git`, тесты, кэши, `*.md` — секреты и артефакты не попадают в Docker-образ.
- **B.1** Расширена санитизация: onboarding (auth.py), товары (products.py), категории (categories.py), шаблоны ответов (admin.py), сотрудники и роли (staff.py) — перед записью в БД вызывается `sanitize_text` / `sanitize_text_required` с ограничением длины.
- **B.2** В README и разделе 9.2 настоящего документа зафиксировано: в production рекомендуется задавать `CLAMAV_SCAN_COMMAND` и квоту `VENDOR_STORAGE_QUOTA_MB`.
- **C.3** Проверены `app.services.sms` и `app.services.llm_logging`: API-ключи, телефоны и содержимое промптов в логи не выводятся; в llm_logging пишутся только метаданные вызовов (type, model, duration, usage).
- **D.2** В README добавлена рекомендация по SSL в production: `DATABASE_URL` с `sslmode=require`, `REDIS_URL=rediss://...`.
- **E.1** В backend Dockerfile контейнер запускается от непривилегированного пользователя `appuser`; владение на `/app` и каталог `uploads` назначено этому пользователю.
- **E.2** В CI (GitHub Actions) добавлены шаги: для backend — `pip-audit -r requirements.txt` и `bandit -r app -ll -c bandit.yaml` (B104 отключён в bandit.yaml как false positive); для frontend — `npm audit --audit-level=high`.
- **E.3** Выполнен `npm audit fix` для frontend (без `--force`); оставшиеся уязвимости в цепочке esbuild/vite/vitest требуют обновления с breaking change.
