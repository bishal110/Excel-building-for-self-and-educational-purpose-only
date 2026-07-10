import { parseCellRef } from '../formula/references';
import { CellValue } from '../formula/values';
import type { Sheet } from '../grid/sheet';

/**
 * Macro runtime: runs user-authored JavaScript against a documented sheet API.
 * Marketed in-app as "Macros (JavaScript, Office-Scripts style)" — never VBA.
 *
 * NOTE: true isolation (blocking DOM/network) is enforced by running this in a
 * Web Worker in the app shell (Phase 2). This module provides the API surface
 * and in-process execution used by the engine and tests. See KNOWN_LIMITS.md.
 */

export interface MacroResult {
  logs: string[];
  error?: string;
}

export interface SheetApi {
  get(ref: string): CellValue;
  getNumber(ref: string): number;
  set(ref: string, value: CellValue): void;
  range(a1range: string): CellValue[][];
  setRange(topLeft: string, values: CellValue[][]): void;
  clear(a1range: string): void;
  log(...args: unknown[]): void;
}

interface Box {
  c1: number;
  r1: number;
  c2: number;
  r2: number;
}

function parseBox(a1range: string): Box {
  const parts = a1range.split(':');
  const a = parseCellRef(parts[0]!.trim());
  if (!a) throw new Error(`Invalid reference: ${a1range}`);
  const b = parts[1] ? parseCellRef(parts[1].trim()) : a;
  if (!b) throw new Error(`Invalid reference: ${a1range}`);
  return {
    c1: Math.min(a.col, b.col),
    r1: Math.min(a.row, b.row),
    c2: Math.max(a.col, b.col),
    r2: Math.max(a.row, b.row),
  };
}

function toRaw(value: CellValue): string {
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

export function createSheetApi(sheet: Sheet, logs: string[]): SheetApi {
  const single = (ref: string) => {
    const r = parseCellRef(ref.trim());
    if (!r) throw new Error(`Invalid reference: ${ref}`);
    return r;
  };
  const api: SheetApi = {
    get(ref) {
      const r = single(ref);
      return sheet.getValue(r.col, r.row);
    },
    getNumber(ref) {
      const v = api.get(ref);
      return typeof v === 'number' ? v : Number(v ?? 0) || 0;
    },
    set(ref, value) {
      const r = single(ref);
      sheet.setRaw(r.col, r.row, toRaw(value));
    },
    range(a1range) {
      const b = parseBox(a1range);
      const out: CellValue[][] = [];
      for (let r = b.r1; r <= b.r2; r++) {
        const row: CellValue[] = [];
        for (let c = b.c1; c <= b.c2; c++) row.push(sheet.getValue(c, r));
        out.push(row);
      }
      return out;
    },
    setRange(topLeft, values) {
      const start = single(topLeft);
      for (let i = 0; i < values.length; i++) {
        const row = values[i]!;
        for (let j = 0; j < row.length; j++) {
          sheet.setRaw(start.col + j, start.row + i, toRaw(row[j] ?? null));
        }
      }
    },
    clear(a1range) {
      const b = parseBox(a1range);
      for (let r = b.r1; r <= b.r2; r++) {
        for (let c = b.c1; c <= b.c2; c++) sheet.setRaw(c, r, '');
      }
    },
    log(...args) {
      logs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    },
  };
  return api;
}

export function runMacro(sheet: Sheet, code: string): MacroResult {
  const logs: string[] = [];
  const api = createSheetApi(sheet, logs);
  try {
    // Shadow common ambient globals to discourage accidental external access.
    const fn = new Function(
      'sheet',
      'console',
      'window',
      'globalThis',
      'document',
      'fetch',
      'process',
      '"use strict";\n' + code,
    );
    fn(
      api,
      { log: api.log },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    return { logs };
  } catch (e) {
    return { logs, error: e instanceof Error ? e.message : String(e) };
  }
}
