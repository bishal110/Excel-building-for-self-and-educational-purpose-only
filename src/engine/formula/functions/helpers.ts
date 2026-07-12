import type { Node } from '../ast';
import { CellError, VALUE, isError } from '../errors';
import type { EvalApi } from '../evaluator';
import { CellValue, toNumber } from '../values';

export type FuncDef = (args: Node[], api: EvalApi) => CellValue;

export function argCountError(): CellError {
  return VALUE;
}

/** Evaluate one argument node to a scalar (undefined if the arg is absent). */
export function scalarArg(
  api: EvalApi,
  args: Node[],
  i: number,
): CellValue | undefined {
  const node = args[i];
  if (!node) return undefined;
  return api.evalScalar(node);
}

/** Evaluate one argument node to a number, propagating errors. */
export function numArg(
  api: EvalApi,
  args: Node[],
  i: number,
): number | CellError | undefined {
  const node = args[i];
  if (!node) return undefined;
  return toNumber(api.evalScalar(node));
}

/**
 * Flatten every argument into a numeric list for aggregation.
 * Range/ref cells contribute only their numeric values (text/blank/boolean are
 * skipped, matching Excel SUM over a range). Scalar arguments are coerced.
 * Any error encountered is returned immediately (errors propagate).
 */
export function collectNumbers(api: EvalApi, args: Node[]): number[] | CellError {
  const out: number[] = [];
  for (const node of args) {
    const cells = api.rangeCells(node);
    if (cells) {
      for (const c of cells) {
        const v = api.ctx.getValue(c.col, c.row);
        if (isError(v)) return v;
        if (typeof v === 'number') out.push(v);
        // text / blank / boolean inside a range are ignored
      }
    } else {
      const v = api.evalScalar(node);
      if (isError(v)) return v;
      if (v === null) continue;
      const n = toNumber(v);
      if (isError(n)) return n;
      out.push(n);
    }
  }
  return out;
}

/** Flatten every argument into raw cell values (for COUNTA, lookups, etc.). */
export function collectValues(api: EvalApi, args: Node[]): CellValue[] | CellError {
  const out: CellValue[] = [];
  for (const node of args) {
    const cells = api.rangeCells(node);
    if (cells) {
      for (const c of cells) {
        const v = api.ctx.getValue(c.col, c.row);
        if (isError(v)) return v;
        out.push(v);
      }
    } else {
      const v = api.evalScalar(node);
      if (isError(v)) return v;
      out.push(v);
    }
  }
  return out;
}

/** Build a predicate from an Excel-style criterion (">5", "<=3", "abc", 42). */
export function makeCriteria(
  criterion: CellValue,
): (v: CellValue) => boolean {
  if (isError(criterion)) return () => false;
  if (typeof criterion === 'number') {
    return (v) => typeof v === 'number' && v === criterion;
  }
  if (typeof criterion === 'boolean') {
    return (v) => typeof v === 'boolean' && v === criterion;
  }
  const text = (criterion ?? '').toString().trim();
  const m = /^(<=|>=|<>|<|>|=)(.*)$/.exec(text);
  if (m) {
    const op = m[1]!;
    const rhs = m[2]!.trim();
    const rhsNum = Number(rhs);
    const numeric = rhs !== '' && !Number.isNaN(rhsNum);
    return (v) => {
      if (numeric && typeof v === 'number') {
        switch (op) {
          case '<':
            return v < rhsNum;
          case '>':
            return v > rhsNum;
          case '<=':
            return v <= rhsNum;
          case '>=':
            return v >= rhsNum;
          case '=':
            return v === rhsNum;
          case '<>':
            return v !== rhsNum;
        }
      }
      const vs = valueToText(v).toUpperCase();
      const rs = rhs.toUpperCase();
      if (op === '=') return vs === rs;
      if (op === '<>') return vs !== rs;
      return false;
    };
  }
  // Plain value: equality (case-insensitive for text, numeric-aware).
  const asNum = Number(text);
  if (text !== '' && !Number.isNaN(asNum)) {
    return (v) =>
      (typeof v === 'number' && v === asNum) ||
      valueToText(v).toUpperCase() === text.toUpperCase();
  }
  return (v) => valueToText(v).toUpperCase() === text.toUpperCase();
}

export function valueToText(v: CellValue): string {
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}

/**
 * Evaluate the (range, criterion) pairs of a *IFS function starting at
 * `startIdx` and return the indices (into the first range) where every
 * criterion matches. All ranges must be the same size.
 */
export function multiCriteriaMatches(
  api: EvalApi,
  args: Node[],
  startIdx: number,
): number[] | CellError {
  let size = -1;
  const preds: Array<{ cells: Array<{ col: number; row: number }>; pred: (v: CellValue) => boolean }> = [];
  for (let i = startIdx; i + 1 < args.length; i += 2) {
    const cells = api.rangeCells(args[i]!);
    if (!cells) return VALUE;
    if (size === -1) size = cells.length;
    else if (cells.length !== size) return VALUE;
    const crit = api.evalScalar(args[i + 1]!);
    if (isError(crit)) return crit;
    preds.push({ cells, pred: makeCriteria(crit) });
  }
  if (preds.length === 0) return VALUE;
  const out: number[] = [];
  for (let i = 0; i < size; i++) {
    let ok = true;
    for (const { cells, pred } of preds) {
      const v = api.ctx.getValue(cells[i]!.col, cells[i]!.row);
      if (isError(v) || !pred(v)) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(i);
  }
  return out;
}
