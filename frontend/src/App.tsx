import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, api, type CreateTicketBody } from "./api";
import { CreateTicketForm } from "./components/CreateTicketForm";
import { LoginDialog } from "./components/LoginDialog";
import { Pagination } from "./components/Pagination";
import { Toolbar } from "./components/Toolbar";
import { TicketTable } from "./components/TicketTable";
import type { ListParams, Status, Ticket, TicketList } from "./types";

const PAGE_SIZE = 10;
const TOKEN_KEY = "tickets.admin.token";

type Filters = Pick<ListParams, "status" | "priority" | "sort_by" | "order">;

const DEFAULT_FILTERS: Filters = {
  status: "",
  priority: "",
  sort_by: "created_at",
  order: "desc",
};

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [showLogin, setShowLogin] = useState(false);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState<TicketList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isAdmin = token !== null;

  // Поиск с задержкой (debounce): печатаем в searchInput, в запрос уходит search.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Загрузка списка при любом изменении параметров запроса.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listTickets({ ...filters, search, page, page_size: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        // Если текущая страница опустела (например, после удаления) — шагнём назад.
        if (res.pages > 0 && page > res.pages) {
          setPage(res.pages);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Не удалось загрузить список.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, search, page, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  function handleFilterChange(patch: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  async function handleCreate(body: CreateTicketBody) {
    // Ошибка пробрасывается обратно в форму, которая её покажет.
    await api.createTicket(body);
    setActionError(null);
    setNotice("Заявка создана.");
    setPage(1);
    reload();
  }

  async function handleStatusChange(id: number, status: Status) {
    setActionError(null);
    setNotice(null);
    setBusyId(id);
    try {
      await api.updateStatus(id, status);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Не удалось сменить статус.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(ticket: Ticket) {
    if (!window.confirm(`Удалить заявку #${ticket.id} «${ticket.title}»?`)) return;
    setActionError(null);
    setNotice(null);
    setBusyId(ticket.id);
    try {
      await api.deleteTicket(ticket.id, token);
      setNotice(`Заявка #${ticket.id} удалена.`);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleLogout();
        setActionError("Сессия администратора истекла. Войдите снова.");
      } else {
        setActionError(err instanceof Error ? err.message : "Не удалось удалить заявку.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogin(username: string, password: string) {
    const res = await api.login(username, password);
    setToken(res.access_token);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setShowLogin(false);
    setActionError(null);
    setNotice("Вы вошли как администратор.");
  }

  function handleLogout() {
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  }

  const filtersActive =
    filters.status !== "" || filters.priority !== "" || search.trim() !== "";

  return (
    <div className="app">
      <header className="app-header">
        <h1>Учёт внутренних заявок</h1>
        <div className="auth-box">
          {isAdmin ? (
            <>
              <span className="badge admin-badge">admin</span>
              <button type="button" className="btn-ghost" onClick={handleLogout}>
                Выйти
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowLogin(true)}
            >
              Войти как админ
            </button>
          )}
        </div>
      </header>

      {(actionError || notice) && (
        <div className={`banner ${actionError ? "banner-error" : "banner-ok"}`}>
          <span>{actionError ?? notice}</span>
          <button
            type="button"
            className="banner-close"
            aria-label="Закрыть"
            onClick={() => {
              setActionError(null);
              setNotice(null);
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="layout">
        <aside className="sidebar">
          <CreateTicketForm onCreate={handleCreate} />
        </aside>

        <main className="content">
          <Toolbar
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />

          <ListBody
            loading={loading}
            error={error}
            data={data}
            filtersActive={filtersActive}
            isAdmin={isAdmin}
            busyId={busyId}
            onRetry={reload}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onPage={setPage}
          />
        </main>
      </div>

      {showLogin && (
        <LoginDialog onLogin={handleLogin} onClose={() => setShowLogin(false)} />
      )}
    </div>
  );
}

interface ListBodyProps {
  loading: boolean;
  error: string | null;
  data: TicketList | null;
  filtersActive: boolean;
  isAdmin: boolean;
  busyId: number | null;
  onRetry: () => void;
  onStatusChange: (id: number, status: Status) => void;
  onDelete: (ticket: Ticket) => void;
  onPage: (page: number) => void;
}

function ListBody({
  loading,
  error,
  data,
  filtersActive,
  isAdmin,
  busyId,
  onRetry,
  onStatusChange,
  onDelete,
  onPage,
}: ListBodyProps) {
  // Чтобы при перезагрузке не «прыгал» layout, держим прошлые данные под оверлеем.
  const prev = useRef<TicketList | null>(null);
  if (data) prev.current = data;
  const shown = data ?? prev.current;

  if (error) {
    return (
      <div className="state state-error">
        <p>⚠ {error}</p>
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Повторить
        </button>
      </div>
    );
  }

  if (loading && !shown) {
    return <div className="state state-loading">Загрузка…</div>;
  }

  if (!shown) {
    return null;
  }

  if (shown.items.length === 0 && !loading) {
    return (
      <div className="state state-empty">
        {filtersActive ? (
          <p>По заданным условиям ничего не найдено.</p>
        ) : (
          <p>Заявок пока нет. Создайте первую с помощью формы слева.</p>
        )}
      </div>
    );
  }

  return (
    <div className={loading ? "reloading" : undefined}>
      <TicketTable
        tickets={shown.items}
        isAdmin={isAdmin}
        busyId={busyId}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />
      <Pagination
        page={shown.page}
        pages={shown.pages}
        total={shown.total}
        onPage={onPage}
      />
    </div>
  );
}
