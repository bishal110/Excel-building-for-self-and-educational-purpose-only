import { VALUE, isError } from '../errors';
import { CellValue, toNumber, toText } from '../values';
import { FuncDef, scalarArg } from './helpers';

function textArg(api: Parameters<FuncDef>[1], args: Parameters<FuncDef>[0], i: number) {
  const v = scalarArg(api, args, i);
  if (v === undefined) return '';
  return toText(v);
}

export const textFunctions: Record<string, FuncDef> = {
  LEN: (args, api) => {
    const s = textArg(api, args, 0);
    if (isError(s)) return s;
    return s.length;
  },
  LOWER: (args, api) => {
    const s = textArg(api, args, 0);
    if (isError(s)) return s;
    return s.toLowerCase();
  },
  UPPER: (args, api) => {
    const s = textArg(api, args, 0);
    if (isError(s)) return s;
    return s.toUpperCase();
  },
  PROPER: (args, api) => {
    const s = textArg(api, args, 0);
    if (isError(s)) return s;
    return s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B\w/g, (c) => c.toLowerCase());
  },
  TRIM: (args, api) => {
    const s = textArg(api, args, 0);
    if (isError(s)) return s;
    return s.replace(/\s+/g, ' ').trim();
  },
  LEFT: (args, api) => sliceFn(args, api, 'left'),
  RIGHT: (args, api) => sliceFn(args, api, 'right'),
  MID: (args, api) => {
    const s = textArg(api, args, 0);
    if (isError(s)) return s;
    const start = toNumber(scalarArg(api, args, 1) ?? 1);
    const len = toNumber(scalarArg(api, args, 2) ?? 0);
    if (isError(start)) return start;
    if (isError(len)) return len;
    if (start < 1 || len < 0) return VALUE;
    return s.substring(start - 1, start - 1 + len);
  },
  CONCAT: concatFn,
  CONCATENATE: concatFn,
  REPT: (args, api) => {
    const s = textArg(api, args, 0);
    if (isError(s)) return s;
    const n = toNumber(scalarArg(api, args, 1) ?? 0);
    if (isError(n)) return n;
    if (n < 0) return VALUE;
    return s.repeat(Math.trunc(n));
  },
  EXACT: (args, api) => {
    const a = textArg(api, args, 0);
    const b = textArg(api, args, 1);
    if (isError(a)) return a;
    if (isError(b)) return b;
    return a === b;
  },
  FIND: (args, api) => findFn(args, api, true),
  SEARCH: (args, api) => findFn(args, api, false),
  SUBSTITUTE: (args, api) => {
    const s = textArg(api, args, 0);
    const oldT = textArg(api, args, 1);
    const newT = textArg(api, args, 2);
    if (isError(s)) return s;
    if (isError(oldT)) return oldT;
    if (isError(newT)) return newT;
    if (oldT === '') return s;
    if (args.length > 3) {
      const which = toNumber(scalarArg(api, args, 3) ?? 0);
      if (isError(which)) return which;
      let idx = -1;
      let from = 0;
      for (let k = 0; k < which; k++) {
        idx = s.indexOf(oldT, from);
        if (idx === -1) return s;
        from = idx + oldT.length;
      }
      return s.slice(0, idx) + newT + s.slice(idx + oldT.length);
    }
    return s.split(oldT).join(newT);
  },
  REPLACE: (args, api) => {
    const s = textArg(api, args, 0);
    if (isError(s)) return s;
    const start = toNumber(scalarArg(api, args, 1) ?? 1);
    const len = toNumber(scalarArg(api, args, 2) ?? 0);
    const newT = textArg(api, args, 3);
    if (isError(start)) return start;
    if (isError(len)) return len;
    if (isError(newT)) return newT;
    if (start < 1 || len < 0) return VALUE;
    const i = start - 1;
    return s.slice(0, i) + newT + s.slice(i + len);
  },
  VALUE: (args, api) => {
    const v = scalarArg(api, args, 0);
    if (v === undefined) return VALUE;
    return toNumber(v);
  },
  TEXT: (args, api) => {
    const v = scalarArg(api, args, 0) ?? '';
    if (isError(v)) return v;
    const fmt = textArg(api, args, 1);
    if (isError(fmt)) return fmt;
    const n = toNumber(v);
    if (isError(n)) return toText(v);
    // Minimal format support: "0", "0.00", "0.0", etc.
    const m = /^0(\.(0+))?$/.exec(fmt.trim());
    if (m) {
      const decimals = m[2] ? m[2].length : 0;
      return n.toFixed(decimals);
    }
    return toText(v);
  },
};

function sliceFn(
  args: Parameters<FuncDef>[0],
  api: Parameters<FuncDef>[1],
  side: 'left' | 'right',
): CellValue {
  const s = textArg(api, args, 0);
  if (isError(s)) return s;
  let n = 1;
  if (args.length > 1) {
    const c = toNumber(scalarArg(api, args, 1) ?? 1);
    if (isError(c)) return c;
    n = Math.trunc(c);
  }
  if (n < 0) return VALUE;
  return side === 'left' ? s.slice(0, n) : n === 0 ? '' : s.slice(-n);
}

function concatFn(args: Parameters<FuncDef>[0], api: Parameters<FuncDef>[1]): CellValue {
  let out = '';
  for (const node of args) {
    const cells = api.rangeCells(node);
    const values = cells
      ? cells.map((c) => api.ctx.getValue(c.col, c.row))
      : [api.evalScalar(node)];
    for (const v of values) {
      const t = toText(v);
      if (isError(t)) return t;
      out += t;
    }
  }
  return out;
}

function findFn(
  args: Parameters<FuncDef>[0],
  api: Parameters<FuncDef>[1],
  caseSensitive: boolean,
): CellValue {
  const needleRaw = textArg(api, args, 0);
  const hayRaw = textArg(api, args, 1);
  if (isError(needleRaw)) return needleRaw;
  if (isError(hayRaw)) return hayRaw;
  let start = 1;
  if (args.length > 2) {
    const s = toNumber(scalarArg(api, args, 2) ?? 1);
    if (isError(s)) return s;
    start = Math.trunc(s);
  }
  if (start < 1) return VALUE;
  const needle = caseSensitive ? needleRaw : needleRaw.toUpperCase();
  const hay = caseSensitive ? hayRaw : hayRaw.toUpperCase();
  const idx = hay.indexOf(needle, start - 1);
  if (idx === -1) return VALUE;
  return idx + 1;
}
