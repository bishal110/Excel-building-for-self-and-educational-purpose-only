import { store } from '../state/store';
import { useStoreVersion } from '../state/useStore';
import { Icon } from './Icon';

export function SheetTabs() {
  useStoreVersion();
  const names = store.sheetNames();
  const active = store.activeIndex();

  return (
    <div className="sheet-tabs" data-testid="sheet-tabs">
      {names.map((name, i) => (
        <button
          key={i}
          className={'sheet-tab' + (i === active ? ' active' : '')}
          aria-pressed={i === active}
          title="Double-click to rename sheet"
          onClick={() => store.setActiveSheet(i)}
          onDoubleClick={() => {
            const next = prompt('Rename sheet', name);
            if (next && next.trim()) {
              try {
                store.renameSheet(i, next.trim());
              } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
              }
            }
          }}
        >
          {name}
          {names.length > 1 && (
            <span
              className="sheet-close"
              title="Delete sheet"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete sheet "${name}"?`)) store.removeSheet(i);
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
    </div>
  );
}
