import type { Node } from '../formula/ast';
import { parseFormula } from '../formula/parser';
import type { CellRef } from '../formula/references';
import { isFormula } from './cell';
import { serialize } from './serialize';
import type { Sheet } from './sheet';

type Axis = 'row' | 'col';

interface Shift {
  axis: Axis;
  at: number;
  count: number;
  mode: 'insert' | 'delete';
}

/** Map an index along the shifted axis to its new index, or null if deleted. */
function mapIndex(i: number, s: Shift): number | null {
  if (s.mode === 'insert') {
    return i >= s.at ? i + s.count : i;
  }
  // delete [at, at+count)
  if (i < s.at) return i;
  if (i < s.at + s.count) return null;
  return i - s.count;
}

/** Transform a cell reference; returns null if the reference is destroyed. */
function shiftRef(ref: CellRef, s: Shift): CellRef | null {
  const idx = s.axis === 'row' ? ref.row : ref.col;
  const mapped = mapIndex(idx, s);
  if (mapped === null) return null;
  return s.axis === 'row' ? { ...ref, row: mapped } : { ...ref, col: mapped };
}

/** Transform a range endpoint pair, clamping around deletions/insertions. */
function shiftRange(
  start: CellRef,
  end: CellRef,
  s: Shift,
): { start: CellRef; end: CellRef } | null {
  const lo = s.axis === 'row' ? Math.min(start.row, end.row) : Math.min(start.col, end.col);
  const hi = s.axis === 'row' ? Math.max(start.row, end.row) : Math.max(start.col, end.col);

  if (s.mode === 'insert') {
    let newLo = lo;
    let newHi = hi;
    if (s.at <= lo) {
      newLo = lo + s.count;
      newHi = hi + s.count;
    } else if (s.at <= hi) {
      newHi = hi + s.count; // insertion inside the range grows it
    }
    return buildRange(start, end, s.axis, newLo, newHi);
  }

  // delete
  const delLo = s.at;
  const delHi = s.at + s.count - 1;
  if (lo >= delLo && hi <= delHi) return null; // entire range removed → #REF!

  let newLo = lo;
  let newHi = hi;
  // Clamp start up if it falls inside the deleted band.
  if (lo >= delLo && lo <= delHi) newLo = s.at;
  else if (lo > delHi) newLo = lo - s.count;
  // Clamp end down if it falls inside the deleted band.
  if (hi >= delLo && hi <= delHi) newHi = s.at - 1;
  else if (hi > delHi) newHi = hi - s.count;

  if (newLo > newHi) return null;
  return buildRange(start, end, s.axis, newLo, newHi);
}

function buildRange(
  start: CellRef,
  end: CellRef,
  axis: Axis,
  lo: number,
  hi: number,
): { start: CellRef; end: CellRef } {
  if (axis === 'row') {
    return { start: { ...start, row: lo }, end: { ...end, row: hi } };
  }
  return { start: { ...start, col: lo }, end: { ...end, col: hi } };
}

const REF_ERROR: Node = { kind: 'error', value: '#REF!' };

/** Rewrite references throughout an AST for a shift. Dead refs become #REF!. */
function transform(node: Node, s: Shift): Node {
  switch (node.kind) {
    case 'ref': {
      const r = shiftRef(node.ref, s);
      return r ? { kind: 'ref', ref: r } : REF_ERROR;
    }
    case 'range': {
      const r = shiftRange(node.start, node.end, s);
      return r ? { kind: 'range', start: r.start, end: r.end } : REF_ERROR;
    }
    case 'call':
      return { ...node, args: node.args.map((a) => transform(a, s)) };
    case 'unary':
      return { ...node, operand: transform(node.operand, s) };
    case 'postfix':
      return { ...node, operand: transform(node.operand, s) };
    case 'binary':
      return { ...node, left: transform(node.left, s), right: transform(node.right, s) };
    default:
      return node;
  }
}

function rewriteFormula(raw: string, s: Shift): string {
  if (!isFormula(raw)) return raw;
  try {
    const ast = parseFormula(raw);
    return '=' + serialize(transform(ast, s));
  } catch {
    return raw;
  }
}

function applyShift(sheet: Sheet, s: Shift): void {
  const entries = sheet.entries();
  const rewritten: Array<[number, number, string]> = [];
  for (const [col, row, raw] of entries) {
    const pos = mapIndex(s.axis === 'row' ? row : col, s);
    const newRaw = rewriteFormula(raw, s);
    if (pos === null) continue; // cell itself was deleted
    const newCol = s.axis === 'col' ? pos : col;
    const newRow = s.axis === 'row' ? pos : row;
    rewritten.push([newCol, newRow, newRaw]);
  }
  // Clear then re-add.
  for (const [col, row] of entries) sheet.setRaw(col, row, '');
  for (const [col, row, raw] of rewritten) sheet.setRaw(col, row, raw);
}

export function insertRows(sheet: Sheet, at: number, count = 1): void {
  applyShift(sheet, { axis: 'row', at, count, mode: 'insert' });
  sheet.rowCount += count;
}

export function deleteRows(sheet: Sheet, at: number, count = 1): void {
  applyShift(sheet, { axis: 'row', at, count, mode: 'delete' });
  sheet.rowCount = Math.max(0, sheet.rowCount - count);
}

export function insertCols(sheet: Sheet, at: number, count = 1): void {
  applyShift(sheet, { axis: 'col', at, count, mode: 'insert' });
  sheet.colCount += count;
}

export function deleteCols(sheet: Sheet, at: number, count = 1): void {
  applyShift(sheet, { axis: 'col', at, count, mode: 'delete' });
  sheet.colCount = Math.max(0, sheet.colCount - count);
}
