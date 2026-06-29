"""Настройки приложения. Читаются из переменных окружения / .env."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    secret_key: str = "change-me-in-prod"
    access_token_expire_minutes: int = 60
    admin_username: str = "admin"
    admin_password: str = "admin"
    database_url: str = "sqlite:///./app.db"
    frontend_origin: str = "http://localhost:5173"


settings = Settings()
