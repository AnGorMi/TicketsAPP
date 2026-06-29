"""Демо-данные при первом старте (если таблица пуста)."""

from sqlalchemy.orm import Session

from .models import Priority, Status, Ticket

DEMO_TICKETS = [
    {"title": "Не работает принтер в 3 кабинете", "description": "Замятие бумаги, горит красная лампа.", "status": Status.new, "priority": Priority.high},
    {"title": "Запросить доступ к CRM", "description": "Новому сотруднику отдела продаж.", "status": Status.in_progress, "priority": Priority.normal},
    {"title": "Заменить картридж", "description": None, "status": Status.done, "priority": Priority.low},
    {"title": "Настроить VPN на ноутбуке", "description": "Удалённая работа на следующей неделе.", "status": Status.new, "priority": Priority.normal},
    {"title": "Обновить лицензию антивируса", "description": "Истекает в конце месяца.", "status": Status.in_progress, "priority": Priority.high},
]


def seed_if_empty(db: Session) -> None:
    """Создаёт демо-заявки, только если таблица пустая."""
    if db.query(Ticket).first() is not None:
        return
    db.add_all(Ticket(**data) for data in DEMO_TICKETS)
    db.commit()
