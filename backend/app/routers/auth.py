"""Авторизация администратора: вход по логину/паролю → JWT."""

import hmac

from fastapi import APIRouter, HTTPException, status

from ..config import settings
from ..schemas import LoginRequest, TokenResponse
from ..security import create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _matches(provided: str, expected: str) -> bool:
    # Сравнение за постоянное время, чтобы не утекала длина/совпадение по таймингу.
    return hmac.compare_digest(provided, expected)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest) -> TokenResponse:
    """Проверяет креды админа (по умолчанию admin:admin) и выдаёт JWT."""
    valid = _matches(data.username, settings.admin_username) and _matches(
        data.password, settings.admin_password
    )
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )
    return TokenResponse(access_token=create_access_token("admin"))
