import { store } from '../state/store';
import { useStoreVersion } from '../state/useStore';

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function StatusBar() {
  useStoreVersion();
  const stats = store.selectionStats();
  return (
    <div className="status-bar" data-testid="status-bar">
      <span>Count: {stats.count}</span>
      {stats.count > 0 && (
        <>
          <span>Sum: {fmt(stats.sum)}</span>
          <span>Avg: {stats.avg !== null ? fmt(stats.avg) : '—'}</span>
        </>
      )}
      <span className="spacer" />
      <span>AI_Office · Sheets</span>
    </div>
  );
}
