import { CYCLE, CellError, VALUE } from '../formula/errors';
import type { Node } from '../formula/ast';
import { parseFormula } from '../formula/parser';
import { evaluate, type EvalContext } from '../formula/evaluator';
import { cellKey, parseCellRef } from '../formula/references';
import { CellValue } from '../formula/values';
import { isFormula, parseLiteral } from './cell';

/**
 * A spreadsheet with formula evaluation, memoized recalculation, and cycle
 * detection. Cells store raw input; values are computed on demand.
 */
export class Sheet {
  name: string;
  private cells = new Map<string, string>();
  private valueCache = new Map<string, CellValue>();
  private astCache = new Map<string, Node | CellError>();

  rowCount: number;
  colCount: number;

  constructor(name = 'Sheet1', rowCount = 100, colCount = 26) {
    this.name = name;
    this.rowCount = rowCount;
    this.colCount = colCount;
  }

  /** Set a cell's raw content. Empty string clears the cell. */
  setRaw(col: number, row: number, raw: string): void {
    const key = cellKey(col, row);
    if (raw === '') this.cells.delete(key);
    else this.cells.set(key, raw);
    // Any edit invalidates cached values (simple, correct recalc).
    this.valueCache.clear();
  }

  getRaw(col: number, row: number): string {
    return this.cells.get(cellKey(col, row)) ?? '';
  }

  hasCell(col: number, row: number): boolean {
    return this.cells.has(cellKey(col, row));
  }

  /** Every non-empty cell as [col, row, raw]. */
  entries(): Array<[number, number, string]> {
    const out: Array<[number, number, string]> = [];
    for (const [key, raw] of this.cells) {
      const [c, r] = key.split(',').map(Number) as [number, number];
      out.push([c, r, raw]);
    }
    return out;
  }

  getValue(col: number, row: number): CellValue {
    return this.evalCell(col, row, new Set());
  }

  /** Set a cell by A1 string, e.g. sheet.setA1('A1', '=B1+1'). */
  setA1(ref: string, raw: string): void {
    const r = parseCellRef(ref);
    if (!r) throw new Error(`Invalid reference: ${ref}`);
    this.setRaw(r.col, r.row, raw);
  }

  /** Get a value by A1 string, e.g. sheet.getA1('A1'). */
  getA1(ref: string): CellValue {
    const r = parseCellRef(ref);
    if (!r) throw new Error(`Invalid reference: ${ref}`);
    return this.getValue(r.col, r.row);
  }

  /** Convenience: value by A1 string, e.g. sheet.get('A1'). */
  private evalCell(col: number, row: number, stack: Set<string>): CellValue {
    const key = cellKey(col, row);
    if (this.valueCache.has(key)) return this.valueCache.get(key)!;
    if (stack.has(key)) return CYCLE;

    const raw = this.cells.get(key);
    if (raw === undefined || raw === '') return null;

    if (!isFormula(raw)) {
      const v = parseLiteral(raw);
      this.valueCache.set(key, v);
      return v;
    }

    stack.add(key);
    let value: CellValue;
    try {
      const ast = this.getAst(raw);
      if (ast instanceof CellError) {
        value = ast;
      } else {
        const ctx: EvalContext = {
          getValue: (c, r) => this.evalCell(c, r, stack),
        };
        value = evaluate(ast, ctx);
      }
    } catch {
      value = VALUE;
    } finally {
      stack.delete(key);
    }
    this.valueCache.set(key, value);
    return value;
  }

  private getAst(raw: string): Node | CellError {
    const cached = this.astCache.get(raw);
    if (cached) return cached;
    let result: Node | CellError;
    try {
      result = parseFormula(raw);
    } catch {
      result = VALUE; // malformed formula → #VALUE!
    }
    this.astCache.set(raw, result);
    return result;
  }

  /** Force a full recompute (clears caches). */
  recalculate(): void {
    this.valueCache.clear();
  }

  clone(): Sheet {
    const s = new Sheet(this.name, this.rowCount, this.colCount);
    for (const [key, raw] of this.cells) s.cells.set(key, raw);
    return s;
  }
}
