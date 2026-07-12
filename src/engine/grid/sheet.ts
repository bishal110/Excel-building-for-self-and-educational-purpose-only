import { CYCLE, CellError, VALUE } from '../formula/errors';
import type { Node } from '../formula/ast';
import { parseFormula } from '../formula/parser';
import { evaluate, type EvalContext } from '../formula/evaluator';
import { cellKey, expandRange, parseCellRef } from '../formula/references';
import { CellValue } from '../formula/values';
import { isFormula, parseLiteral } from './cell';

/** Collect every cell coordinate an AST statically references. */
function extractRefs(node: Node, out: Array<{ col: number; row: number }>): void {
  switch (node.kind) {
    case 'ref':
      out.push({ col: node.ref.col, row: node.ref.row });
      break;
    case 'range':
      for (const c of expandRange({ start: node.start, end: node.end })) out.push(c);
      break;
    case 'call':
      for (const a of node.args) extractRefs(a, out);
      break;
    case 'unary':
    case 'postfix':
      extractRefs(node.operand, out);
      break;
    case 'binary':
      extractRefs(node.left, out);
      extractRefs(node.right, out);
      break;
    default:
      break;
  }
}

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
    else {
      this.cells.set(key, raw);
      // Imported files and programmatic edits can extend beyond the initial
      // viewport. Keep the logical dimensions in sync so those cells render
      // and remain reachable instead of becoming invisible stored data.
      this.colCount = Math.max(this.colCount, col + 1);
      this.rowCount = Math.max(this.rowCount, row + 1);
    }
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
    return this.computeCell(col, row);
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

  /**
   * Resolve a cell's value if it needs no dependency ordering: cached values,
   * empty cells, and literals. Returns undefined for an uncomputed formula.
   */
  private quickValue(key: string): CellValue | undefined {
    if (this.valueCache.has(key)) return this.valueCache.get(key)!;
    const raw = this.cells.get(key);
    if (raw === undefined || raw === '') return null;
    if (!isFormula(raw)) {
      const v = parseLiteral(raw);
      this.valueCache.set(key, v);
      return v;
    }
    return undefined;
  }

  /**
   * Iterative (explicit-stack) topological evaluation. Formula dependencies
   * are computed before their dependents, so arbitrarily deep chains (e.g. a
   * running-total column thousands of rows long) evaluate without recursion
   * and cannot overflow the JS call stack. Back-edges mark cycles as #CYCLE!.
   */
  private computeCell(col: number, row: number): CellValue {
    const rootKey = cellKey(col, row);
    const quick = this.quickValue(rootKey);
    if (quick !== undefined) return quick;

    interface Frame {
      key: string;
      raw: string;
      expanded: boolean;
    }
    const stack: Frame[] = [
      { key: rootKey, raw: this.cells.get(rootKey)!, expanded: false },
    ];
    const inPath = new Set<string>([rootKey]);

    while (stack.length > 0) {
      const top = stack[stack.length - 1]!;
      if (this.valueCache.has(top.key)) {
        inPath.delete(top.key);
        stack.pop();
        continue;
      }

      const ast = this.getAst(top.raw);
      if (ast instanceof CellError) {
        this.valueCache.set(top.key, ast);
        inPath.delete(top.key);
        stack.pop();
        continue;
      }

      if (!top.expanded) {
        top.expanded = true;
        const refs: Array<{ col: number; row: number }> = [];
        extractRefs(ast, refs);
        let pushed = false;
        for (const r of refs) {
          const k = cellKey(r.col, r.row);
          if (this.valueCache.has(k)) continue;
          const raw = this.cells.get(k);
          if (raw === undefined || raw === '') continue; // empty → null on read
          if (!isFormula(raw)) {
            this.valueCache.set(k, parseLiteral(raw));
            continue;
          }
          if (inPath.has(k)) {
            // Back-edge: this dependency is somewhere up the current chain.
            this.valueCache.set(k, CYCLE);
            continue;
          }
          stack.push({ key: k, raw, expanded: false });
          inPath.add(k);
          pushed = true;
        }
        if (pushed) continue; // compute dependencies first
      }

      // All static dependencies are cached — evaluation cannot recurse deeply.
      let value: CellValue;
      try {
        const ctx: EvalContext = {
          getValue: (c, r) => this.cachedRead(c, r),
        };
        value = evaluate(ast, ctx);
      } catch {
        value = VALUE;
      }
      this.valueCache.set(top.key, value);
      inPath.delete(top.key);
      stack.pop();
    }

    return this.valueCache.get(rootKey) ?? null;
  }

  /** Read for the evaluator: everything is cached or a literal by eval time. */
  private cachedRead(col: number, row: number): CellValue {
    const key = cellKey(col, row);
    const v = this.quickValue(key);
    if (v !== undefined) return v;
    // An uncached formula here means a dependency the static walk couldn't
    // order (only possible in a cycle) — treat it as such.
    return CYCLE;
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
