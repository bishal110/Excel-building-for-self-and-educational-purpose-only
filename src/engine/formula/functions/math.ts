import { DIV0, NUM, VALUE, isError } from '../errors';
import { CellValue } from '../values';
import { collectNumbers, FuncDef, numArg } from './helpers';

const unary = (fn: (x: number) => number, guard?: (x: number) => boolean): FuncDef => {
  return (args, api) => {
    const x = numArg(api, args, 0);
    if (x === undefined) return VALUE;
    if (isError(x)) return x;
    if (guard && !guard(x)) return NUM;
    const r = fn(x);
    return Number.isNaN(r) || !Number.isFinite(r) ? NUM : r;
  };
};

export const mathFunctions: Record<string, FuncDef> = {
  SUM: (args, api) => {
    const nums = collectNumbers(api, args);
    if (isError(nums)) return nums;
    return nums.reduce((a, b) => a + b, 0);
  },
  PRODUCT: (args, api) => {
    const nums = collectNumbers(api, args);
    if (isError(nums)) return nums;
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a * b, 1);
  },
  ABS: unary(Math.abs),
  SIGN: unary(Math.sign),
  SQRT: unary(Math.sqrt, (x) => x >= 0),
  EXP: unary(Math.exp),
  LN: unary(Math.log, (x) => x > 0),
  LOG10: unary(Math.log10, (x) => x > 0),
  INT: unary(Math.floor),
  PI: () => Math.PI,
  POWER: (args, api) => {
    const b = numArg(api, args, 0);
    const e = numArg(api, args, 1);
    if (b === undefined || e === undefined) return VALUE;
    if (isError(b)) return b;
    if (isError(e)) return e;
    const r = Math.pow(b, e);
    return Number.isNaN(r) || !Number.isFinite(r) ? NUM : r;
  },
  LOG: (args, api) => {
    const x = numArg(api, args, 0);
    if (x === undefined) return VALUE;
    if (isError(x)) return x;
    let base = 10;
    if (args.length > 1) {
      const b = numArg(api, args, 1);
      if (b === undefined || isError(b)) return b ?? VALUE;
      base = b;
    }
    if (x <= 0 || base <= 0 || base === 1) return NUM;
    return Math.log(x) / Math.log(base);
  },
  MOD: (args, api) => {
    const a = numArg(api, args, 0);
    const b = numArg(api, args, 1);
    if (a === undefined || b === undefined) return VALUE;
    if (isError(a)) return a;
    if (isError(b)) return b;
    if (b === 0) return DIV0;
    // Excel MOD result takes the sign of the divisor.
    return a - b * Math.floor(a / b);
  },
  ROUND: roundFn((x, f) => Math.round(x * f) / f),
  ROUNDUP: roundFn((x, f) => {
    const scaled = x * f;
    return (x >= 0 ? Math.ceil(scaled) : Math.floor(scaled)) / f;
  }),
  ROUNDDOWN: roundFn((x, f) => {
    const scaled = x * f;
    return (x >= 0 ? Math.floor(scaled) : Math.ceil(scaled)) / f;
  }),
  TRUNC: (args, api) => {
    const x = numArg(api, args, 0);
    if (x === undefined) return VALUE;
    if (isError(x)) return x;
    let digits = 0;
    if (args.length > 1) {
      const d = numArg(api, args, 1);
      if (d === undefined || isError(d)) return d ?? VALUE;
      digits = Math.trunc(d);
    }
    const f = Math.pow(10, digits);
    return Math.trunc(x * f) / f;
  },
  CEILING: (args, api) => {
    const x = numArg(api, args, 0);
    const s = args.length > 1 ? numArg(api, args, 1) : 1;
    if (x === undefined || s === undefined) return VALUE;
    if (isError(x)) return x;
    if (isError(s)) return s;
    if (s === 0) return 0;
    return Math.ceil(x / s) * s;
  },
  FLOOR: (args, api) => {
    const x = numArg(api, args, 0);
    const s = args.length > 1 ? numArg(api, args, 1) : 1;
    if (x === undefined || s === undefined) return VALUE;
    if (isError(x)) return x;
    if (isError(s)) return s;
    if (s === 0) return DIV0;
    return Math.floor(x / s) * s;
  },
};

function roundFn(impl: (x: number, factor: number) => number): FuncDef {
  return (args, api) => {
    const x = numArg(api, args, 0);
    if (x === undefined) return VALUE;
    if (isError(x)) return x;
    let digits = 0;
    if (args.length > 1) {
      const d = numArg(api, args, 1);
      if (d === undefined || isError(d)) return (d as CellValue) ?? VALUE;
      digits = Math.trunc(d);
    }
    const factor = Math.pow(10, digits);
    return impl(x, factor);
  };
}
