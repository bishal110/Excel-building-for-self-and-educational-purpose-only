import { NA, VALUE, isError } from '../errors';
import { CellValue, toBoolean } from '../values';
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
};

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
