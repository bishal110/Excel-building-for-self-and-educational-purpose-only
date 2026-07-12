import { NA, VALUE, isError } from '../errors';
import { CellValue, toBoolean, toNumber } from '../values';
import { collectValues, FuncDef } from './helpers';

export const logicalFunctions: Record<string, FuncDef> = {
  TRUE: () => true,
  FALSE: () => false,
  NOT: (args, api) => {
    const b = toBoolean(api.evalScalar(args[0]!));
    if (isError(b)) return b;
    return !b;
  },
  IF: (args, api) => {
    // Lazy: only the taken branch is evaluated (so IF(TRUE,1,1/0) is 1).
    if (args.length < 2) return VALUE;
    const cond = toBoolean(api.evalScalar(args[0]!));
    if (isError(cond)) return cond;
    if (cond) return api.evalScalar(args[1]!);
    return args[2] ? api.evalScalar(args[2]) : false;
  },
  IFERROR: (args, api) => {
    const v = api.evalScalar(args[0]!);
    if (isError(v)) return args[1] ? api.evalScalar(args[1]) : '';
    return v;
  },
  IFNA: (args, api) => {
    const v = api.evalScalar(args[0]!);
    if (isError(v) && v.kind === '#N/A') return args[1] ? api.evalScalar(args[1]) : '';
    return v;
  },
  AND: (args, api) => boolReduce(args, api, 'and'),
  OR: (args, api) => boolReduce(args, api, 'or'),
  XOR: (args, api) => {
    const vals = collectValues(api, args);
    if (isError(vals)) return vals;
    let trues = 0;
    for (const v of vals) {
      if (v === null) continue;
      const b = toBoolean(v);
      if (isError(b)) return b;
      if (b) trues++;
    }
    return trues % 2 === 1;
  },
  NA: () => NA,
  IFS: (args, api) => {
    // Lazy pairs: IFS(cond1, val1, cond2, val2, ...) — first true wins.
    if (args.length < 2 || args.length % 2 !== 0) return VALUE;
    for (let i = 0; i + 1 < args.length; i += 2) {
      const cond = toBoolean(api.evalScalar(args[i]!));
      if (isError(cond)) return cond;
      if (cond) return api.evalScalar(args[i + 1]!);
    }
    return NA; // no condition matched
  },
  SWITCH: (args, api) => {
    // SWITCH(expr, case1, val1, [case2, val2, ...], [default])
    if (args.length < 3) return VALUE;
    const expr = api.evalScalar(args[0]!);
    if (isError(expr)) return expr;
    let i = 1;
    for (; i + 1 < args.length; i += 2) {
      const c = api.evalScalar(args[i]!);
      if (isError(c)) return c;
      if (c === expr) return api.evalScalar(args[i + 1]!);
    }
    // Odd trailing argument is the default.
    if (i < args.length) return api.evalScalar(args[i]!);
    return NA;
  },
  ISBLANK: isFn((v) => v === null || v === ''),
  ISNUMBER: isFn((v) => typeof v === 'number'),
  ISTEXT: isFn((v) => typeof v === 'string'),
  ISNONTEXT: isFn((v) => typeof v !== 'string'),
  ISLOGICAL: isFn((v) => typeof v === 'boolean'),
  ISEVEN: parityFn(0),
  ISODD: parityFn(1),
  ISERROR: errFn(() => true),
  ISERR: errFn((kind) => kind !== '#N/A'),
  ISNA: errFn((kind) => kind === '#N/A', false),
  N: (args, api) => {
    // Excel N(): numbers pass through, TRUE=1, dates are already serials,
    // text and blanks become 0, errors propagate.
    const v = api.evalScalar(args[0]!);
    if (isError(v)) return v;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return 0;
  },
};

function isFn(pred: (v: CellValue) => boolean): FuncDef {
  return (args, api) => {
    if (!args[0]) return VALUE;
    const v = api.evalScalar(args[0]);
    if (isError(v)) return false; // errors are not blank/number/text/logical
    return pred(v);
  };
}

function parityFn(remainder: 0 | 1): FuncDef {
  return (args, api) => {
    if (!args[0]) return VALUE;
    const n = toNumber(api.evalScalar(args[0]));
    if (isError(n)) return n;
    return Math.abs(Math.trunc(n)) % 2 === remainder;
  };
}

function errFn(match: (kind: string) => boolean, resultForValue = false): FuncDef {
  return (args, api) => {
    if (!args[0]) return VALUE;
    const v = api.evalScalar(args[0]);
    if (isError(v)) return match(v.kind);
    return resultForValue;
  };
}

function boolReduce(
  args: Parameters<FuncDef>[0],
  api: Parameters<FuncDef>[1],
  mode: 'and' | 'or',
): CellValue {
  const vals = collectValues(api, args);
  if (isError(vals)) return vals;
  let any = false;
  let result = mode === 'and';
  for (const v of vals) {
    if (v === null || typeof v === 'string') continue; // Excel ignores text/blank
    const b = toBoolean(v);
    if (isError(b)) return b;
    any = true;
    result = mode === 'and' ? result && b : result || b;
  }
  if (!any) return VALUE;
  return result;
}
