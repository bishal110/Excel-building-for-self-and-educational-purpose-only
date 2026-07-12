import type { Node } from '../ast';
import { NA, REF, VALUE, isError } from '../errors';
import type { EvalApi } from '../evaluator';
import { CellValue, toNumber } from '../values';
import { FuncDef } from './helpers';

interface Bounds {
  c1: number;
  r1: number;
  c2: number;
  r2: number;
}

function bounds(node: Node): Bounds | null {
  if (node.kind === 'ref') {
    return { c1: node.ref.col, r1: node.ref.row, c2: node.ref.col, r2: node.ref.row };
  }
  if (node.kind === 'range') {
    return {
      c1: Math.min(node.start.col, node.end.col),
      r1: Math.min(node.start.row, node.end.row),
      c2: Math.max(node.start.col, node.end.col),
      r2: Math.max(node.start.row, node.end.row),
    };
  }
  return null;
}

/** Loose equality used by exact lookups (case-insensitive for text). */
function looseEqual(a: CellValue, b: CellValue): boolean {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.toUpperCase() === b.toUpperCase();
  }
  return a === b;
}

function compareVals(a: CellValue, b: CellValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const as = String(a ?? '').toUpperCase();
  const bs = String(b ?? '').toUpperCase();
  return as < bs ? -1 : as > bs ? 1 : 0;
}

export const lookupFunctions: Record<string, FuncDef> = {
  VLOOKUP: (args, api) => tableLookup(args, api, 'v'),
  HLOOKUP: (args, api) => tableLookup(args, api, 'h'),
  INDEX: (args, api) => {
    const b = bounds(args[0]!);
    if (!b) return REF;
    const rowNum = toNumber(api.evalScalar(args[1]!));
    if (isError(rowNum)) return rowNum;
    let colNum = 1;
    const rows = b.r2 - b.r1 + 1;
    const cols = b.c2 - b.c1 + 1;
    if (args.length > 2) {
      const c = toNumber(api.evalScalar(args[2]!));
      if (isError(c)) return c;
      colNum = c;
    } else if (rows === 1) {
      // Single row: the second arg indexes columns.
      colNum = rowNum;
      return cellAt(api, b, 1, colNum, rows, cols);
    }
    return cellAt(api, b, rowNum, colNum, rows, cols);
  },
  MATCH: (args, api) => {
    const target = api.evalScalar(args[0]!);
    if (isError(target)) return target;
    const b = bounds(args[1]!);
    if (!b) return NA;
    let matchType = 1;
    if (args.length > 2) {
      const m = toNumber(api.evalScalar(args[2]!));
      if (isError(m)) return m;
      matchType = Math.sign(m);
    }
    const list = rangeList(api, b);
    if (matchType === 0) {
      for (let i = 0; i < list.length; i++) {
        if (looseEqual(list[i]!, target)) return i + 1;
      }
      return NA;
    }
    // Approximate match. matchType 1: largest value <= target (ascending).
    // matchType -1: smallest value >= target (descending).
    let best = -1;
    for (let i = 0; i < list.length; i++) {
      const cmp = compareVals(list[i]!, target);
      if (matchType === 1 && cmp <= 0) best = i;
      if (matchType === -1 && cmp >= 0) best = i;
    }
    return best === -1 ? NA : best + 1;
  },
  CHOOSE: (args, api) => {
    const idx = toNumber(api.evalScalar(args[0]!));
    if (isError(idx)) return idx;
    const i = Math.trunc(idx);
    if (i < 1 || i >= args.length) return VALUE;
    return api.evalScalar(args[i]!);
  },
  XLOOKUP: (args, api) => {
    // XLOOKUP(lookup_value, lookup_range, return_range,
    //         [if_not_found], [match_mode 0|-1|1])
    if (args.length < 3) return VALUE;
    const target = api.evalScalar(args[0]!);
    if (isError(target)) return target;
    const lookupCells = api.rangeCells(args[1]!);
    const returnCells = api.rangeCells(args[2]!);
    if (!lookupCells || !returnCells) return VALUE;
    if (lookupCells.length !== returnCells.length) return VALUE;
    let matchMode = 0;
    if (args[4]) {
      const m = toNumber(api.evalScalar(args[4]));
      if (isError(m)) return m;
      matchMode = Math.trunc(m);
      if (matchMode < -1 || matchMode > 1) return VALUE;
    }
    let exact = -1;
    let nearIdx = -1;
    let nearVal: CellValue = null;
    for (let i = 0; i < lookupCells.length; i++) {
      const v = api.ctx.getValue(lookupCells[i]!.col, lookupCells[i]!.row);
      if (isError(v)) continue;
      const cmp = compareVals(v, target);
      if (cmp === 0) {
        exact = i;
        break;
      }
      // match_mode -1: largest value <= target; 1: smallest value >= target.
      if (matchMode === -1 && cmp < 0 && (nearIdx === -1 || compareVals(v, nearVal) > 0)) {
        nearIdx = i;
        nearVal = v;
      }
      if (matchMode === 1 && cmp > 0 && (nearIdx === -1 || compareVals(v, nearVal) < 0)) {
        nearIdx = i;
        nearVal = v;
      }
    }
    const hit = exact !== -1 ? exact : matchMode !== 0 ? nearIdx : -1;
    if (hit === -1) {
      return args[3] ? api.evalScalar(args[3]) : NA;
    }
    const rc = returnCells[hit]!;
    return api.ctx.getValue(rc.col, rc.row);
  },
};

function cellAt(
  api: EvalApi,
  b: Bounds,
  rowNum: number,
  colNum: number,
  rows: number,
  cols: number,
): CellValue {
  const r = Math.trunc(rowNum);
  const c = Math.trunc(colNum);
  if (r < 1 || r > rows || c < 1 || c > cols) return REF;
  return api.ctx.getValue(b.c1 + c - 1, b.r1 + r - 1);
}

function rangeList(api: EvalApi, b: Bounds): CellValue[] {
  const out: CellValue[] = [];
  for (let r = b.r1; r <= b.r2; r++) {
    for (let c = b.c1; c <= b.c2; c++) {
      out.push(api.ctx.getValue(c, r));
    }
  }
  return out;
}

function tableLookup(
  args: Node[],
  api: EvalApi,
  dir: 'v' | 'h',
): CellValue {
  const target = api.evalScalar(args[0]!);
  if (isError(target)) return target;
  const b = bounds(args[1]!);
  if (!b) return REF;
  const indexN = toNumber(api.evalScalar(args[2]!));
  if (isError(indexN)) return indexN;
  const index = Math.trunc(indexN);
  let approx = true;
  if (args.length > 3) {
    const r = api.evalScalar(args[3]!);
    if (isError(r)) return r;
    approx = r === null ? true : Boolean(r) === true && r !== false;
    // Excel: 4th arg FALSE/0 => exact; TRUE/1/omitted => approximate.
    const num = toNumber(r);
    if (!isError(num)) approx = num !== 0;
  }

  const lineCount = dir === 'v' ? b.r2 - b.r1 + 1 : b.c2 - b.c1 + 1;
  const getKey = (i: number): CellValue =>
    dir === 'v' ? api.ctx.getValue(b.c1, b.r1 + i) : api.ctx.getValue(b.c1 + i, b.r1);
  const getResult = (i: number): CellValue =>
    dir === 'v'
      ? api.ctx.getValue(b.c1 + index - 1, b.r1 + i)
      : api.ctx.getValue(b.c1 + i, b.r1 + index - 1);

  const span = dir === 'v' ? b.c2 - b.c1 + 1 : b.r2 - b.r1 + 1;
  if (index < 1 || index > span) return REF;

  if (!approx) {
    for (let i = 0; i < lineCount; i++) {
      if (looseEqual(getKey(i), target)) return getResult(i);
    }
    return NA;
  }
  // Approximate: assume ascending; take largest key <= target.
  let best = -1;
  for (let i = 0; i < lineCount; i++) {
    if (compareVals(getKey(i), target) <= 0) best = i;
    else break;
  }
  return best === -1 ? NA : getResult(best);
}
