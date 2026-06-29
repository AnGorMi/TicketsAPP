# Учёт внутренних заявок (FastAPI + React)

Небольшое fullstack-приложение для учёта внутренних заявок — тестовое задание.

- **Backend:** Python + FastAPI + SQLAlchemy 2.0, база данных SQLite.
- **Frontend:** React + TypeScript (Vite), один экран.
- Поиск, фильтрация, сортировка и пагинация выполняются **на backend**.

---

## Структура репозитория

```
.
├─ backend/                 # FastAPI + SQLAlchemy + SQLite
│  ├─ app/
│  │  ├─ config.py          # настройки (env): SECRET_KEY, TTL токена, креды админа, путь к БД
│  │  ├─ database.py        # engine, сессии, Unicode-aware lower() для SQLite
│  │  ├─ models.py          # ORM-модель Ticket + перечисления статуса/приоритета
│  │  ├─ schemas.py         # Pydantic-схемы и валидация
│  │  ├─ security.py        # выпуск/проверка JWT
│  │  ├─ deps.py            # зависимость require_admin
│  │  ├─ crud.py            # вся работа с БД и бизнес-правила
│  │  ├─ seed.py            # демо-данные при первом старте
│  │  ├─ main.py            # сборка приложения, CORS, обработчики ошибок
│  │  └─ routers/           # auth.py (логин), tickets.py (CRUD + список)
│  ├─ tests/                # pytest: валидация, фильтры, бизнес-правила, авторизация
│  ├─ requirements.txt
│  └─ requirements-dev.txt  # + pytest, httpx
├─ frontend/                # Vite + React + TypeScript
│  ├─ src/
│  │  ├─ types.ts           # типы Ticket, enum, ответ списка
│  │  ├─ api.ts             # http-клиент + методы API + ApiError
│  │  ├─ format.ts          # форматирование дат (UTC → локальное время)
│  │  ├─ App.tsx            # экран: состояние, загрузка данных, операции
│  │  └─ components/        # Toolbar, TicketTable, CreateTicketForm, Pagination, LoginDialog
│  └─ package.json
├─ PLAN.md                  # исходный план реализации
└─ README.md
```

---

## Быстрый старт

Нужны **Python 3.11+** и **Node.js 18+**. Запускаются два процесса: backend и frontend.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend поднимется на `http://localhost:8000`.
- Документация Swagger: `http://localhost:8000/docs`
- При первом старте создаётся `app.db` и наполняется демо-заявками.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend поднимется на `http://localhost:5173` (этот origin разрешён в CORS backend).

> Если backend нужен на другом адресе — задайте `VITE_API_URL`
> (например, в `frontend/.env`: `VITE_API_URL=http://localhost:8000`).

---

## Модель данных (Ticket)

| Поле | Тип | Правило |
|------|-----|---------|
| `id` | int | уникальный идентификатор |
| `title` | str | обязательное, 3–120 символов |
| `description` | str \| null | необязательное, ≤ 1000 символов |
| `status` | enum | `new` \| `in_progress` \| `done` (по умолчанию `new`) |
| `priority` | enum | `low` \| `normal` \| `high` (по умолчанию `normal`) |
| `created_at` | datetime (UTC) | проставляется при создании |
| `updated_at` | datetime (UTC) | обновляется при каждом изменении |

Даты хранятся в UTC и отдаются в ISO-формате с суффиксом `Z`.

---

## API

Базовый префикс `/api`.

| Метод | Путь | Доступ | Назначение |
|-------|------|--------|-----------|
| POST | `/api/auth/login` | public | вход `admin:admin` → `{ access_token }` |
| GET | `/api/tickets` | public | список с фильтрами/поиском/сортировкой/пагинацией |
| POST | `/api/tickets` | public | создать заявку |
| GET | `/api/tickets/{id}` | public | одна заявка |
| PATCH | `/api/tickets/{id}/status` | public | сменить статус |
| DELETE | `/api/tickets/{id}` | **admin** | удалить заявку |

### Параметры `GET /api/tickets`

| Параметр | Значения | По умолчанию |
|----------|----------|--------------|
| `status` | `new` \| `in_progress` \| `done` | — (все) |
| `priority` | `low` \| `normal` \| `high` | — (все) |
| `search` | подстрока по `title` ИЛИ `description`, регистронезависимо (в т.ч. кириллица) | — |
| `sort_by` | `created_at` \| `priority` | `created_at` |
| `order` | `asc` \| `desc` | `desc` |
| `page` | ≥ 1 | 1 |
| `page_size` | 1–100 | 20 (фронтенд использует 10) |

Ответ:
```json
{ "items": [ /* Ticket[] */ ], "total": 123, "page": 1, "page_size": 20, "pages": 7 }
```

> Сортировка по приоритету идёт по логическому порядку `low < normal < high`
> (через `CASE` в SQL), а не по алфавиту.

### Пример

```bash
curl "http://localhost:8000/api/tickets?status=new&priority=high&sort_by=priority&order=desc&page=1"

# логин и удаление (только админ)
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -X DELETE http://localhost:8000/api/tickets/1 -H "Authorization: Bearer $TOKEN"
```

---

## Бизнес-правила

Проверяются на backend (в `crud.py`), чтобы их нельзя было обойти с фронтенда:

1. `title` — 3–120 символов (пустой/из пробелов отклоняется), `description` — ≤ 1000.
2. Заявку в статусе `done` **нельзя редактировать или удалять** → `409 Conflict`.
3. Перевод из `done` обратно в другой статус запрещён (покрывается правилом 2) → `409`.
4. Удаление доступно **только администратору** (`admin:admin`) → без токена `401`.
5. Любое нарушение возвращает осмысленный HTTP-код и понятное сообщение в поле `detail`.

Коды ошибок: `404` — заявка не найдена; `409` — нарушение бизнес-правила;
`422` — ошибка валидации; `401` — нет/невалидный токен администратора.

### Авторизация

`POST /api/auth/login` проверяет креды (по умолчанию `admin:admin`) и выдаёт JWT.
Токен передаётся в `Authorization: Bearer <token>` и требуется только для удаления.
Креды и секрет настраиваются через переменные окружения (см. `backend/.env.example`).

---

## Frontend (один экран)

- Таблица заявок; смена статуса прямо из строки (select), у завершённых — заблокирована.
- Строка поиска (с debounce), фильтры по статусу и приоритету, выбор сортировки и порядка.
- Форма создания заявки с клиентской и серверной валидацией.
- Вход администратора; кнопки удаления видны и активны только админу
  (и заблокированы для заявок в статусе `done`).
- Пагинация.
- Состояния: **загрузка**, **пустой список** (отдельно для «нет заявок» и
  «ничего не найдено по фильтрам»), **ошибка API** (с кнопкой «Повторить»).

Дизайн намеренно минимальный — по ТЗ он не оценивается.

---

## Тесты (backend)

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest          # из каталога backend
```

Покрыто: создание и валидация, фильтрация/поиск/сортировка/пагинация,
бизнес-правила (запрет изменения/удаления `done`), авторизация и удаление админом.

---

## Переменные окружения backend

См. `backend/.env.example`. Все значения имеют разумные дефолты, поэтому
для запуска `.env` не обязателен.

| Переменная | По умолчанию | Назначение |
|------------|--------------|-----------|
| `SECRET_KEY` | `change-me-in-prod` | секрет для подписи JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | время жизни токена |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / `admin` | креды администратора |
| `DATABASE_URL` | `sqlite:///./app.db` | строка подключения к БД |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | разрешённый origin для CORS |
