import type { Node } from '../formula/ast';
import { parseFormula } from '../formula/parser';
import type { CellRef } from '../formula/references';
import { CellValue } from '../formula/values';
import { isFormula } from './cell';
import { serialize } from './serialize';
import type { Sheet } from './sheet';

function offsetRef(ref: CellRef, dCol: number, dRow: number): CellRef {
  return {
    ...ref,
    col: ref.colAbs ? ref.col : ref.col + dCol,
    row: ref.rowAbs ? ref.row : ref.row + dRow,
  };
}

function offsetNode(node: Node, dCol: number, dRow: number): Node {
  switch (node.kind) {
    case 'ref':
      return { kind: 'ref', ref: offsetRef(node.ref, dCol, dRow) };
    case 'range':
      return {
        kind: 'range',
        start: offsetRef(node.start, dCol, dRow),
        end: offsetRef(node.end, dCol, dRow),
      };
    case 'call':
      return { ...node, args: node.args.map((a) => offsetNode(a, dCol, dRow)) };
    case 'unary':
    case 'postfix':
      return { ...node, operand: offsetNode(node.operand, dCol, dRow) };
    case 'binary':
      return {
        ...node,
        left: offsetNode(node.left, dCol, dRow),
        right: offsetNode(node.right, dCol, dRow),
      };
    default:
      return node;
  }
}

/** Copy a formula/value from one cell to another with relative-ref adjustment. */
export function offsetFormula(raw: string, dCol: number, dRow: number): string {
  if (!isFormula(raw)) return raw;
  try {
    return '=' + serialize(offsetNode(parseFormula(raw), dCol, dRow));
  } catch {
    return raw;
  }
}

/** Fill the source cell down through the rows below it in the same column. */
export function fillDown(sheet: Sheet, col: number, fromRow: number, toRow: number): void {
  const src = sheet.getRaw(col, fromRow);
  for (let r = fromRow + 1; r <= toRow; r++) {
    sheet.setRaw(col, r, offsetFormula(src, 0, r - fromRow));
  }
}

/** Fill the source cell right through the columns beside it in the same row. */
export function fillRight(sheet: Sheet, row: number, fromCol: number, toCol: number): void {
  const src = sheet.getRaw(fromCol, row);
  for (let c = fromCol + 1; c <= toCol; c++) {
    sheet.setRaw(c, row, offsetFormula(src, c - fromCol, 0));
  }
}

export interface SortSpec {
  c1: number;
  r1: number;
  c2: number;
  r2: number;
  keyCol: number; // absolute column index
  ascending?: boolean;
}

function sortValue(v: CellValue): { rank: number; num: number; str: string } {
  if (typeof v === 'number') return { rank: 1, num: v, str: '' };
  if (typeof v === 'string') return { rank: 2, num: 0, str: v.toUpperCase() };
  if (typeof v === 'boolean') return { rank: 3, num: v ? 1 : 0, str: '' };
  return { rank: 4, num: 0, str: '' }; // blanks last
}

/** Sort the rows of a range by a key column (moves raw cell contents). */
export function sortRange(sheet: Sheet, spec: SortSpec): void {
  const asc = spec.ascending !== false;
  const rows: Array<{ key: CellValue; raws: string[] }> = [];
  for (let r = spec.r1; r <= spec.r2; r++) {
    const raws: string[] = [];
    for (let c = spec.c1; c <= spec.c2; c++) raws.push(sheet.getRaw(c, r));
    rows.push({ key: sheet.getValue(spec.keyCol, r), raws });
  }
  rows.sort((a, b) => {
    const sa = sortValue(a.key);
    const sb = sortValue(b.key);
    let cmp: number;
    if (sa.rank !== sb.rank) cmp = sa.rank - sb.rank;
    else if (sa.rank === 1) cmp = sa.num - sb.num;
    else cmp = sa.str < sb.str ? -1 : sa.str > sb.str ? 1 : 0;
    return asc ? cmp : -cmp;
  });
  for (let i = 0; i < rows.length; i++) {
    const r = spec.r1 + i;
    const raws = rows[i]!.raws;
    for (let j = 0; j < raws.length; j++) {
      sheet.setRaw(spec.c1 + j, r, raws[j]!);
    }
  }
}

export interface FindReplaceOptions {
  matchCase?: boolean;
  wholeCell?: boolean;
}

/** Replace text in raw cell contents. Returns the number of cells changed. */
export function findReplace(
  sheet: Sheet,
  find: string,
  replace: string,
  opts: FindReplaceOptions = {},
): number {
  if (find === '') return 0;
  let changed = 0;
  for (const [col, row, raw] of sheet.entries()) {
    let next: string;
    if (opts.wholeCell) {
      const eq = opts.matchCase ? raw === find : raw.toUpperCase() === find.toUpperCase();
      if (!eq) continue;
      next = replace;
    } else {
      next = replaceAll(raw, find, replace, opts.matchCase ?? false);
    }
    if (next !== raw) {
      sheet.setRaw(col, row, next);
      changed++;
    }
  }
  return changed;
}

function replaceAll(hay: string, find: string, repl: string, matchCase: boolean): string {
  if (matchCase) return hay.split(find).join(repl);
  let out = '';
  let i = 0;
  const lowHay = hay.toLowerCase();
  const lowFind = find.toLowerCase();
  while (i < hay.length) {
    if (lowHay.startsWith(lowFind, i)) {
      out += repl;
      i += find.length;
    } else {
      out += hay[i];
      i++;
    }
  }
  return out;
}
