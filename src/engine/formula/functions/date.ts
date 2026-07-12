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
  /** Volatile in Excel; here it evaluates when the cell recalculates
   *  (on edit / file open), which is documented in KNOWN_LIMITS. */
  TODAY: () => Math.floor((Date.now() - EPOCH) / DAY_MS),
  NOW: () => (Date.now() - EPOCH) / DAY_MS,
  TIME: (args, api) => {
    const h = numArg(api, args, 0);
    const m = numArg(api, args, 1);
    const s = numArg(api, args, 2);
    if (h === undefined || m === undefined || s === undefined) return VALUE;
    if (isError(h)) return h;
    if (isError(m)) return m;
    if (isError(s)) return s;
    const frac = (Math.trunc(h) * 3600 + Math.trunc(m) * 60 + Math.trunc(s)) / 86_400;
    return frac - Math.floor(frac); // wraps at 24h like Excel
  },
  HOUR: timePartFn((secs) => Math.floor(secs / 3600) % 24),
  MINUTE: timePartFn((secs) => Math.floor(secs / 60) % 60),
  SECOND: timePartFn((secs) => Math.floor(secs) % 60),
  EDATE: (args, api) => {
    const s = numArg(api, args, 0);
    const months = numArg(api, args, 1);
    if (s === undefined || months === undefined) return VALUE;
    if (isError(s)) return s;
    if (isError(months)) return months;
    const dt = dateFromSerial(s);
    const target = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + Math.trunc(months), 1));
    // Clamp the day to the target month's length (Jan 31 + 1mo = Feb 28/29).
    const lastDay = serialFromYMD(target.getUTCFullYear(), target.getUTCMonth() + 2, 0);
    const wanted = serialFromYMD(target.getUTCFullYear(), target.getUTCMonth() + 1, dt.getUTCDate());
    return Math.min(wanted, lastDay);
  },
  DATEDIF: (args, api) => {
    const start = numArg(api, args, 0);
    const end = numArg(api, args, 1);
    if (start === undefined || end === undefined || !args[2]) return VALUE;
    if (isError(start)) return start;
    if (isError(end)) return end;
    const unitV = api.evalScalar(args[2]);
    if (isError(unitV)) return unitV;
    const unit = String(unitV ?? '').toUpperCase();
    if (end < start) return NUM;
    const a = dateFromSerial(start);
    const b = dateFromSerial(end);
    const wholeMonths =
      (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
      (b.getUTCMonth() - a.getUTCMonth()) -
      (b.getUTCDate() < a.getUTCDate() ? 1 : 0);
    switch (unit) {
      case 'D':
        return Math.round(end) - Math.round(start);
      case 'M':
        return wholeMonths;
      case 'Y':
        return Math.floor(wholeMonths / 12);
      case 'YM':
        return wholeMonths % 12;
      case 'MD': {
        // Days ignoring months and years.
        const anchor = serialFromYMD(
          b.getUTCFullYear(),
          b.getUTCMonth() + (b.getUTCDate() < a.getUTCDate() ? 0 : 1),
          a.getUTCDate(),
        );
        return Math.round(end) - anchor;
      }
      case 'YD': {
        // Days ignoring years.
        const yearsBetween = Math.floor(wholeMonths / 12);
        const anchor = serialFromYMD(a.getUTCFullYear() + yearsBetween, a.getUTCMonth() + 1, a.getUTCDate());
        return Math.round(end) - anchor;
      }
      default:
        return NUM;
    }
  },
  WEEKNUM: (args, api) => {
    const s = numArg(api, args, 0);
    if (s === undefined) return VALUE;
    if (isError(s)) return s;
    const dt = dateFromSerial(s);
    const jan1 = serialFromYMD(dt.getUTCFullYear(), 1, 1);
    const jan1Dow = dateFromSerial(jan1).getUTCDay(); // 0=Sun
    // System 1, Sunday start: the week containing Jan 1 is week 1.
    return Math.floor((Math.round(s) - jan1 + jan1Dow) / 7) + 1;
  },
};

function timePartFn(pick: (secondsIntoDay: number) => number): FuncDef {
  return (args, api) => {
    const s = numArg(api, args, 0);
    if (s === undefined) return VALUE;
    if (isError(s)) return s;
    if (s < 0) return NUM;
    const frac = s - Math.floor(s);
    return pick(Math.round(frac * 86_400));
  };
}

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
