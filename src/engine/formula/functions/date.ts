import { NUM, VALUE, isError } from '../errors';
import { CellValue, toNumber } from '../values';
import { FuncDef, numArg } from './helpers';

/** Serial dates: whole days since 1899-12-30 (Excel-compatible for dates on or
 *  after 1900-03-01; the historical 1900 leap-year bug is intentionally not
 *  reproduced). Documented in KNOWN_LIMITS.md. */
const EPOCH = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

function serialFromYMD(y: number, m: number, d: number): number {
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY_MS);
}

function dateFromSerial(serial: number): Date {
  return new Date(EPOCH + Math.round(serial) * DAY_MS);
}

export const dateFunctions: Record<string, FuncDef> = {
  DATE: (args, api) => {
    const y = numArg(api, args, 0);
    const m = numArg(api, args, 1);
    const d = numArg(api, args, 2);
    if (y === undefined || m === undefined || d === undefined) return VALUE;
    if (isError(y)) return y;
    if (isError(m)) return m;
    if (isError(d)) return d;
    return serialFromYMD(Math.trunc(y), Math.trunc(m), Math.trunc(d));
  },
  YEAR: partFn((dt) => dt.getUTCFullYear()),
  MONTH: partFn((dt) => dt.getUTCMonth() + 1),
  DAY: partFn((dt) => dt.getUTCDate()),
  WEEKDAY: (args, api) => {
    const s = numArg(api, args, 0);
    if (s === undefined) return VALUE;
    if (isError(s)) return s;
    const dow = dateFromSerial(s).getUTCDay(); // 0=Sun
    let type = 1;
    if (args.length > 1) {
      const t = numArg(api, args, 1);
      if (t === undefined || isError(t)) return t ?? VALUE;
      type = Math.trunc(t);
    }
    if (type === 1) return dow + 1; // Sun=1..Sat=7
    if (type === 2) return ((dow + 6) % 7) + 1; // Mon=1..Sun=7
    if (type === 3) return (dow + 6) % 7; // Mon=0..Sun=6
    return NUM;
  },
  DAYS: (args, api) => {
    const end = numArg(api, args, 0);
    const start = numArg(api, args, 1);
    if (end === undefined || start === undefined) return VALUE;
    if (isError(end)) return end;
    if (isError(start)) return start;
    return Math.round(end) - Math.round(start);
  },
  EOMONTH: (args, api) => {
    const s = numArg(api, args, 0);
    const months = numArg(api, args, 1);
    if (s === undefined || months === undefined) return VALUE;
    if (isError(s)) return s;
    if (isError(months)) return months;
    const dt = dateFromSerial(s);
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1 + Math.trunc(months);
    // Day 0 of the next month is the last day of the target month.
    return serialFromYMD(y, m + 1, 0);
  },
};

function partFn(pick: (dt: Date) => number): FuncDef {
  return (args, api) => {
    const s = numArg(api, args, 0);
    if (s === undefined) return VALUE;
    if (isError(s)) return s;
    if (s < 0) return NUM;
    return pick(dateFromSerial(s));
  };
}

export { serialFromYMD };
export type { CellValue };
export { toNumber };
