import { useEffect, useRef, useState } from 'react';
import { numberToCol } from '../../engine/formula/references';
import { store } from '../state/store';
import { useStoreVersion } from '../state/useStore';

export function FormulaBar() {
  useStoreVersion();
  const { col, row } = store.selection.active;
  const raw = store.getRaw(col, row);
  const [value, setValue] = useState(raw);
  const cancelCommitRef = useRef(false);

  // Sync local input when the active cell changes.
  useEffect(() => {
    setValue(raw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col, row, raw]);

  const label = `${numberToCol(col)}${row + 1}`;

  return (
    <div className="formula-bar">
      <div className="cell-ref" data-testid="cell-ref" title="Active cell" aria-label={`Active cell ${label}`}>
        {label}
      </div>
      <span className="formula-divider" aria-hidden="true" />
      <span className="fx" aria-hidden="true">fx</span>
      <label className="sr-only" htmlFor="formula-input">Formula or cell value</label>
      <input
        id="formula-input"
        className="formula-input"
        data-testid="formula-input"
        autoComplete="off"
        spellCheck={false}
        placeholder="Enter a value or formula"
        value={value}
        onChange={(e) => {
          cancelCommitRef.current = false;
          setValue(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            store.commitCell(col, row, value);
            store.moveActive(0, 1);
          } else if (e.key === 'Escape') {
            cancelCommitRef.current = true;
            setValue(raw);
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={() => {
          if (cancelCommitRef.current) {
            cancelCommitRef.current = false;
            return;
          }
          store.commitCell(col, row, value);
        }}
      />
    </div>
  );
}
