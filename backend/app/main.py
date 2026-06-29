"""Точка входа FastAPI: создание таблиц, сидинг, CORS, роутеры, обработчики ошибок."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .crud import BusinessRuleError, NotFoundError
from .database import Base, SessionLocal, engine
from .routers import auth, tickets
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаём таблицы и наполняем демо-данными при старте.
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Учёт внутренних заявок", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Бизнес-ошибки -> осмысленные HTTP-ответы (требование ТЗ).
@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc) or "Не найдено"})


@app.exception_handler(BusinessRuleError)
async def business_rule_handler(request: Request, exc: BusinessRuleError) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": str(exc)})


app.include_router(auth.router)
app.include_router(tickets.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
