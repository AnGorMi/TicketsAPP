"""JWT: выпуск и проверка токена администратора."""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from .config import settings

ALGORITHM = "HS256"


def create_access_token(subject: str) -> str:
    """Выпустить JWT для субъекта (например, 'admin')."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> str | None:
    """Вернуть subject из валидного токена либо None, если токен невалиден/просрочен."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None
    return payload.get("sub")
