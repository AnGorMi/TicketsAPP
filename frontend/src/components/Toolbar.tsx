import type { ListParams, Order, SortBy, Status, Priority } from "../types";
import {
  PRIORITY_LABELS,
  PRIORITY_VALUES,
  STATUS_LABELS,
  STATUS_VALUES,
} from "../types";

interface Props {
  searchInput: string;
  onSearchChange: (value: string) => void;
  filters: Pick<ListParams, "status" | "priority" | "sort_by" | "order">;
  onFilterChange: (
    patch: Partial<Pick<ListParams, "status" | "priority" | "sort_by" | "order">>,
  ) => void;
  onReset: () => void;
}

export function Toolbar({
  searchInput,
  onSearchChange,
  filters,
  onFilterChange,
  onReset,
}: Props) {
  return (
    <div className="toolbar">
      <input
        className="search"
        type="search"
        placeholder="Поиск по заголовку и описанию…"
        value={searchInput}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="Поиск"
      />

      <label className="field">
        <span>Статус</span>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ status: e.target.value as Status | "" })}
        >
          <option value="">Все</option>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Приоритет</span>
        <select
          value={filters.priority}
          onChange={(e) =>
            onFilterChange({ priority: e.target.value as Priority | "" })
          }
        >
          <option value="">Все</option>
          {PRIORITY_VALUES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Сортировка</span>
        <select
          value={filters.sort_by}
          onChange={(e) => onFilterChange({ sort_by: e.target.value as SortBy })}
        >
          <option value="created_at">По дате создания</option>
          <option value="priority">По приоритету</option>
        </select>
      </label>

      <label className="field">
        <span>Порядок</span>
        <select
          value={filters.order}
          onChange={(e) => onFilterChange({ order: e.target.value as Order })}
        >
          <option value="desc">По убыванию</option>
          <option value="asc">По возрастанию</option>
        </select>
      </label>

      <button type="button" className="btn-ghost" onClick={onReset}>
        Сбросить
      </button>
    </div>
  );
}
