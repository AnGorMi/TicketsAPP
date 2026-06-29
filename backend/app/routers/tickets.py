"""Роуты заявок: список, создание, чтение, смена статуса, удаление (admin)."""

from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..deps import require_admin
from ..models import Priority, Status

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.get("", response_model=schemas.TicketList)
def list_tickets(
    db: Session = Depends(get_db),
    status: Status | None = None,
    priority: Priority | None = None,
    search: str | None = None,
    sort_by: Literal["created_at", "priority"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> schemas.TicketList:
    """Список с фильтрами/поиском/сортировкой/пагинацией (логика в crud.list_tickets)."""
    return crud.list_tickets(
        db,
        status=status,
        priority=priority,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=schemas.TicketOut, status_code=status.HTTP_201_CREATED)
def create_ticket(
    data: schemas.TicketCreate, db: Session = Depends(get_db)
) -> schemas.TicketOut:
    return crud.create_ticket(db, data)


@router.get("/{ticket_id}", response_model=schemas.TicketOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)) -> schemas.TicketOut:
    # NotFoundError -> 404 (см. обработчик в main.py)
    return crud.get_ticket(db, ticket_id)


@router.patch("/{ticket_id}/status", response_model=schemas.TicketOut)
def update_status(
    ticket_id: int,
    data: schemas.TicketStatusUpdate,
    db: Session = Depends(get_db),
) -> schemas.TicketOut:
    # BusinessRuleError -> 409, NotFoundError -> 404
    return crud.update_status(db, ticket_id, data.status)


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(require_admin),
) -> None:
    # require_admin -> 401 без токена; BusinessRuleError -> 409; NotFoundError -> 404
    crud.delete_ticket(db, ticket_id)
