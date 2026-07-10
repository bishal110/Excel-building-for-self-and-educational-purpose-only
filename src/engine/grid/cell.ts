import { CellError, errorFromText } from '../formula/errors';
import { CellValue } from '../formula/values';

export interface CellData {
  raw: string;
}

/** Parse a non-formula raw string into a literal cell value. */
export function parseLiteral(raw: string): CellValue {
  if (raw === '') return null;
  // Leading apostrophe forces text (and is stripped).
  if (raw.startsWith("'")) return raw.slice(1);
  const err = errorFromText(raw);
  if (err) return err;
  const up = raw.trim().toUpperCase();
  if (up === 'TRUE') return true;
  if (up === 'FALSE') return false;
  const trimmed = raw.trim();
  if (trimmed !== '' && !Number.isNaN(Number(trimmed)) && /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(trimmed)) {
    return Number(trimmed);
  }
  return raw;
}

export function isFormula(raw: string): boolean {
  return raw.startsWith('=') && raw.length > 1;
}

export type { CellError };
