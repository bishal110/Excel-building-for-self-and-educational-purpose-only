import { useState, useSyncExternalStore } from 'react';
import { DialogFrame } from './DialogFrame';

/**
 * Shared prompt/alert/confirm replacements, built on DialogFrame (which
 * provides focus trap, Escape-to-close, focus restoration and dialog ARIA).
 */

/** Yes/no confirmation. Danger styling for destructive actions. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'OK',
  danger = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <DialogFrame title={title} onClose={onClose} className="confirm-dialog">
      <p className="dialog-message" data-testid="confirm-dialog">{message}</p>
      <div className="dialog-actions">
        <button data-testid="confirm-cancel" onClick={onClose}>
          Cancel
        </button>
        <button
          data-testid="confirm-ok"
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </DialogFrame>
  );
}

/**
 * Single-field text input dialog (the prompt() replacement).
 * `validate` returns an error message to show inline, or null when valid.
 */
export function InputDialog({
  title,
  label,
  initial = '',
  placeholder,
  submitLabel = 'OK',
  validate,
  onSubmit,
  onClose,
}: {
  title: string;
  label: string;
  initial?: string;
  placeholder?: string;
  submitLabel?: string;
  validate?: (value: string) => string | null;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const err = validate ? validate(value) : null;
    if (err) {
      setError(err);
      return;
    }
    onSubmit(value);
    onClose();
  };

  return (
    <DialogFrame title={title} onClose={onClose} className="input-dialog">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="dialog-field">
          <span>{label}</span>
          <input
            data-testid="input-dialog-field"
            value={value}
            placeholder={placeholder}
            autoFocus
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
          />
        </label>
        {error && (
          <p className="dialog-error" role="alert" data-testid="input-dialog-error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" data-testid="input-dialog-ok">
            {submitLabel}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

// ---- Toasts (the alert() replacement for non-blocking notices) ----------

export interface ToastItem {
  id: number;
  kind: 'info' | 'success' | 'error';
  message: string;
}

let toastId = 0;
let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emitToasts() {
  for (const l of listeners) l();
}

/** Show a transient notification. Errors stay longer. */
export function toast(message: string, kind: ToastItem['kind'] = 'info') {
  const item: ToastItem = { id: ++toastId, kind, message };
  toasts = [...toasts, item];
  emitToasts();
  const ttl = kind === 'error' ? 8000 : 4000;
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== item.id);
    emitToasts();
  }, ttl);
}

function subscribeToasts(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Host element; rendered once in the app shell. */
export function Toasts() {
  const items = useSyncExternalStore(subscribeToasts, () => toasts);
  if (items.length === 0) return null;
  return (
    <div className="toast-host" aria-live="polite" data-testid="toast-host">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role="status">
          {t.message}
        </div>
      ))}
    </div>
  );
}
