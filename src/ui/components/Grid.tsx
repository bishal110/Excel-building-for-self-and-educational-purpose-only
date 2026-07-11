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
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportH, setViewportH] = useState(600);

  const sheet = store.activeSheet();
  const rowCount = Math.max(sheet.rowCount, 200);
  const colCount = Math.max(sheet.colCount, 52);
  const meta = store.activeMeta();
  const frozenRows = meta.frozenRows;
  const frozenCols = meta.frozenCols;

  const colX = useMemo(() => {
    const xs: number[] = [ROW_HEADER_W];
    for (let c = 0; c < colCount; c++) xs.push(xs[c]! + store.colWidth(c));
    return xs;
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

  // Rows to render = the virtualized window plus any always-visible frozen rows.
  const rowSet = new Set<number>();
  for (let r = 0; r < frozenRows; r++) rowSet.add(r);
  for (let r = firstRow; r <= lastRow; r++) rowSet.add(r);
  const rowsToRender = [...rowSet].sort((a, b) => a - b);

  const box = selectionBox(store.selection);
  const active = store.selection.active;

  const cellLeft = (c: number) => (c < frozenCols ? scrollLeft + colX[c]! : colX[c]!);
  const rowTop = (r: number) =>
    r < frozenRows ? scrollTop + HEADER_H + r * ROW_H : HEADER_H + r * ROW_H;

  const rows = rowsToRender.map((r) => {
    const cells = [];
    for (let c = 0; c < colCount; c++) {
      const inSel = c >= box.c1 && c <= box.c2 && r >= box.r1 && r <= box.r2;
      const isActive = c === active.col && r === active.row;
      const style = store.getStyle(c, r);
      const editing =
        store.editing && store.editing.col === c && store.editing.row === r;
      const frozen = c < frozenCols || r < frozenRows;
      const z =
        (c < frozenCols ? 3 : 0) + (r < frozenRows ? 4 : 0) + (isActive ? 1 : 0);
      cells.push(
        <div
          key={c}
          className={
            'cell' +
            (inSel ? ' selected' : '') +
            (isActive ? ' active' : '') +
            (frozen ? ' frozen' : '')
          }
          data-cell={`${numberToCol(c)}${r + 1}`}
          style={{
            left: cellLeft(c),
            top: rowTop(r),
            width: store.colWidth(c),
            zIndex: z || undefined,
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
    return (
      <div key={r}>
        <div
          className="row-header"
          style={{ left: scrollLeft, top: rowTop(r), width: ROW_HEADER_W }}
        >
          {r + 1}
        </div>
        {cells}
      </div>
    );
  });

  return (
    <div
      className="grid"
      ref={scroller}
      onScroll={(e) => {
        const el = e.target as HTMLDivElement;
        setScrollTop(el.scrollTop);
        setScrollLeft(el.scrollLeft);
      }}
      tabIndex={0}
      data-testid="grid"
    >
      <div className="grid-content" style={{ width: totalWidth, height: totalHeight }}>
        {/* Column header */}
        {Array.from({ length: colCount }, (_, c) => (
          <div
            key={'h' + c}
            className={
              'col-head' +
              (c >= box.c1 && c <= box.c2 ? ' col-selected' : '') +
              (c < frozenCols ? ' frozen' : '')
            }
            style={{ left: cellLeft(c), top: scrollTop, width: store.colWidth(c) }}
          >
            {numberToCol(c)}
            <span className="col-resize" onMouseDown={(e) => startColResize(e, c)} />
          </div>
        ))}
        {/* Corner */}
        <div className="corner" style={{ left: scrollLeft, top: scrollTop, width: ROW_HEADER_W }} />
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
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (store.editInitial !== null) {
      // Type-to-edit: keep typing after the first character — do NOT select
      // it, or the next keystroke would replace it (e.g. "=A1" losing "=").
      const end = el.value.length;
      el.setSelectionRange(end, end);
    } else {
      // F2 / double-click: select existing content for quick overwrite.
      el.select();
    }
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
