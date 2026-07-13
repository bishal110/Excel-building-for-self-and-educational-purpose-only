import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { readXlsx, readXlsxWorkbook, writeXlsx, writeXlsxWorkbook } from './xlsx';

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

  it('writes every worksheet instead of silently exporting only the active one', async () => {
    const blob = writeXlsxWorkbook([
      { name: 'January', rows: [['Month', 'Value'], ['Jan', '10']] },
      { name: 'February', rows: [['Month', 'Value'], ['Feb', '=10*2']] },
    ]);
    const sheets = await readXlsxWorkbook(blob as unknown as File);
    expect(sheets.map((sheet) => sheet.name)).toEqual(['January', 'February']);
    expect(sheets[0]!.rows[1]).toEqual(['Jan', '10']);
    expect(sheets[1]!.rows[1]).toEqual(['Feb', '=10*2']);
  });

  it('writeXlsxWorkbook sanitizes illegal sheet names and de-duplicates', async () => {
    const blob = writeXlsxWorkbook([
      { name: 'bad/name:here', rows: [['a']] },
      { name: 'bad name here', rows: [['b']] }, // collides after sanitizing
      { name: '', rows: [['c']] },
    ]);
    const back = await readXlsxWorkbook(blob as unknown as File);
    expect(back.map((s) => s.name)).toEqual(['bad name here', 'bad name here (2)', 'Sheet']);
  });

  it('writeXlsxWorkbook survives empty input and empty sheets', () => {
    expect(writeXlsxWorkbook([])).toBeInstanceOf(Blob);
    expect(writeXlsxWorkbook([{ name: 'Empty', rows: [] }])).toBeInstanceOf(Blob);
  });

  it('readXlsxWorkbook rejects malformed bytes instead of returning garbage', async () => {
    const junk = new Blob([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])]);
    await expect(readXlsxWorkbook(junk as unknown as File)).rejects.toThrow();
  });
});
