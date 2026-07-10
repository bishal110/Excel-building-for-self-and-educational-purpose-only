import { describe, expect, it } from 'vitest';
import { Workbook } from './grid/workbook';

describe('Workbook', () => {
  it('starts with one sheet', () => {
    const wb = new Workbook();
    expect(wb.sheetCount).toBe(1);
    expect(wb.sheetNames()).toEqual(['Sheet1']);
  });
  it('adds sheets with unique names', () => {
    const wb = new Workbook();
    wb.addSheet();
    wb.addSheet();
    expect(wb.sheetCount).toBe(3);
    expect(new Set(wb.sheetNames()).size).toBe(3);
  });
  it('rejects duplicate names', () => {
    const wb = new Workbook();
    expect(() => wb.addSheet('Sheet1')).toThrow();
  });
  it('keeps sheets independent', () => {
    const wb = new Workbook();
    const s2 = wb.addSheet('Data');
    wb.active().setA1('A1', '1');
    s2.setA1('A1', '2');
    expect(wb.active().getA1('A1')).toBe(1);
    expect(s2.getA1('A1')).toBe(2);
  });
  it('removes a sheet and clamps active index', () => {
    const wb = new Workbook();
    wb.addSheet();
    wb.activeIndex = 1;
    wb.removeSheet(1);
    expect(wb.sheetCount).toBe(1);
    expect(wb.activeIndex).toBe(0);
  });
  it('refuses to remove the last sheet', () => {
    const wb = new Workbook();
    expect(() => wb.removeSheet(0)).toThrow();
  });
  it('renames a sheet', () => {
    const wb = new Workbook();
    wb.renameSheet(0, 'Wells');
    expect(wb.sheetNames()).toEqual(['Wells']);
  });
  it('rejects renaming to an existing name', () => {
    const wb = new Workbook();
    wb.addSheet('Data');
    expect(() => wb.renameSheet(0, 'Data')).toThrow();
  });
});
