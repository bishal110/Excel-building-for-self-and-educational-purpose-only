import { DIV0, NUM, VALUE, isError } from '../errors';
import type { EvalApi } from '../evaluator';
import { CellValue } from '../values';
import type { Node } from '../ast';
import {
  collectNumbers,
  collectValues,
  FuncDef,
  makeCriteria,
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
};

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
