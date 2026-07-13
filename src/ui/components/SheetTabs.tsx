import { useState } from 'react';
import { store } from '../state/store';
import { useStoreVersion } from '../state/useStore';
import { Icon } from './Icon';
import { ConfirmDialog, InputDialog } from './dialogs';

export function SheetTabs() {
  useStoreVersion();
  const names = store.sheetNames();
  const active = store.activeIndex();
  const [renaming, setRenaming] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  return (
    <div className="sheet-tabs" data-testid="sheet-tabs">
      {names.map((name, i) => (
        <button
          key={i}
          className={'sheet-tab' + (i === active ? ' active' : '')}
          aria-pressed={i === active}
          title="Double-click to rename sheet"
          onClick={() => store.setActiveSheet(i)}
          onDoubleClick={() => setRenaming(i)}
        >
          {name}
          {names.length > 1 && (
            <span
              className="sheet-close"
              role="button"
              aria-label={`Delete sheet ${name}`}
              title="Delete sheet"
              onClick={(e) => {
                e.stopPropagation();
                setDeleting(i);
              }}
            >
              ×
            </span>
          )}
        </button>
      ))}
      <button className="sheet-add" title="Add sheet" aria-label="Add sheet" onClick={() => store.addSheet()}>
        <Icon name="plus" size={15} />
      </button>

      {renaming !== null && (
        <InputDialog
          title="Rename sheet"
          label="Sheet name"
          initial={names[renaming] ?? ''}
          submitLabel="Rename"
          validate={(v) => {
            const t = v.trim();
            if (!t) return 'Name cannot be empty.';
            if (names.some((n, idx) => idx !== renaming && n === t)) {
              return `A sheet named "${t}" already exists.`;
            }
            return null;
          }}
          onSubmit={(v) => store.renameSheet(renaming, v.trim())}
          onClose={() => setRenaming(null)}
        />
      )}
      {deleting !== null && (
        <ConfirmDialog
          title="Delete sheet"
          message={`Delete sheet "${names[deleting]}"? Its cells cannot be recovered except by Undo.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => store.removeSheet(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
