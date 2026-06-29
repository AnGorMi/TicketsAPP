import type { Status, Ticket } from "../types";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_VALUES,
} from "../types";
import { formatDateTime } from "../format";

interface Props {
  tickets: Ticket[];
  isAdmin: boolean;
  busyId: number | null;
  onStatusChange: (id: number, status: Status) => void;
  onDelete: (ticket: Ticket) => void;
}

export function TicketTable({
  tickets,
  isAdmin,
  busyId,
  onStatusChange,
  onDelete,
}: Props) {
  return (
    <div className="table-wrap">
      <table className="tickets">
        <thead>
          <tr>
            <th className="col-id">#</th>
            <th>Заголовок</th>
            <th className="col-priority">Приоритет</th>
            <th className="col-status">Статус</th>
            <th className="col-date">Создана</th>
            <th className="col-date">Изменена</th>
            {isAdmin && <th className="col-actions">Действия</th>}
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => {
            const isDone = t.status === "done";
            const busy = busyId === t.id;
            return (
              <tr key={t.id} className={busy ? "row-busy" : undefined}>
                <td className="col-id">{t.id}</td>
                <td>
                  <div className="ticket-title">{t.title}</div>
                  {t.description && (
                    <div className="ticket-desc">{t.description}</div>
                  )}
                </td>
                <td>
                  <span className={`badge prio-${t.priority}`}>
                    {PRIORITY_LABELS[t.priority]}
                  </span>
                </td>
                <td>
                  <select
                    className={`status-select status-${t.status}`}
                    value={t.status}
                    disabled={isDone || busy}
                    title={
                      isDone
                        ? "Завершённую заявку нельзя изменить"
                        : "Сменить статус"
                    }
                    onChange={(e) =>
                      onStatusChange(t.id, e.target.value as Status)
                    }
                  >
                    {STATUS_VALUES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="col-date">{formatDateTime(t.created_at)}</td>
                <td className="col-date">{formatDateTime(t.updated_at)}</td>
                {isAdmin && (
                  <td className="col-actions">
                    <button
                      type="button"
                      className="btn-danger"
                      disabled={isDone || busy}
                      title={
                        isDone
                          ? "Завершённую заявку нельзя удалить"
                          : "Удалить заявку"
                      }
                      onClick={() => onDelete(t)}
                    >
                      Удалить
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
