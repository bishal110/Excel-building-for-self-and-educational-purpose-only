import { store } from '../state/store';
import { useStoreVersion } from '../state/useStore';

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
      <button className="sheet-add" title="Add sheet" onClick={() => store.addSheet()}>
        +
      </button>
    </div>
  );
}
