import { describe, expect, it } from 'vitest';
import {
  colToNumber,
  numberToCol,
  parseCellRef,
  formatCellRef,
  expandRange,
} from './formula/references';

describe('column letter conversion', () => {
  it('maps A..Z to 0..25', () => {
    expect(colToNumber('A')).toBe(0);
    expect(colToNumber('Z')).toBe(25);
  });
  it('maps AA, AZ, BA', () => {
    expect(colToNumber('AA')).toBe(26);
    expect(colToNumber('AZ')).toBe(51);
    expect(colToNumber('BA')).toBe(52);
  });
  it('round-trips number to column', () => {
    for (const n of [0, 1, 25, 26, 27, 51, 52, 701, 702]) {
      expect(colToNumber(numberToCol(n))).toBe(n);
    }
  });
  it('is case-insensitive', () => {
    expect(colToNumber('aa')).toBe(26);
  });
});

describe('parseCellRef', () => {
  it('parses a plain ref', () => {
    expect(parseCellRef('A1')).toEqual({ col: 0, row: 0, colAbs: false, rowAbs: false });
  });
  it('parses absolute markers', () => {
    expect(parseCellRef('$A$1')).toEqual({ col: 0, row: 0, colAbs: true, rowAbs: true });
    expect(parseCellRef('$B2')).toEqual({ col: 1, row: 1, colAbs: true, rowAbs: false });
    expect(parseCellRef('C$3')).toEqual({ col: 2, row: 2, colAbs: false, rowAbs: true });
  });
  it('returns null for junk', () => {
    expect(parseCellRef('A')).toBeNull();
    expect(parseCellRef('1')).toBeNull();
    expect(parseCellRef('A0')).toBeNull();
  });
  it('formats back to A1', () => {
    expect(formatCellRef({ col: 0, row: 0, colAbs: false, rowAbs: false })).toBe('A1');
    expect(formatCellRef({ col: 27, row: 9, colAbs: true, rowAbs: true })).toBe('$AB$10');
  });
});

describe('expandRange', () => {
  it('expands a 2x2 range', () => {
    const cells = expandRange({
      start: { col: 0, row: 0, colAbs: false, rowAbs: false },
      end: { col: 1, row: 1, colAbs: false, rowAbs: false },
    });
    expect(cells).toHaveLength(4);
    expect(cells[0]).toEqual({ col: 0, row: 0 });
    expect(cells[3]).toEqual({ col: 1, row: 1 });
  });
  it('normalizes reversed ranges', () => {
    const cells = expandRange({
      start: { col: 2, row: 2, colAbs: false, rowAbs: false },
      end: { col: 1, row: 1, colAbs: false, rowAbs: false },
    });
    expect(cells).toHaveLength(4);
  });
});
