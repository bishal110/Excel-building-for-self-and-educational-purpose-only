import { Sheet } from './grid/sheet';
import { CellValue } from './formula/values';
import { isError } from './formula/errors';

/** Evaluate a formula in cell Z100 of a fresh sheet after optional setup. */
export function evalF(formula: string, setup?: (s: Sheet) => void): CellValue {
  const s = new Sheet();
  setup?.(s);
  s.setA1('Z100', formula.startsWith('=') ? formula : '=' + formula);
  return s.getA1('Z100');
}

/** Return the error kind string, or the value itself if not an error. */
export function kindOf(v: CellValue): string | CellValue {
  return isError(v) ? v.kind : v;
}

/** Build a sheet from a column-major or A1 map of raw strings. */
export function sheetWith(cells: Record<string, string>): Sheet {
  const s = new Sheet();
  for (const [ref, raw] of Object.entries(cells)) s.setA1(ref, raw);
  return s;
}
