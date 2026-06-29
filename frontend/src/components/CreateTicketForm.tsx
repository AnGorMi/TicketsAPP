import { useState } from "react";

import type { CreateTicketBody } from "../api";
import type { Priority } from "../types";
import { PRIORITY_LABELS, PRIORITY_VALUES } from "../types";

interface Props {
  onCreate: (body: CreateTicketBody) => Promise<void>;
}

export function CreateTicketForm({ onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedTitle = title.trim();
  const titleValid = trimmedTitle.length >= 3 && trimmedTitle.length <= 120;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!titleValid) {
      setError("Заголовок должен содержать от 3 до 120 символов.");
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        title: trimmedTitle,
        description: description.trim() || null,
        priority,
      });
      setTitle("");
      setDescription("");
      setPriority("normal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать заявку.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <h2>Новая заявка</h2>

      <label className="field">
        <span>
          Заголовок <em>*</em>
        </span>
        <input
          type="text"
          value={title}
          maxLength={120}
          placeholder="Кратко опишите проблему"
          onChange={(e) => setTitle(e.target.value)}
        />
        <small className="hint">{trimmedTitle.length}/120, минимум 3 символа</small>
      </label>

      <label className="field">
        <span>Описание</span>
        <textarea
          value={description}
          maxLength={1000}
          rows={3}
          placeholder="Необязательно, до 1000 символов"
          onChange={(e) => setDescription(e.target.value)}
        />
        <small className="hint">{description.length}/1000</small>
      </label>

      <label className="field">
        <span>Приоритет</span>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        >
          {PRIORITY_VALUES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn-primary" disabled={submitting || !titleValid}>
        {submitting ? "Создание…" : "Создать заявку"}
      </button>
    </form>
  );
}
