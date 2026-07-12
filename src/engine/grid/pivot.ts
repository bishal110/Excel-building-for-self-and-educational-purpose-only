import { CellValue } from '../formula/values';

/**
 * Pivot-table engine: aggregate a rectangular data range (first row = headers)
 * by a row field, an optional column field, and a value field.
 * Pure and UI-free, like the rest of the engine.
 */

export type PivotAgg = 'sum' | 'count' | 'avg' | 'min' | 'max';

export interface PivotConfig {
  /** Index (within the range) of the field whose values become pivot rows. */
  rowField: number;
  /** Optional index of the field whose values become pivot columns. */
  colField: number | null;
  /** Index of the field being aggregated. */
  valueField: number;
  agg: PivotAgg;
}

function keyOf(v: CellValue): string {
  if (v === null || v === '') return '(blank)';
  return String(v);
}

function aggregate(values: number[], counted: number, agg: PivotAgg): number | '' {
  if (agg === 'count') return counted;
  if (values.length === 0) return '';
  switch (agg) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return round(values.reduce((a, b) => a + b, 0) / values.length);
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build the pivot output grid (as raw strings ready for sheet cells).
 * `data` is the selected range including its header row.
 */
export function pivotGrid(data: CellValue[][], cfg: PivotConfig): string[][] {
  const headers = data[0] ?? [];
  const body = data
    .slice(1)
    .filter((row) => row.some((v) => v !== null && v !== ''));

  const rowKeys: string[] = [];
  const colKeys: string[] = [];
  // rowKey -> colKey -> { nums, counted }
  const cells = new Map<string, Map<string, { nums: number[]; counted: number }>>();
  const SINGLE = '__all__';

  for (const row of body) {
    const rk = keyOf(row[cfg.rowField] ?? null);
    const ck = cfg.colField === null ? SINGLE : keyOf(row[cfg.colField] ?? null);
    if (!cells.has(rk)) {
      cells.set(rk, new Map());
      rowKeys.push(rk);
    }
    const byCol = cells.get(rk)!;
    if (!byCol.has(ck)) {
      byCol.set(ck, { nums: [], counted: 0 });
      if (cfg.colField !== null && !colKeys.includes(ck)) colKeys.push(ck);
    }
    const bucket = byCol.get(ck)!;
    const raw = row[cfg.valueField] ?? null;
    if (raw !== null && raw !== '') bucket.counted++;
    if (typeof raw === 'number') bucket.nums.push(raw);
  }

  rowKeys.sort();
  colKeys.sort();
  const cols = cfg.colField === null ? [SINGLE] : colKeys;

  const rowLabel = keyOf(headers[cfg.rowField] ?? null);
  const valueLabel = `${cfg.agg} of ${keyOf(headers[cfg.valueField] ?? null)}`;

  const out: string[][] = [];
  out.push([
    rowLabel,
    ...(cfg.colField === null ? [valueLabel] : cols),
    ...(cfg.colField !== null ? ['Grand Total'] : []),
  ]);

  const colTotals = new Map<string, { nums: number[]; counted: number }>();
  const grand = { nums: [] as number[], counted: 0 };

  for (const rk of rowKeys) {
    const byCol = cells.get(rk)!;
    const rowOut: string[] = [rk];
    const rowAll = { nums: [] as number[], counted: 0 };
    for (const ck of cols) {
      const bucket = byCol.get(ck);
      if (bucket) {
        rowOut.push(String(aggregate(bucket.nums, bucket.counted, cfg.agg)));
        rowAll.nums.push(...bucket.nums);
        rowAll.counted += bucket.counted;
        const ct = colTotals.get(ck) ?? { nums: [], counted: 0 };
        ct.nums.push(...bucket.nums);
        ct.counted += bucket.counted;
        colTotals.set(ck, ct);
      } else {
        rowOut.push('');
      }
    }
    grand.nums.push(...rowAll.nums);
    grand.counted += rowAll.counted;
    if (cfg.colField !== null) {
      rowOut.push(String(aggregate(rowAll.nums, rowAll.counted, cfg.agg)));
    }
    out.push(rowOut);
  }

  // Grand-total row
  const totalRow: string[] = ['Grand Total'];
  for (const ck of cols) {
    const ct = colTotals.get(ck);
    totalRow.push(ct ? String(aggregate(ct.nums, ct.counted, cfg.agg)) : '');
  }
  if (cfg.colField !== null) {
    totalRow.push(String(aggregate(grand.nums, grand.counted, cfg.agg)));
  }
  out.push(totalRow);

  return out;
}
