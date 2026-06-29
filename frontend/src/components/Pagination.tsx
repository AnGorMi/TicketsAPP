interface Props {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}

export function Pagination({ page, pages, total, onPage }: Props) {
  return (
    <div className="pagination">
      <span className="muted">Всего: {total}</span>
      <div className="pager">
        <button
          type="button"
          className="btn-ghost"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          ← Назад
        </button>
        <span className="page-info">
          Страница {pages === 0 ? 0 : page} из {pages}
        </span>
        <button
          type="button"
          className="btn-ghost"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Вперёд →
        </button>
      </div>
    </div>
  );
}
