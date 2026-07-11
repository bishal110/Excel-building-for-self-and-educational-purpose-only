import { describe, expect, it } from 'vitest';
import { Store } from './store';
import { numberToCol } from '../../engine/formula/references';

describe('PHASE 7: stale-state hunt', () => {
  it('undo works correctly across sheet switches', () => {
    const s = new Store();
    s.commitCell(0, 0, 'first-sheet');
    s.addSheet(); // switches to Sheet2
    s.commitCell(0, 0, 'second-sheet');
    expect(s.getValue(0, 0)).toBe('second-sheet');

    // Undo the Sheet2 edit — Sheet2 A1 empty again, Sheet1 untouched.
    s.undo();
    expect(s.getValue(0, 0)).toBeNull();
    expect(s.sheetNames()).toHaveLength(2);
    s.setActiveSheet(0);
    expect(s.getValue(0, 0)).toBe('first-sheet');

    // Undo the addSheet — back to one sheet, content intact.
    s.undo();
    expect(s.sheetNames()).toHaveLength(1);
    expect(s.getValue(0, 0)).toBe('first-sheet');

    // Undo the first edit — pristine workbook.
    s.undo();
    expect(s.getValue(0, 0)).toBeNull();

    // Redo everything forward again.
    s.redo();
    expect(s.getValue(0, 0)).toBe('first-sheet');
    s.redo();
    expect(s.sheetNames()).toHaveLength(2);
  });

  it('formulas stay isolated per sheet after switching', () => {
    const s = new Store();
    s.commitCell(0, 0, '10');
    s.commitCell(0, 1, '=A1*2');
    s.addSheet();
    s.commitCell(0, 0, '99');
    // Sheet2's A2 has no formula; Sheet1's formula must not see Sheet2's A1.
    expect(s.getValue(0, 1)).toBeNull();
    s.setActiveSheet(0);
    expect(s.getValue(0, 1)).toBe(20);
  });

  it('deleting the active sheet keeps selection and values consistent', () => {
    const s = new Store();
    s.addSheet();
    s.commitCell(2, 2, 'x');
    s.removeSheet(1); // delete active (second) sheet
    expect(s.activeIndex()).toBe(0);
    expect(() => s.selectionStats()).not.toThrow();
    expect(s.getValue(2, 2)).toBeNull();
  });

  it('find & replace after row mutations sees the rewritten formulas', () => {
    const s = new Store();
    s.commitCell(0, 0, '5');
    s.commitCell(1, 0, '=A1');
    s.insertRowAt(0);
    // The formula moved to row 2 and now reads =A2.
    expect(s.getRaw(1, 1)).toBe('=A2');
    const n = s.findReplaceAll('A2', 'A2'); // no-op replace should count 1 cell? no — same value, 0 changes
    expect(n).toBe(0);
  });
});

describe('PHASE 7: 10k-cell performance', () => {
  it('fills 10,000 cells and aggregates them in reasonable time', () => {
    const s = new Store();
    const start = performance.now();
    // 100 columns x 100 rows of numbers via bulk import (single undo step).
    const rows: string[][] = [];
    for (let r = 0; r < 100; r++) {
      const row: string[] = [];
      for (let c = 0; c < 100; c++) row.push(String(r * 100 + c));
      rows.push(row);
    }
    s.importRows(rows);
    const fillMs = performance.now() - start;

    // Aggregate the whole 10k range with a formula.
    const t2 = performance.now();
    const lastCol = numberToCol(99);
    s.commitCell(0, 101, `=SUM(A1:${lastCol}100)`);
    const sum = s.getValue(0, 101);
    const sumMs = performance.now() - t2;

    expect(sum).toBe((9999 * 10000) / 2);
    // Generous ceilings — catches pathological regressions, not noise.
    expect(fillMs, `fill took ${fillMs}ms`).toBeLessThan(5000);
    expect(sumMs, `SUM took ${sumMs}ms`).toBeLessThan(3000);
  });

  it('recalculates a 1,000-cell formula chain without stack overflow', () => {
    const s = new Store();
    const rows: string[][] = [['1']];
    for (let r = 1; r < 1000; r++) rows.push([`=A${r}+1`]);
    s.importRows(rows);
    expect(s.getValue(0, 999)).toBe(1000);
  });
});
