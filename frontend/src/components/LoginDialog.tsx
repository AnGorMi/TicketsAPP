import { useState } from "react";

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onClose: () => void;
}

export function LoginDialog({ onLogin, onClose }: Props) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Вход администратора"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Вход администратора</h2>
        <p className="muted">Удаление заявок доступно только администратору.</p>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Логин</span>
            <input
              type="text"
              value={username}
              autoFocus
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              placeholder="admin"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Вход…" : "Войти"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
