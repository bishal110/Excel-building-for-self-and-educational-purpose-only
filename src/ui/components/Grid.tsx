import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { numberToCol } from '../../engine/formula/references';
import { store, selectionBox } from '../state/store';
import { useStoreVersion } from '../state/useStore';

const ROW_H = 24;
const HEADER_H = 26;
const ROW_HEADER_W = 48;
const OVERSCAN = 6;

export function Grid() {
  useStoreVersion();
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);

  const sheet = store.activeSheet();
  const rowCount = Math.max(sheet.rowCount, 200);
  const colCount = Math.max(sheet.colCount, 52);

  const colX = useMemo(() => {
    const xs: number[] = [ROW_HEADER_W];
    for (let c = 0; c < colCount; c++) xs.push(xs[c]! + store.colWidth(c));
    return xs;
    // Depend on version so width changes recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colCount, store.getVersion()]);
  const totalWidth = colX[colCount]!;
  const totalHeight = HEADER_H + rowCount * ROW_H;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onResize = () => setViewportH(el.clientHeight);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const firstRow = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const lastRow = Math.min(
    rowCount - 1,
    Math.ceil((scrollTop + viewportH) / ROW_H) + OVERSCAN,
  );

  const box = selectionBox(store.selection);
  const active = store.selection.active;

  const rows = [];
  for (let r = firstRow; r <= lastRow; r++) {
    const cells = [];
    for (let c = 0; c < colCount; c++) {
      const inSel = c >= box.c1 && c <= box.c2 && r >= box.r1 && r <= box.r2;
      const isActive = c === active.col && r === active.row;
      const style = store.getStyle(c, r);
      const editing =
        store.editing && store.editing.col === c && store.editing.row === r;
      cells.push(
        <div
          key={c}
          className={
            'cell' + (inSel ? ' selected' : '') + (isActive ? ' active' : '')
          }
          data-cell={`${numberToCol(c)}${r + 1}`}
          style={{
            left: colX[c],
            width: store.colWidth(c),
            fontWeight: style?.bold ? 700 : undefined,
            fontStyle: style?.italic ? 'italic' : undefined,
            textDecoration: style?.underline ? 'underline' : undefined,
            textAlign: style?.align ?? (numericCell(c, r) ? 'right' : 'left'),
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            store.setActive(c, r, e.shiftKey);
          }}
          onMouseEnter={(e) => {
            if (e.buttons === 1) store.setActive(c, r, true);
          }}
          onDoubleClick={() => store.startEditing({ col: c, row: r })}
        >
          {editing ? (
            <CellEditor col={c} row={r} />
          ) : (
            <span className="cell-text">{store.displayText(c, r)}</span>
          )}
        </div>,
      );
    }
    rows.push(
      <div key={r} className="grid-row" style={{ top: HEADER_H + r * ROW_H }}>
        <div className="row-header" style={{ width: ROW_HEADER_W }}>
          {r + 1}
        </div>
        {cells}
      </div>,
    );
  }

  return (
    <div
      className="grid"
      ref={scroller}
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      tabIndex={0}
      data-testid="grid"
    >
      <div className="grid-content" style={{ width: totalWidth, height: totalHeight }}>
        <div className="col-header" style={{ width: totalWidth, height: HEADER_H }}>
          <div className="corner" style={{ width: ROW_HEADER_W }} />
          {Array.from({ length: colCount }, (_, c) => (
            <div
              key={c}
              className={
                'col-head' + (c >= box.c1 && c <= box.c2 ? ' col-selected' : '')
              }
              style={{ left: colX[c], width: store.colWidth(c) }}
            >
              {numberToCol(c)}
              <span
                className="col-resize"
                onMouseDown={(e) => startColResize(e, c)}
              />
            </div>
          ))}
        </div>
        {rows}
      </div>
    </div>
  );
}

function numericCell(col: number, row: number): boolean {
  return typeof store.getValue(col, row) === 'number';
}

function startColResize(e: ReactMouseEvent, col: number) {
  e.preventDefault();
  e.stopPropagation();
  const startX = e.clientX;
  const startW = store.colWidth(col);
  const onMove = (ev: MouseEvent) => {
    store.setColWidth(col, startW + (ev.clientX - startX));
  };
  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function CellEditor({ col, row }: { col: number; row: number }) {
  const [value, setValue] = useState(
    store.editInitial !== null ? store.editInitial : store.getRaw(col, row),
  );
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const commit = (dRow: number, dCol: number) => {
    store.commitCell(col, row, value);
    if (dRow || dCol) store.moveActive(dCol, dRow);
  };
  return (
    <input
      ref={ref}
      className="cell-editor"
      data-testid="cell-editor"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => store.commitCell(col, row, value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit(1, 0);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          commit(0, 1);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          store.stopEditing();
        }
        e.stopPropagation();
      }}
    />
  );
}
