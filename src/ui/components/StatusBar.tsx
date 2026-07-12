import { store } from '../state/store';
import { useStoreVersion } from '../state/useStore';
import { Icon } from './Icon';

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function StatusBar() {
  useStoreVersion();
  const stats = store.selectionStats();
  return (
    <div className="status-bar" data-testid="status-bar">
      <span className="status-ready"><span className="status-dot" />Ready</span>
      <span className="status-divider" aria-hidden="true" />
      <span>Count: {stats.count}</span>
      {stats.count > 0 && (
        <>
          <span>Sum: {fmt(stats.sum)}</span>
          <span>Avg: {stats.avg !== null ? fmt(stats.avg) : '—'}</span>
        </>
      )}
      <span className="spacer" />
      <span className="status-local" title="Changes are stored on this device"><Icon name="local" size={13} />Local autosave</span>
      <span className="status-module">Sheets</span>
    </div>
  );
}
