import { useState } from 'react';
import type { PivotAgg } from '../../engine/grid/pivot';
import { store, selectionBox } from '../state/store';

/** Build a pivot table from the currently selected range (first row = headers). */
export function PivotBuilder({ onClose }: { onClose: () => void }) {
  const headers = store.selectionHeaders();
  const box = selectionBox(store.selection);
  const enoughData = headers.length >= 2 && box.r2 - box.r1 >= 1;

  const [rowField, setRowField] = useState(0);
  const [colField, setColField] = useState(-1); // -1 = none
  const [valueField, setValueField] = useState(headers.length > 1 ? 1 : 0);
  const [agg, setAgg] = useState<PivotAgg>('sum');

  const build = () => {
    const name = store.createPivotSheet({
      rowField,
      colField: colField < 0 ? null : colField,
      valueField,
      agg,
    });
    onClose();
    alert(`Created "${name}" from your selection.`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>PivotTable</h2>
          <button onClick={onClose}>×</button>
        </header>
        {!enoughData ? (
          <p className="chart-empty">
            Select a data range that includes a header row and at least one data
            row (two or more columns), then open PivotTable again.
          </p>
        ) : (
          <>
            <p className="help-note">
              Summarizing the selected range ({headers.length} columns). Choose
              how to group and aggregate it.
            </p>
            <div className="pivot-fields" data-testid="pivot-fields">
              <label>
                Rows (group by)
                <select
                  data-testid="pivot-row"
                  value={rowField}
                  onChange={(e) => setRowField(Number(e.target.value))}
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </label>
              <label>
                Columns (optional)
                <select
                  data-testid="pivot-col"
                  value={colField}
                  onChange={(e) => setColField(Number(e.target.value))}
                >
                  <option value={-1}>(none)</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </label>
              <label>
                Values
                <select
                  data-testid="pivot-value"
                  value={valueField}
                  onChange={(e) => setValueField(Number(e.target.value))}
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </label>
              <label>
                Summarize by
                <select
                  data-testid="pivot-agg"
                  value={agg}
                  onChange={(e) => setAgg(e.target.value as PivotAgg)}
                >
                  <option value="sum">Sum</option>
                  <option value="count">Count</option>
                  <option value="avg">Average</option>
                  <option value="min">Min</option>
                  <option value="max">Max</option>
                </select>
              </label>
            </div>
            <div className="macro-actions">
              <button className="primary" data-testid="pivot-build" onClick={build}>
                Create PivotTable
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
