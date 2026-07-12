import { DIV0, NA, NUM, VALUE, isError } from '../errors';
import type { EvalApi } from '../evaluator';
import { CellValue } from '../values';
import type { Node } from '../ast';
import {
  collectNumbers,
  collectValues,
  FuncDef,
  makeCriteria,
  multiCriteriaMatches,
  valueToText,
} from './helpers';

export const statsFunctions: Record<string, FuncDef> = {
  AVERAGE: (args, api) => {
    const nums = collectNumbers(api, args);
    if (isError(nums)) return nums;
    if (nums.length === 0) return DIV0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  },
  COUNT: (args, api) => {
    const nums = collectNumbers(api, args);
    if (isError(nums)) return nums;
    return nums.length;
  },
  COUNTA: (args, api) => {
    const vals = collectValues(api, args);
    if (isError(vals)) return vals;
    return vals.filter((v) => v !== null).length;
  },
  COUNTBLANK: (args, api) => {
    const vals = collectValues(api, args);
    if (isError(vals)) return vals;
    return vals.filter((v) => v === null || v === '').length;
  },
  MAX: (args, api) => {
    const nums = collectNumbers(api, args);
    if (isError(nums)) return nums;
    if (nums.length === 0) return 0;
    return Math.max(...nums);
  },
  MIN: (args, api) => {
    const nums = collectNumbers(api, args);
    if (isError(nums)) return nums;
    if (nums.length === 0) return 0;
    return Math.min(...nums);
  },
  MEDIAN: (args, api) => {
    const nums = collectNumbers(api, args);
    if (isError(nums)) return nums;
    if (nums.length === 0) return NUM;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!;
  },
  STDEV: (args, api) => stdevVar(api, args, true, true),
  STDEVP: (args, api) => stdevVar(api, args, false, true),
  VAR: (args, api) => stdevVar(api, args, true, false),
  VARP: (args, api) => stdevVar(api, args, false, false),
  COUNTIF: (args, api) => {
    const cells = api.rangeCells(args[0]!);
    const crit = api.evalScalar(args[1]!);
    if (isError(crit)) return crit;
    const pred = makeCriteria(crit);
    const values = cells
      ? cells.map((c) => api.ctx.getValue(c.col, c.row))
      : [api.evalScalar(args[0]!)];
    let count = 0;
    for (const v of values) {
      if (isError(v)) continue;
      if (pred(v)) count++;
    }
    return count;
  },
  SUMIF: (args, api) => conditionalAggregate(args, api, 'sum'),
  AVERAGEIF: (args, api) => conditionalAggregate(args, api, 'avg'),
  LARGE: (args, api) => kth(args, api, 'large'),
  SMALL: (args, api) => kth(args, api, 'small'),
  RANK: (args, api) => {
    const x = api.evalScalar(args[0]!);
    if (isError(x)) return x;
    if (typeof x !== 'number') return VALUE;
    const nums = collectNumbers(api, [args[1]!]);
    if (isError(nums)) return nums;
    let ascending = false;
    if (args[2]) {
      const o = api.evalScalar(args[2]);
      if (isError(o)) return o;
      ascending = Boolean(o);
    }
    if (!nums.includes(x)) return NA;
    const better = nums.filter((v) => (ascending ? v < x : v > x)).length;
    return better + 1;
  },
  MODE: (args, api) => {
    const nums = collectNumbers(api, args);
    if (isError(nums)) return nums;
    const counts = new Map<number, number>();
    let best: number | null = null;
    let bestCount = 1;
    for (const v of nums) {
      const c = (counts.get(v) ?? 0) + 1;
      counts.set(v, c);
      if (c > bestCount) {
        best = v;
        bestCount = c;
      }
    }
    return best === null ? NUM : best;
  },
  PERCENTILE: (args, api) => percentileFn(args, api, (p) => p),
  QUARTILE: (args, api) => percentileFn(args, api, (q) => q / 4),
  GEOMEAN: (args, api) => {
    const nums = collectNumbers(api, args);
    if (isError(nums)) return nums;
    if (nums.length === 0 || nums.some((v) => v <= 0)) return NUM;
    const logSum = nums.reduce((a, b) => a + Math.log(b), 0);
    return Math.exp(logSum / nums.length);
  },
  AVEDEV: (args, api) => {
    const nums = collectNumbers(api, args);
    if (isError(nums)) return nums;
    if (nums.length === 0) return NUM;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return nums.reduce((a, b) => a + Math.abs(b - mean), 0) / nums.length;
  },
  COUNTIFS: (args, api) => {
    const matches = multiCriteriaMatches(api, args, 0);
    if (isError(matches)) return matches;
    return matches.length;
  },
  AVERAGEIFS: (args, api) => ifsAggregate(args, api, 'avg'),
  MAXIFS: (args, api) => ifsAggregate(args, api, 'max'),
  MINIFS: (args, api) => ifsAggregate(args, api, 'min'),
  COUNTUNIQUE: (args, api) => {
    // Google Sheets: count distinct non-blank values.
    const vals = collectValues(api, args);
    if (isError(vals)) return vals;
    const seen = new Set<string>();
    for (const v of vals) {
      if (v === null || v === '') continue;
      seen.add(`${typeof v}:${valueToText(v)}`);
    }
    return seen.size;
  },
};

function kth(args: Node[], api: EvalApi, mode: 'large' | 'small'): CellValue {
  const nums = collectNumbers(api, [args[0]!]);
  if (isError(nums)) return nums;
  const kv = args[1] ? api.evalScalar(args[1]) : 1;
  if (isError(kv)) return kv;
  const k = Math.trunc(typeof kv === 'number' ? kv : Number(kv));
  if (!Number.isFinite(k) || k < 1 || k > nums.length) return NUM;
  const sorted = [...nums].sort((a, b) => (mode === 'large' ? b - a : a - b));
  return sorted[k - 1]!;
}

function percentileFn(
  args: Node[],
  api: EvalApi,
  toP: (raw: number) => number,
): CellValue {
  const nums = collectNumbers(api, [args[0]!]);
  if (isError(nums)) return nums;
  if (nums.length === 0) return NUM;
  const raw = args[1] ? api.evalScalar(args[1]) : 0;
  if (isError(raw)) return raw;
  if (typeof raw !== 'number') return VALUE;
  const p = toP(raw);
  if (p < 0 || p > 1) return NUM;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

function ifsAggregate(
  args: Node[],
  api: EvalApi,
  mode: 'avg' | 'max' | 'min',
): CellValue {
  const valueCells = api.rangeCells(args[0]!);
  if (!valueCells) return VALUE;
  const matches = multiCriteriaMatches(api, args, 1);
  if (isError(matches)) return matches;
  const nums: number[] = [];
  for (const i of matches) {
    const c = valueCells[i];
    if (!c) return VALUE;
    const v = api.ctx.getValue(c.col, c.row);
    if (isError(v)) return v;
    if (typeof v === 'number') nums.push(v);
  }
  if (mode === 'avg') return nums.length === 0 ? DIV0 : nums.reduce((a, b) => a + b, 0) / nums.length;
  if (nums.length === 0) return 0;
  return mode === 'max' ? Math.max(...nums) : Math.min(...nums);
}

function stdevVar(
  api: EvalApi,
  args: Node[],
  sample: boolean,
  sqrt: boolean,
): CellValue {
  const nums = collectNumbers(api, args);
  if (isError(nums)) return nums;
  const n = nums.length;
  if (sample && n < 2) return DIV0;
  if (!sample && n < 1) return DIV0;
  const mean = nums.reduce((a, b) => a + b, 0) / n;
  const ss = nums.reduce((a, b) => a + (b - mean) ** 2, 0);
  const variance = ss / (sample ? n - 1 : n);
  return sqrt ? Math.sqrt(variance) : variance;
}

function conditionalAggregate(
  args: Node[],
  api: EvalApi,
  mode: 'sum' | 'avg',
): CellValue {
  const rangeCells = api.rangeCells(args[0]!);
  if (!rangeCells) return VALUE;
  const crit = api.evalScalar(args[1]!);
  if (isError(crit)) return crit;
  const pred = makeCriteria(crit);
  const sumCells = args[2] ? api.rangeCells(args[2]) : rangeCells;
  if (!sumCells) return VALUE;

  let total = 0;
  let count = 0;
  for (let i = 0; i < rangeCells.length; i++) {
    const test = api.ctx.getValue(rangeCells[i]!.col, rangeCells[i]!.row);
    if (isError(test)) return test;
    if (!pred(test)) continue;
    const target = sumCells[i];
    if (!target) continue;
    const v = api.ctx.getValue(target.col, target.row);
    if (isError(v)) return v;
    if (typeof v === 'number') {
      total += v;
      count++;
    }
  }
  if (mode === 'avg') return count === 0 ? DIV0 : total / count;
  return total;
}
