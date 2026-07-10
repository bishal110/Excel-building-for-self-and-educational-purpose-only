import { useEffect, useState } from 'react';
import { numberToCol } from '../../engine/formula/references';
import { store } from '../state/store';
import { useStoreVersion } from '../state/useStore';

export function FormulaBar() {
  useStoreVersion();
  const { col, row } = store.selection.active;
  const raw = store.getRaw(col, row);
  const [value, setValue] = useState(raw);

  // Sync local input when the active cell changes.
  useEffect(() => {
    setValue(raw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col, row, raw]);

  const label = `${numberToCol(col)}${row + 1}`;

  return (
    <div className="formula-bar">
      <div className="cell-ref" data-testid="cell-ref">
        {label}
      </div>
      <span className="fx">fx</span>
      <input
        className="formula-input"
        data-testid="formula-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            store.commitCell(col, row, value);
            store.moveActive(0, 1);
          } else if (e.key === 'Escape') {
            setValue(raw);
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={() => store.commitCell(col, row, value)}
      />
    </div>
  );
}
