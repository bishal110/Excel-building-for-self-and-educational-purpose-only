import { CellError, VALUE, isError } from './errors';

/** A computed cell value. `null` represents an empty cell. */
export type CellValue = number | string | boolean | CellError | null;

export function toNumber(v: CellValue): number | CellError {
  if (isError(v)) return v;
  if (v === null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const trimmed = v.trim();
  if (trimmed === '') return VALUE;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return VALUE;
  return n;
}

export function toText(v: CellValue): string | CellError {
  if (isError(v)) return v;
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return numberToText(v);
  return v;
}

export function numberToText(n: number): string {
  if (Object.is(n, -0)) return '0';
  return String(n);
}

export function toBoolean(v: CellValue): boolean | CellError {
  if (isError(v)) return v;
  if (v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const up = v.trim().toUpperCase();
  if (up === 'TRUE') return true;
  if (up === 'FALSE') return false;
  return VALUE;
}

export function isBlank(v: CellValue): boolean {
  return v === null;
}
