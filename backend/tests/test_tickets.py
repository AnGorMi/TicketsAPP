"""Тесты API заявок: CRUD, валидация, фильтры/поиск/сортировка/пагинация,
бизнес-правила и авторизация."""

from fastapi.testclient import TestClient


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def make_ticket(client: TestClient, **kwargs) -> dict:
    payload = {"title": "Тестовая заявка", "priority": "normal"}
    payload.update(kwargs)
    resp = client.post("/api/tickets", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# --- Создание и валидация ---------------------------------------------------


def test_create_ticket_defaults_to_new(client: TestClient):
    body = make_ticket(client, title="Купить бумагу")
    assert body["status"] == "new"
    assert body["priority"] == "normal"
    assert body["id"] > 0
    assert body["created_at"].endswith("Z")


def test_create_title_too_short_returns_422(client: TestClient):
    resp = client.post("/api/tickets", json={"title": "ab"})
    assert resp.status_code == 422


def test_create_title_only_spaces_rejected(client: TestClient):
    resp = client.post("/api/tickets", json={"title": "    "})
    assert resp.status_code == 422


def test_create_description_too_long_returns_422(client: TestClient):
    resp = client.post("/api/tickets", json={"title": "Норм", "description": "x" * 1001})
    assert resp.status_code == 422


# --- Фильтры / поиск / сортировка / пагинация -------------------------------


def test_filter_by_status_and_priority(client: TestClient):
    a = make_ticket(client, title="Заявка A", priority="high")
    make_ticket(client, title="Заявка B", priority="low")
    # переведём A в in_progress
    client.patch(f"/api/tickets/{a['id']}/status", json={"status": "in_progress"})

    resp = client.get("/api/tickets", params={"status": "in_progress"})
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Заявка A"

    resp = client.get("/api/tickets", params={"priority": "low"})
    assert resp.json()["total"] == 1


def test_search_matches_title_or_description(client: TestClient):
    make_ticket(client, title="Принтер сломался", description="кабинет 3")
    make_ticket(client, title="Запрос доступа", description="нужен VPN")

    by_title = client.get("/api/tickets", params={"search": "принтер"}).json()
    assert by_title["total"] == 1

    by_desc = client.get("/api/tickets", params={"search": "vpn"}).json()
    assert by_desc["total"] == 1


def test_sort_by_priority_desc_orders_high_first(client: TestClient):
    make_ticket(client, title="low", priority="low")
    make_ticket(client, title="high", priority="high")
    make_ticket(client, title="normal", priority="normal")

    items = client.get(
        "/api/tickets", params={"sort_by": "priority", "order": "desc"}
    ).json()["items"]
    assert [i["priority"] for i in items] == ["high", "normal", "low"]


def test_pagination(client: TestClient):
    for i in range(5):
        make_ticket(client, title=f"Заявка {i}")
    page1 = client.get("/api/tickets", params={"page": 1, "page_size": 2}).json()
    assert page1["total"] == 5
    assert page1["pages"] == 3
    assert len(page1["items"]) == 2

    page3 = client.get("/api/tickets", params={"page": 3, "page_size": 2}).json()
    assert len(page3["items"]) == 1


# --- Бизнес-правила ----------------------------------------------------------


def test_done_ticket_cannot_change_status(client: TestClient):
    t = make_ticket(client, title="Завершаемая")
    client.patch(f"/api/tickets/{t['id']}/status", json={"status": "done"})
    resp = client.patch(f"/api/tickets/{t['id']}/status", json={"status": "new"})
    assert resp.status_code == 409
    assert "done" in resp.json()["detail"]


def test_update_status_not_found(client: TestClient):
    resp = client.patch("/api/tickets/999/status", json={"status": "done"})
    assert resp.status_code == 404


# --- Авторизация и удаление --------------------------------------------------


def test_login_wrong_credentials(client: TestClient):
    resp = client.post(
        "/api/auth/login", json={"username": "admin", "password": "nope"}
    )
    assert resp.status_code == 401


def test_delete_requires_admin(client: TestClient):
    t = make_ticket(client, title="Удаляемая")
    resp = client.delete(f"/api/tickets/{t['id']}")
    assert resp.status_code == 401


def test_admin_can_delete(client: TestClient, admin_token: str):
    t = make_ticket(client, title="Удаляемая админом")
    resp = client.delete(f"/api/tickets/{t['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 204
    assert client.get(f"/api/tickets/{t['id']}").status_code == 404


def test_cannot_delete_done_ticket(client: TestClient, admin_token: str):
    t = make_ticket(client, title="Завершённая")
    client.patch(f"/api/tickets/{t['id']}/status", json={"status": "done"})
    resp = client.delete(f"/api/tickets/{t['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 409
