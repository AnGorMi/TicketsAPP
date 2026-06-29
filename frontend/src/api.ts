import type { ListParams, Priority, Status, Ticket, TicketList } from "./types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api";

/** Ошибка API с HTTP-статусом и понятным сообщением для пользователя. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ErrorDetailItem {
  msg?: string;
}

function extractDetail(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    // Ошибки валидации FastAPI: detail — массив объектов { loc, msg, ... }.
    if (Array.isArray(detail)) {
      return detail
        .map((e: ErrorDetailItem) => e.msg)
        .filter(Boolean)
        .join("; ");
    }
  }
  return null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(API_BASE + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    });
  } catch {
    throw new ApiError(
      "Не удалось связаться с сервером. Убедитесь, что backend запущен.",
      0,
    );
  }

  if (resp.status === 204) {
    return undefined as T;
  }

  const text = await resp.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!resp.ok) {
    throw new ApiError(
      extractDetail(data) ?? `Ошибка запроса (${resp.status})`,
      resp.status,
    );
  }
  return data as T;
}

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function buildQuery(params: ListParams): string {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.priority) q.set("priority", params.priority);
  if (params.search.trim()) q.set("search", params.search.trim());
  q.set("sort_by", params.sort_by);
  q.set("order", params.order);
  q.set("page", String(params.page));
  q.set("page_size", String(params.page_size));
  return q.toString();
}

export interface CreateTicketBody {
  title: string;
  description?: string | null;
  priority: Priority;
}

export const api = {
  listTickets: (params: ListParams) =>
    request<TicketList>(`/tickets?${buildQuery(params)}`),

  createTicket: (body: CreateTicketBody) =>
    request<Ticket>("/tickets", { method: "POST", body: JSON.stringify(body) }),

  updateStatus: (id: number, status: Status) =>
    request<Ticket>(`/tickets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  deleteTicket: (id: number, token: string | null) =>
    request<void>(`/tickets/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),

  login: (username: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
};
