"""Подключение к БД: engine, фабрика сессий, базовый класс, зависимость get_db."""

from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

_is_sqlite = settings.database_url.startswith("sqlite")

# check_same_thread=False нужен для SQLite при работе из нескольких потоков FastAPI.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)


if _is_sqlite:

    @event.listens_for(engine, "connect")
    def _register_unicode_lower(dbapi_connection, _connection_record) -> None:
        """Делает SQL-функцию lower() в SQLite Unicode-aware.

        Встроенный lower() в SQLite сворачивает регистр только для ASCII, поэтому
        регистронезависимый поиск (ILIKE) не работал бы для кириллицы. Подменяем
        её питоновским str.lower(), и ILIKE начинает корректно искать «Принтер»
        по запросу «принтер».
        """
        dbapi_connection.create_function(
            "lower", 1, lambda s: s.lower() if s is not None else None
        )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """Зависимость FastAPI: отдаёт сессию и гарантированно закрывает её."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
