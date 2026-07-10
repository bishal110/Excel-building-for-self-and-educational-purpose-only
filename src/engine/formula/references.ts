/** A1-style cell references and ranges, including absolute ($) markers. */

export interface CellRef {
  col: number; // 0-based
  row: number; // 0-based
  colAbs: boolean;
  rowAbs: boolean;
}

export interface RangeRef {
  start: CellRef;
  end: CellRef;
}

const A1_RE = /^(\$?)([A-Z]+)(\$?)(\d+)$/i;

/** "A" -> 0, "B" -> 1, "Z" -> 25, "AA" -> 26 */
export function colToNumber(letters: string): number {
  let n = 0;
  const up = letters.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    n = n * 26 + (up.charCodeAt(i) - 64);
  }
  return n - 1;
}

/** 0 -> "A", 25 -> "Z", 26 -> "AA" */
export function numberToCol(n: number): string {
  if (n < 0) throw new Error('column index out of range');
  let s = '';
  let x = n + 1;
  while (x > 0) {
    const rem = (x - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

export function parseCellRef(text: string): CellRef | null {
  const m = A1_RE.exec(text.trim());
  if (!m) return null;
  const [, colDollar, colLetters, rowDollar, rowDigits] = m;
  const row = parseInt(rowDigits!, 10) - 1;
  if (row < 0) return null;
  return {
    col: colToNumber(colLetters!),
    row,
    colAbs: colDollar === '$',
    rowAbs: rowDollar === '$',
  };
}

export function formatCellRef(ref: CellRef): string {
  return (
    (ref.colAbs ? '$' : '') +
    numberToCol(ref.col) +
    (ref.rowAbs ? '$' : '') +
    (ref.row + 1)
  );
}

/** Key used for cell maps: absolute-agnostic "col,row". */
export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function a1Key(text: string): string | null {
  const r = parseCellRef(text);
  return r ? cellKey(r.col, r.row) : null;
}

/** Expand a range into the list of cell coordinates it covers (normalized). */
export function expandRange(range: RangeRef): Array<{ col: number; row: number }> {
  const c1 = Math.min(range.start.col, range.end.col);
  const c2 = Math.max(range.start.col, range.end.col);
  const r1 = Math.min(range.start.row, range.end.row);
  const r2 = Math.max(range.start.row, range.end.row);
  const out: Array<{ col: number; row: number }> = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      out.push({ col: c, row: r });
    }
  }
  return out;
}
