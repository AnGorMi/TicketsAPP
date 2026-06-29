"""ORM-модель заявки и перечисления статуса/приоритета."""

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Status(str, enum.Enum):
    new = "new"
    in_progress = "in_progress"
    done = "done"


class Priority(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"


# Логический порядок приоритета для сортировки (low < normal < high).
PRIORITY_ORDER = {Priority.low: 0, Priority.normal: 1, Priority.high: 2}


def utcnow() -> datetime:
    # Наивный datetime в UTC: SQLite не хранит tzinfo, поэтому держим единое
    # «настенное» время в UTC, а суффикс Z добавляем при сериализации (см. schemas).
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[Status] = mapped_column(
        Enum(Status), nullable=False, default=Status.new
    )
    priority: Mapped[Priority] = mapped_column(
        Enum(Priority), nullable=False, default=Priority.normal
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
