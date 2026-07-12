import { DIV0, NUM, VALUE, isError } from '../errors';
import { CellValue } from '../values';
import { collectNumbers, FuncDef, multiCriteriaMatches, numArg } from './helpers';

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
  SIN: unary(Math.sin),
  COS: unary(Math.cos),
  TAN: unary(Math.tan),
  ASIN: unary(Math.asin, (x) => x >= -1 && x <= 1),
  ACOS: unary(Math.acos, (x) => x >= -1 && x <= 1),
  ATAN: unary(Math.atan),
  SINH: unary(Math.sinh),
  COSH: unary(Math.cosh),
  TANH: unary(Math.tanh),
  DEGREES: unary((x) => (x * 180) / Math.PI),
  RADIANS: unary((x) => (x * Math.PI) / 180),
  EVEN: unary((x) => Math.sign(x) * Math.ceil(Math.abs(x) / 2) * 2),
  ODD: unary((x) => {
    if (x === 0) return 1;
    const a = Math.ceil(Math.abs(x));
    return Math.sign(x) * (a % 2 === 1 ? a : a + 1);
  }),
  FACT: unary(
    (x) => {
      let r = 1;
      for (let i = 2; i <= Math.trunc(x); i++) r *= i;
      return r;
    },
    (x) => x >= 0 && x <= 170,
  ),
  ATAN2: (args, api) => {
    const x = numArg(api, args, 0);
    const y = numArg(api, args, 1);
    if (x === undefined || y === undefined) return VALUE;
    if (isError(x)) return x;
    if (isError(y)) return y;
    if (x === 0 && y === 0) return DIV0;
    return Math.atan2(y, x); // Excel argument order: ATAN2(x, y)
  },
  MROUND: (args, api) => {
    const x = numArg(api, args, 0);
    const m = numArg(api, args, 1);
    if (x === undefined || m === undefined) return VALUE;
    if (isError(x)) return x;
    if (isError(m)) return m;
    if (m === 0) return 0;
    if (Math.sign(x) !== Math.sign(m) && x !== 0) return NUM;
    return Math.round(x / m) * m;
  },
  QUOTIENT: (args, api) => {
    const a = numArg(api, args, 0);
    const b = numArg(api, args, 1);
    if (a === undefined || b === undefined) return VALUE;
    if (isError(a)) return a;
    if (isError(b)) return b;
    if (b === 0) return DIV0;
    return Math.trunc(a / b);
  },
  GCD: (args, api) => {
    const nums = collectNumbers(api, args);
    if (isError(nums)) return nums;
    if (nums.length === 0) return VALUE;
    if (nums.some((v) => v < 0)) return NUM;
    return nums.map((v) => Math.trunc(v)).reduce(gcd2);
  },
  LCM: (args, api) => {
    const nums = collectNumbers(api, args);
    if (isError(nums)) return nums;
    if (nums.length === 0) return VALUE;
    if (nums.some((v) => v < 0)) return NUM;
    return nums.map((v) => Math.trunc(v)).reduce((a, b) => (a === 0 || b === 0 ? 0 : (a * b) / gcd2(a, b)));
  },
  RAND: () => Math.random(),
  RANDBETWEEN: (args, api) => {
    const lo = numArg(api, args, 0);
    const hi = numArg(api, args, 1);
    if (lo === undefined || hi === undefined) return VALUE;
    if (isError(lo)) return lo;
    if (isError(hi)) return hi;
    const a = Math.ceil(lo);
    const b = Math.floor(hi);
    if (b < a) return NUM;
    return a + Math.floor(Math.random() * (b - a + 1));
  },
  SUMPRODUCT: (args, api) => {
    if (args.length === 0) return VALUE;
    const lists: number[][] = [];
    for (const node of args) {
      const cells = api.rangeCells(node);
      if (!cells) {
        const v = api.evalScalar(node);
        if (isError(v)) return v;
        lists.push([typeof v === 'number' ? v : 0]);
        continue;
      }
      const vals: number[] = [];
      for (const c of cells) {
        const v = api.ctx.getValue(c.col, c.row);
        if (isError(v)) return v;
        vals.push(typeof v === 'number' ? v : 0); // non-numbers count as 0
      }
      lists.push(vals);
    }
    const len = lists[0]!.length;
    if (lists.some((l) => l.length !== len)) return VALUE;
    let total = 0;
    for (let i = 0; i < len; i++) {
      let p = 1;
      for (const l of lists) p *= l[i]!;
      total += p;
    }
    return total;
  },
  SUMIFS: (args, api) => {
    const sumCells = api.rangeCells(args[0]!);
    if (!sumCells) return VALUE;
    const matches = multiCriteriaMatches(api, args, 1);
    if (isError(matches)) return matches;
    let total = 0;
    for (const i of matches) {
      const c = sumCells[i];
      if (!c) return VALUE;
      const v = api.ctx.getValue(c.col, c.row);
      if (isError(v)) return v;
      if (typeof v === 'number') total += v;
    }
    return total;
  },
};

function gcd2(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

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
