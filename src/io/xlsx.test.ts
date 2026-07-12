import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { readXlsx, readXlsxWorkbook, writeXlsx } from './xlsx';

describe('xlsx round-trip', () => {
  it('preserves text, numbers, and formulas', async () => {
    const rows = [
      ['Well', 'WHP', 'Total'],
      ['A-1', '3200', '=B2*2'],
      ['A-2', '3185', ''],
    ];
    const blob = writeXlsx(rows);
    expect(blob).toBeInstanceOf(Blob);

    // readXlsx only needs an object with arrayBuffer(); a Blob suffices.
    const back = await readXlsx(blob as unknown as File);
    expect(back[0]).toEqual(['Well', 'WHP', 'Total']);
    expect(back[1]![0]).toBe('A-1');
    expect(back[1]![1]).toBe('3200');
    expect(back[1]![2]).toBe('=B2*2');
  });

  it('handles an empty grid', () => {
    const blob = writeXlsx([['']]);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('readXlsxWorkbook returns every non-empty sheet with its name', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Jan'], ['10']]), 'January');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Feb'], ['20']]), 'February');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), 'Blank'); // dropped
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const sheets = await readXlsxWorkbook(new Blob([out]) as unknown as File);
    expect(sheets.map((s) => s.name)).toEqual(['January', 'February']);
    expect(sheets[0]!.rows[0]).toEqual(['Jan']);
    expect(sheets[1]!.rows[1]).toEqual(['20']);
  });
});
