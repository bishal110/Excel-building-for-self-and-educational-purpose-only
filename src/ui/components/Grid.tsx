import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { numberToCol } from '../../engine/formula/references';
import { store, selectionBox } from '../state/store';
import { useStoreVersion } from '../state/useStore';

const ROW_H = 24;
const HEADER_H = 26;
const ROW_HEADER_W = 48;
const OVERSCAN = 6;

/**
 * Bridge between grid cells and the live cell editor for Excel-style
 * "point mode": while typing a formula, clicking a cell inserts its
 * reference instead of committing the edit. The editor registers itself
 * here on mount; tryPointRef returns true when it consumed the click.
 */
export const editorBridge: {
  tryPointRef: ((ref: string, extend: boolean) => boolean) | null;
} = { tryPointRef: null };

export function Grid() {
  useStoreVersion();
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  // Anchor cell of an in-progress point-mode click (for drag-to-range).
  const pointAnchor = useRef<{ col: number; row: number } | null>(null);
  // Live preview of a fill-handle drag (covers source + fill target).
  const [fillPreview, setFillPreview] = useState<{
    c1: number;
    r1: number;
    c2: number;
    r2: number;
  } | null>(null);

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

  /** Excel-style fill handle: drag the corner square to copy/extend. */
  const startFillDrag = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const src = selectionBox(store.selection);
    const el = scroller.current;
    if (!el) return;
    const hitCell = (ev: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ev.clientX - rect.left + el.scrollLeft;
      const y = ev.clientY - rect.top + el.scrollTop;
      let col = 0;
      for (let c = 0; c < colCount; c++) if (colX[c]! <= x) col = c;
      const row = Math.max(0, Math.min(rowCount - 1, Math.floor((y - HEADER_H) / ROW_H)));
      return { col, row };
    };
    const plan = (ev: MouseEvent) => {
      const h = hitCell(ev);
      const down = h.row - src.r2;
      const up = src.r1 - h.row;
      const right = h.col - src.c2;
      const left = src.c1 - h.col;
      const best = Math.max(down, up, right, left, 0);
      if (best === 0) return null;
      if (best === down) return { dir: 'down' as const, count: down };
      if (best === up) return { dir: 'up' as const, count: up };
      if (best === right) return { dir: 'right' as const, count: right };
      return { dir: 'left' as const, count: left };
    };
    const previewFor = (p: { dir: string; count: number } | null) => {
      if (!p) return { ...src };
      if (p.dir === 'down') return { ...src, r2: src.r2 + p.count };
      if (p.dir === 'up') return { ...src, r1: src.r1 - p.count };
      if (p.dir === 'right') return { ...src, c2: src.c2 + p.count };
      return { ...src, c1: src.c1 - p.count };
    };
    const onMove = (ev: MouseEvent) => setFillPreview(previewFor(plan(ev)));
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setFillPreview(null);
      const p = plan(ev);
      if (p) store.autoFill(src, p.dir, p.count);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    setFillPreview({ ...src });
  };

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
          role="gridcell"
          aria-colindex={c + 1}
          aria-rowindex={r + 1}
          aria-selected={inSel}
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
            // Point mode: while typing a formula, a click on another cell
            // inserts its reference into the editor instead of committing.
            const ed = store.editing;
            if (ed && !(ed.col === c && ed.row === r) && editorBridge.tryPointRef) {
              if (editorBridge.tryPointRef(`${numberToCol(c)}${r + 1}`, false)) {
                pointAnchor.current = { col: c, row: r };
                return;
              }
            }
            pointAnchor.current = null;
            store.setActive(c, r, e.shiftKey);
          }}
          onMouseEnter={(e) => {
            if (e.buttons !== 1) return;
            const anchor = pointAnchor.current;
            if (anchor && store.editing && editorBridge.tryPointRef) {
              // Drag during point mode extends the pointed ref to a range.
              const c1 = Math.min(anchor.col, c);
              const r1 = Math.min(anchor.row, r);
              const c2 = Math.max(anchor.col, c);
              const r2 = Math.max(anchor.row, r);
              const ref =
                c1 === c2 && r1 === r2
                  ? `${numberToCol(c1)}${r1 + 1}`
                  : `${numberToCol(c1)}${r1 + 1}:${numberToCol(c2)}${r2 + 1}`;
              editorBridge.tryPointRef(ref, true);
              return;
            }
            store.setActive(c, r, true);
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
      <div key={r} role="row">
        <div
          role="rowheader"
          className={'row-header' + (r >= box.r1 && r <= box.r2 ? ' row-selected' : '')}
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
      role="grid"
      aria-label="Spreadsheet grid"
      aria-rowcount={rowCount}
      aria-colcount={colCount}
      aria-multiselectable="true"
    >
      <div className="grid-content" style={{ width: totalWidth, height: totalHeight }}>
        {/* Column header */}
        {Array.from({ length: colCount }, (_, c) => (
          <div
            key={'h' + c}
            role="columnheader"
            aria-colindex={c + 1}
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
        <button
          className="corner"
          style={{ left: scrollLeft, top: scrollTop, width: ROW_HEADER_W }}
          title="Select all cells"
          aria-label="Select all cells"
          onClick={() => store.selectAll()}
        />
        {rows}
        {/* Fill handle at the bottom-right of the selection (hidden while editing) */}
        {!store.editing && (
          <div
            className="fill-handle"
            data-testid="fill-handle"
            title="Drag to fill (copy values, extend series, adjust formulas)"
            style={{
              left: cellLeft(box.c2) + store.colWidth(box.c2) - 4,
              top: rowTop(box.r2) + ROW_H - 4,
            }}
            onMouseDown={startFillDrag}
          />
        )}
        {fillPreview && (
          <div
            className="fill-preview"
            style={{
              left: cellLeft(fillPreview.c1),
              top: rowTop(fillPreview.r1),
              width: colX[fillPreview.c2 + 1]! - colX[fillPreview.c1]!,
              height: (fillPreview.r2 - fillPreview.r1 + 1) * ROW_H,
            }}
          />
        )}
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

/** True when a formula's tail can take a reference: right after `=`, an
 *  operator, an open paren, or an argument separator. */
function refInsertable(v: string): boolean {
  return v.startsWith('=') && /[=+\-*/^&%<>(,;:]\s*$/.test(v);
}

function CellEditor({ col, row }: { col: number; row: number }) {
  const [value, setValue] = useState(
    store.editInitial !== null ? store.editInitial : store.getRaw(col, row),
  );
  const ref = useRef<HTMLInputElement>(null);
  // Start index of the reference inserted by point mode; typing clears it.
  const pointStart = useRef<number | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    editorBridge.tryPointRef = (cellRef: string, extend: boolean) => {
      const v = valueRef.current;
      if (extend && pointStart.current !== null) {
        // Drag: replace the pointed ref with the range.
        setValue(v.slice(0, pointStart.current) + cellRef);
        return true;
      }
      if (pointStart.current !== null) {
        // A second click replaces the previously pointed ref.
        setValue(v.slice(0, pointStart.current) + cellRef);
        return true;
      }
      if (refInsertable(v)) {
        pointStart.current = v.length;
        setValue(v + cellRef);
        return true;
      }
      return false; // formula is complete — let the click commit as usual
    };
    return () => {
      editorBridge.tryPointRef = null;
    };
  }, []);

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
      onChange={(e) => {
        pointStart.current = null; // typing ends point mode
        setValue(e.target.value);
      }}
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
