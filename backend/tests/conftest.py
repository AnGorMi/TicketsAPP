"""Общие фикстуры тестов: изолированная БД и HTTP-клиент.

DATABASE_URL переопределяется на отдельный временный файл ДО импорта приложения,
чтобы тесты не трогали рабочую app.db. TestClient используется без контекстного
менеджера — тогда не запускается lifespan (а значит и сидинг демо-данными),
и каждый тест стартует с чистой таблицей.
"""

import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.gettempdir()}/tickets_test.db"
os.environ["SECRET_KEY"] = "test-secret"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client() -> TestClient:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return TestClient(app)


@pytest.fixture()
def admin_token(client: TestClient) -> str:
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
