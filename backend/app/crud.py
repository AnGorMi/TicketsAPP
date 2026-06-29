"""Работа с БД и бизнес-правила. Здесь сосредоточена вся логика над заявками.

Поиск, фильтрация, сортировка и пагинация выполняются на стороне БД (требование ТЗ),
а не в Python — чтобы фронт не мог их обойти и чтобы работало на больших объёмах.
"""

from math import ceil

from sqlalchemy import asc, case, desc, or_
from sqlalchemy.orm import Session

from . import schemas
from .models import Priority, Status, Ticket


class BusinessRuleError(Exception):
    """Нарушение бизнес-правила. Роутер превращает её в HTTP 409 с понятным detail."""


class NotFoundError(Exception):
    """Заявка не найдена. Роутер превращает её в HTTP 404."""


# Логический порядок приоритета для сортировки: low < normal < high (не по алфавиту).
def _priority_sort_key():
    return case(
        (Ticket.priority == Priority.low, 0),
        (Ticket.priority == Priority.normal, 1),
        (Ticket.priority == Priority.high, 2),
        else_=99,
    )


def list_tickets(
    db: Session,
    *,
    status: Status | None = None,
    priority: Priority | None = None,
    search: str | None = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    page_size: int = 20,
) -> schemas.TicketList:
    """Список заявок с фильтрами/поиском/сортировкой/пагинацией — всё на стороне БД."""
    query = db.query(Ticket)

    if status is not None:
        query = query.filter(Ticket.status == status)
    if priority is not None:
        query = query.filter(Ticket.priority == priority)
    if search and search.strip():
        like = f"%{search.strip()}%"
        # Поиск по подстроке в title ИЛИ description (регистронезависимо).
        query = query.filter(
            or_(Ticket.title.ilike(like), Ticket.description.ilike(like))
        )

    # total считаем по отфильтрованному запросу, но до пагинации.
    total = query.count()

    sort_column = _priority_sort_key() if sort_by == "priority" else Ticket.created_at
    direction = asc if order == "asc" else desc
    # Вторичная сортировка по id — стабильный детерминированный порядок при равных ключах.
    query = query.order_by(direction(sort_column), desc(Ticket.id))

    items = query.offset((page - 1) * page_size).limit(page_size).all()
    pages = ceil(total / page_size) if total else 0

    return schemas.TicketList(
        items=[schemas.TicketOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


def get_ticket(db: Session, ticket_id: int) -> Ticket:
    """Вернуть заявку или бросить NotFoundError."""
    obj = db.get(Ticket, ticket_id)
    if obj is None:
        raise NotFoundError(f"Заявка #{ticket_id} не найдена")
    return obj


def create_ticket(db: Session, data: schemas.TicketCreate) -> Ticket:
    """Создать заявку со статусом new."""
    ticket = Ticket(
        title=data.title,
        description=data.description,
        priority=data.priority,
        status=Status.new,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def update_status(db: Session, ticket_id: int, new_status: Status) -> Ticket:
    """Сменить статус с проверкой бизнес-правил.

    Заявку в статусе done нельзя изменять; это же правило запрещает и перевод
    из done обратно в любой другой статус.
    """
    ticket = get_ticket(db, ticket_id)
    if ticket.status == Status.done:
        raise BusinessRuleError(
            "Заявка в статусе «done» завершена — её статус нельзя изменить"
        )
    ticket.status = new_status
    db.commit()
    db.refresh(ticket)
    return ticket


def delete_ticket(db: Session, ticket_id: int) -> None:
    """Удалить заявку (вызывается только из admin-ручки).

    Заявку в статусе done удалять нельзя.
    """
    ticket = get_ticket(db, ticket_id)
    if ticket.status == Status.done:
        raise BusinessRuleError(
            "Заявка в статусе «done» завершена — её нельзя удалить"
        )
    db.delete(ticket)
    db.commit()
