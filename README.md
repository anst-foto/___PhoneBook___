# `README.md` (в корне репозитория)

# PhoneBook

Демонстрационный full-stack проект «Телефонная книга»: REST API на ASP.NET Core (Minimal API) + PostgreSQL + React-фронтенд. Включает слой аудита DDL/DML на уровне БД, интеграционные тесты на реальном PostgreSQL и CI.

## Стек

| Слой | Технологии |
|---|---|
| Бэкенд | .NET 10, ASP.NET Core Minimal API, Dapper, Npgsql |
| БД | PostgreSQL 18 (`postgres:18-alpine`), pgAdmin 4 |
| Тесты | xUnit, Testcontainers.PostgreSql |
| Фронтенд | React 19, TypeScript (strict), Vite, Less |
| CI | GitHub Actions (`dotnet format`, `dotnet test`, Testcontainers) |
| Инструменты | Docker Compose, Central Package Management (`Directory.Packages.props`), `.editorconfig` |

## Структура репозитория

```
PhoneBook/
├── back/
│   └── src/
│       ├── PhoneBook.Lib/            # Репозиторий и модели (Dapper + Npgsql)
│       ├── PhoneBook.Lib.Test/       # xUnit + Testcontainers
│       └── PhoneBook.WebAPI/         # Minimal API, health-checks, .http-файл
├── front/                            # React + TS + Vite + Less
├── sql/
│   ├── 1_Add_log.sql                 # Аудит DDL/DML (требует superuser)
│   ├── 2_Add_tables.sql              # Таблицы + view_phones
│   ├── 3_Add_test_data.sql           # Демо-данные
│   └── init-scripts/
│       └── setup_analytics.sql       # pg_stat_statements (docker-entrypoint)
├── .github/workflows/ci.yml
├── Directory.Packages.props
├── docker-compose.yaml
├── PhoneBook.slnx
└── .env.example
```

## Требования

- .NET SDK **10.0**
- Node.js **20+** и npm
- Docker + Docker Compose
- `psql` (опционально, для накатывания SQL-скриптов)

## Быстрый старт

### 1. Переменные окружения

```bash
cp .env.example .env
```

Откройте `.env` и задайте надёжный `POSTGRES_PASSWORD` (и `PGADMIN_PASSWORD`). Значения `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PORT` можно оставить по умолчанию — они совпадают с `appsettings.json`.

### 2. Запуск базы данных

```bash
docker compose up -d postgres
```

При первом старте контейнер автоматически выполнит `sql/init-scripts/setup_analytics.sql` (создаст расширение `pg_stat_statements`).

pgAdmin (опционально):

```bash
docker compose up -d pgadmin
# http://localhost:5050 — логин/пароль из .env
```

### 3. Схема и демо-данные

Скрипты `1_*.sql`–`3_*.sql` накатываются **вручную** (в `init-scripts` они намеренно не лежат — аудит требует superuser-прав).

```bash
# Пароль подставьте из .env
export PGPASSWORD='<ваш POSTGRES_PASSWORD>'

psql -h localhost -p 5432 -U admin -d phonebook_db -f sql/1_Add_log.sql
psql -h localhost -p 5432 -U admin -d phonebook_db -f sql/2_Add_tables.sql
psql -h localhost -p 5432 -U admin -d phonebook_db -f sql/3_Add_test_data.sql
```

То же можно сделать через pgAdmin или выполнив файлы в IDE.

### 4. Бэкенд

Строка подключения по умолчанию в `back/src/PhoneBook.WebAPI/appsettings.json`:

```
Host=localhost;Port=5432;Database=phonebook_db;Username=admin;Password=1234
```

Пароль `1234` — **только для локальной разработки**. Надёжнее — переопределить через user secrets или переменную окружения, чтобы не коммитить секрет:

```bash
cd back/src/PhoneBook.WebAPI
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:PhoneBook" \
  "Host=localhost;Port=5432;Database=phonebook_db;Username=admin;Password=<ваш пароль>"

dotnet run
# → http://localhost:5126
```

Альтернатива — переменная окружения `ConnectionStrings__PhoneBook` (двойное подчёркивание — разделитель секций).

### 5. Фронтенд

```bash
cd front
npm install
npm run dev
# → http://localhost:5173
```

Vite проксирует `/api`, `/health`, `/ready` на `http://localhost:5126` (см. `front/vite.config.ts`), поэтому **CORS в бэкенде для разработки не нужен**. Для продакшн-развёртывания на отдельном хосте добавьте `AddCors`/`UseCors` в `Program.cs` (отдельный коммит).

## API

Базовый префикс: `http://localhost:5126`. Готовые запросы — в `back/src/PhoneBook.WebAPI/PhoneBook.WebAPI.http`.

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/phonebook` | Все записи (`view_phones`) |
| `POST` | `/api/phonebook` | Добавить запись |
| `GET` | `/health` | Liveness (процесс жив, БД не проверяется) |
| `GET` | `/ready` | Readiness (проверка PostgreSQL) |

### `GET /api/phonebook`

```http
GET /api/phonebook
Accept: application/json
```

```json
[
  { "id": 1, "name": "Анна Смирнова", "number": "+7-000-000-00-01" },
  { "id": 2, "name": "Иван Петров",   "number": "+7-000-000-00-03" }
]
```

### `POST /api/phonebook`

```http
POST /api/phonebook
Content-Type: application/json

{ "name": "Ada Lovelace", "phone": "+1-555-0100" }
```

`201 Created` → `Location: /api/phonebook/{id}`:

```json
{ "id": 4 }
```

`400 Bad Request` (валидация в `Program.cs` — оба поля обязательны):

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "name": ["Имя не может быть пустым."]
  }
}
```

### Health

```http
GET /health   → 200 { "status": "Healthy" }
GET /ready    → 200 { "status": "Healthy" }  # 503, если БД недоступна
```

## База данных

Схема в `sql/2_Add_tables.sql`:

- `table_persons(id, name)` — CHECK: `btrim(name) <> ''`
- `table_phones(id, person_id, number)` — FK на `table_persons` (`ON DELETE RESTRICT`), CHECK: `btrim(number) <> ''`
- `view_phones(id, name, number)` — представление для чтения (`table_phones JOIN table_persons`)

### Аудит (`sql/1_Add_log.sql`)

Схема `log` содержит:

- `table_ddl_logs` — DDL-события (event triggers на `ddl_command_end` и `sql_drop`)
- `table_dml_logs` — построчные `INSERT/UPDATE/DELETE` + `TRUNCATE`
- `schema_filter` — какие схемы аудитить (`include`/`exclude`)

Аудит **автоматически подключается** к новым и существующим таблицам. При наличии хотя бы одного `include` — журналируются только перечисленные схемы. По умолчанию: `log`, `information_schema`, `pg_catalog`, `pg_toast` исключены, всё остальное — включено.

## Тесты

```bash
cd back
dotnet test PhoneBook.slnx --configuration Release
```

`PostgresFixture` поднимает `postgres:18-alpine` через Testcontainers. **Docker должен быть запущен.** Перед каждым тестом схема пересоздаётся (`ResetDatabaseAsync`), тесты изолированы.

Покрытие — CRUD-сценарии `PhoneBookRepo`: пустая БД, добавление с триммингом, валидация пустых имени/телефона.

## CI

`.github/workflows/ci.yml` запускается на push/PR в `master` и `develop`:

- **format** — `dotnet format PhoneBook.slnx --verify-no-changes`
- **test** — `dotnet test` с Testcontainers + `XPlat Code Coverage`, артефакт `TestResults`

Docker-образ `postgres:18-alpine` кешируется между прогонами через `actions/cache`.

## Конфигурация

| Файл | Назначение |
|---|---|
| `.env` | Параметры `docker-compose` (БД, pgAdmin, ресурсы) |
| `appsettings.json` / `appsettings.Development.json` | Конфиг ASP.NET Core (`ConnectionStrings:PhoneBook`) |
| `back/src/PhoneBook.WebAPI/Properties/launchSettings.json` | Dev-порты (`http://localhost:5126`, `https://localhost:7002`) |
| `Directory.Packages.props` | Централизованные версии NuGet-пакетов |
| `.editorconfig` / `back/.editorconfig` | Стиль кода (C#, TS, JS, JSON, YAML, Less) |

## Известные ограничения

- Пароль `1234` в `appsettings.json` — плейсхолдер для локальной разработки, замените через user secrets.
- CORS в бэкенде не настроен: dev-режим опирается на Vite-прокси; для отдельного хоста фронта — добавьте `AddCors`/`UseCors`.
- `Solution2MD.exe` (~75 МБ) лежит в корне репозитория и не игнорируется `.gitignore` — кандидат на вынос в `tools/` и исключение из VCS.