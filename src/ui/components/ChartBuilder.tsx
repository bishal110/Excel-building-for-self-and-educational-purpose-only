import { useState } from 'react';
import { store, selectionBox } from '../state/store';
import { DialogFrame } from './DialogFrame';

type ChartType = 'line' | 'bar';

/** Build a simple line/bar chart (inline SVG) from the selected range.
 *  Uses the first numeric column of the selection as the series. */
export function ChartBuilder({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<ChartType>('line');
  const box = selectionBox(store.selection);

  const series: { label: string; value: number }[] = [];
  for (let r = box.r1; r <= box.r2; r++) {
    let value: number | null = null;
    let label = String(r + 1);
    for (let c = box.c1; c <= box.c2; c++) {
      const v = store.getValue(c, r);
      if (typeof v === 'number' && value === null) value = v;
      else if (typeof v === 'string' && label === String(r + 1)) label = v;
    }
    if (value !== null) series.push({ label, value });
  }

  const W = 520;
  const H = 300;
  const PAD = 40;
  const max = Math.max(1, ...series.map((s) => s.value));
  const min = Math.min(0, ...series.map((s) => s.value));
  const span = max - min || 1;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;
  const x = (i: number) =>
    PAD + (series.length <= 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
  const y = (v: number) => PAD + plotH - ((v - min) / span) * plotH;

  return (
    <DialogFrame title="Chart builder" onClose={onClose}>
        <div className="chart-controls">
          <label>
            <input
              type="radio"
              checked={type === 'line'}
              onChange={() => setType('line')}
            />
            Line
          </label>
          <label>
            <input
              type="radio"
              checked={type === 'bar'}
              onChange={() => setType('bar')}
            />
            Bar
          </label>
          <span className="chart-hint">
            {series.length} point(s) from the selected range
          </span>
        </div>
        {series.length === 0 ? (
          <p className="chart-empty">
            Select a range containing numbers to build a chart.
          </p>
        ) : (
          <svg width={W} height={H} className="chart-svg" data-testid="chart-svg" role="img" aria-label={`${type} chart with ${series.length} data points`}>
            <title>{type === 'line' ? 'Line' : 'Bar'} chart of the selected data</title>
            <line x1={PAD} y1={PAD + plotH} x2={W - PAD} y2={PAD + plotH} stroke="#94a3b8" />
            <line x1={PAD} y1={PAD} x2={PAD} y2={PAD + plotH} stroke="#94a3b8" />
            {type === 'line' && (
              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                points={series.map((s, i) => `${x(i)},${y(s.value)}`).join(' ')}
              />
            )}
            {type === 'bar' &&
              series.map((s, i) => {
                const bw = Math.max(4, (plotW / series.length) * 0.6);
                return (
                  <rect
                    key={i}
                    x={x(i) - bw / 2}
                    y={y(s.value)}
                    width={bw}
                    height={PAD + plotH - y(s.value)}
                    fill="var(--accent)"
                  />
                );
              })}
            {series.map((s, i) => (
              <text key={i} x={x(i)} y={H - PAD / 2} fontSize={10} textAnchor="middle">
                {s.label}
              </text>
            ))}
          </svg>
        )}
    </DialogFrame>
  );
}
