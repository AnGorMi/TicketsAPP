# План реализации — Учёт внутренних заявок (FastAPI + React)

Документ описывает архитектуру, разбивку работ и порядок выполнения. Скелет проекта
уже создан (структура каталогов + файлы-заглушки с TODO). Дальше остаётся наполнить
заглушки логикой по этому плану.

---

## 1. Архитектура

```
C:\working
├─ backend/                 # FastAPI + SQLAlchemy + SQLite
│  ├─ app/
│  │  ├─ config.py          # настройки (env): SECRET_KEY, токен TTL, admin creds, путь к БД
│  │  ├─ database.py        # engine, SessionLocal, Base, get_db()
│  │  ├─ models.py          # ORM-модель Ticket + Enum статусов/приоритетов
│  │  ├─ schemas.py         # Pydantic-схемы (in/out) + валидация
│  │  ├─ security.py        # JWT: создание/проверка токена
│  │  ├─ deps.py            # зависимости FastAPI: get_db, require_admin
│  │  ├─ crud.py            # вся работа с БД: list/create/get/update_status/delete
│  │  ├─ seed.py            # демо-данные при первом старте
│  │  ├─ main.py            # сборка приложения, CORS, роутеры, обработчики ошибок
│  │  └─ routers/
│  │     ├─ auth.py         # POST /api/auth/login -> JWT
│  │     └─ tickets.py      # CRUD + список с фильтрами/поиском/сортировкой/пагинацией
│  └─ requirements.txt
└─ frontend/                # Vite + React + TypeScript
   └─ src/
      ├─ types.ts           # типы Ticket, enums, ответ списка
      ├─ api/               # http-клиент + методы API
      ├─ auth/              # контекст авторизации (хранение токена)
      └─ components/        # таблица, фильтры, поиск, форма, пагинация, логин
```

**Принцип:** поиск, фильтрация, сортировка и пагинация выполняются **на backend**
(требование ТЗ). Frontend только передаёт query-параметры и рисует результат.

---

## 2. Модель данных (Ticket)

| Поле | Тип | Правило |
|------|-----|---------|
| `id` | int (PK, autoincrement) | уникальный идентификатор |
| `title` | str | обязательное, 3–120 символов |
| `description` | str \| null | необязательное, ≤ 1000 символов |
| `status` | enum | `new` \| `in_progress` \| `done` (по умолчанию `new`) |
| `priority` | enum | `low` \| `normal` \| `high` (по умолчанию `normal`) |
| `created_at` | datetime (UTC) | проставляется при создании |
| `updated_at` | datetime (UTC) | обновляется при каждом изменении |

Валидация длины/обязательности — в Pydantic-схемах (`schemas.py`).

---

## 3. API

Базовый префикс: `/api`.

| Метод | Путь | Доступ | Назначение |
|-------|------|--------|-----------|
| POST | `/api/auth/login` | public | вход `admin:admin` → `{access_token}` |
| GET | `/api/tickets` | public | список с фильтрами/поиском/сортировкой/пагинацией |
| POST | `/api/tickets` | public | создать заявку |
| GET | `/api/tickets/{id}` | public | одна заявка |
| PATCH | `/api/tickets/{id}/status` | public | сменить статус |
| DELETE | `/api/tickets/{id}` | **admin** | удалить заявку |

### Query-параметры `GET /api/tickets`
- `status` — фильтр (`new|in_progress|done`)
- `priority` — фильтр (`low|normal|high`)
- `search` — подстрока по `title` ИЛИ `description` (case-insensitive)
- `sort_by` — `created_at` | `priority` (по умолчанию `created_at`)
- `order` — `asc` | `desc` (по умолчанию `desc`)
- `page` — номер страницы, ≥1 (по умолчанию 1)
- `page_size` — размер страницы, 1–100 (по умолчанию 20)

Ответ списка:
```json
{ "items": [ ...Ticket ], "total": 123, "page": 1, "page_size": 20, "pages": 7 }
```

> Сортировка по приоритету — по логическому порядку `low < normal < high`
> (через CASE/маппинг в БД), а не по алфавиту.

---

## 4. Авторизация (JWT)

- Креды админа берутся из конфига (`ADMIN_USERNAME` / `ADMIN_PASSWORD`, дефолт `admin`/`admin`).
- `POST /api/auth/login` проверяет креды → выдаёт JWT (`sub=admin`, `exp`).
- `DELETE /api/tickets/{id}` защищён зависимостью `require_admin`, которая
  валидирует `Authorization: Bearer <token>`.
- Остальные ручки публичные (по ТЗ админ нужен только для удаления).

---

## 5. Бизнес-правила (где проверяются)

Все — в `crud.py` / роутерах, чтобы фронт не мог их обойти:

1. `title` 3–120 символов, `description` ≤ 1000 — Pydantic.
2. Заявку в статусе `done` **нельзя редактировать или удалять** → `409 Conflict`.
3. Переход из `done` в другой статус запрещён → `409 Conflict`.
4. Удаление — только админ → `401/403` без валидного токена.
5. Любая ошибка правила → осмысленный HTTP-код + понятное `detail`.

Маппинг ошибок на коды: `404` — нет заявки; `409` — нарушение бизнес-правила;
`422` — ошибка валидации (Pydantic по умолчанию); `401/403` — авторизация.

---

## 6. Frontend (один экран)

Состояние экрана (React): список + параметры запроса (фильтры/поиск/сортировка/страница)
+ токен админа. При любом изменении параметров — перезапрос `GET /api/tickets`.

Компоненты:
- `SearchBar` — строка поиска (с debounce).
- `Filters` — селекты статуса и приоритета.
- `SortControls` — выбор поля сортировки и направления.
- `TicketTable` — список заявок; в строке: смена статуса (select) и кнопка удаления
  (видна/активна только админу).
- `CreateTicketForm` — форма создания (title, description, priority).
- `Pagination` — переключение страниц.
- `LoginDialog` — вход админа (admin:admin).
- Состояния: **loading**, **empty** (пустой список), **error** (ошибка API).

Дизайн не оценивается — минимальная разметка, акцент на корректность поведения.

---

## 7. Порядок работ (ориентир на 5 дней)

- **День 1** — Backend: модель, БД, схемы, конфиг, сидинг; `GET/POST /tickets` без фильтров.
- **День 2** — Backend: фильтры, поиск, сортировка, пагинация; смена статуса + бизнес-правила.
- **День 3** — Backend: JWT-логин, защита удаления; обработчики ошибок; ручная проверка через Swagger.
- **День 4** — Frontend: каркас, API-клиент, таблица + список, фильтры/поиск/сортировка/пагинация.
- **День 5** — Frontend: форма создания, смена статуса, удаление + логин, состояния loading/empty/error; README, финальная проверка.

---

## 8. Запуск

См. `README.md`. Кратко:
- Backend: `cd backend` → `pip install -r requirements.txt` → `uvicorn app.main:app --reload`
- Frontend: `cd frontend` → `npm install` → `npm run dev`
