export type Status = "new" | "in_progress" | "done";
export type Priority = "low" | "normal" | "high";
export type SortBy = "created_at" | "priority";
export type Order = "asc" | "desc";

export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  created_at: string;
  updated_at: string;
}

export interface TicketList {
  items: Ticket[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ListParams {
  status: Status | "";
  priority: Priority | "";
  search: string;
  sort_by: SortBy;
  order: Order;
  page: number;
  page_size: number;
}

export const STATUS_LABELS: Record<Status, string> = {
  new: "Новая",
  in_progress: "В работе",
  done: "Завершена",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
};

export const STATUS_VALUES: Status[] = ["new", "in_progress", "done"];
export const PRIORITY_VALUES: Priority[] = ["low", "normal", "high"];
