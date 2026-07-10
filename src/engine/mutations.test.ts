import { describe, expect, it } from 'vitest';
import { Sheet } from './grid/sheet';
import { insertRows, deleteRows, insertCols, deleteCols } from './grid/mutations';
import { kindOf } from './testkit';

describe('insertRows', () => {
  it('shifts cell data down', () => {
    const s = new Sheet();
    s.setA1('A1', '1');
    s.setA1('A2', '2');
    insertRows(s, 1, 1); // insert one row before row index 1 (A2)
    expect(s.getA1('A1')).toBe(1);
    expect(s.getA1('A2')).toBeNull();
    expect(s.getA1('A3')).toBe(2);
  });
  it('rewrites formula references below the insertion', () => {
    const s = new Sheet();
    s.setA1('A1', '10');
    s.setA1('B1', '=A1*2');
    s.setA1('A5', '=A1+B1');
    insertRows(s, 0, 2); // insert 2 rows at top
    // A1 content moved to A3; formula in B moved to B3 and refs shifted
    expect(s.getRaw(1, 2)).toBe('=A3*2');
    expect(s.getA1('B3')).toBe(20);
  });
  it('grows a range that spans the insertion point', () => {
    const s = new Sheet();
    s.setA1('A1', '1');
    s.setA1('A2', '2');
    s.setA1('A3', '3');
    s.setA1('C1', '=SUM(A1:A3)');
    insertRows(s, 1, 1); // inside the range
    const raw = s.getRaw(2, 0);
    expect(raw).toBe('=SUM(A1:A4)');
    expect(s.getA1('C1')).toBe(6);
  });
});

describe('deleteRows and #REF!', () => {
  it('EXCEL PARITY: a formula referencing a deleted cell becomes #REF!', () => {
    const s = new Sheet();
    s.setA1('A1', '5');
    s.setA1('B1', '=A2');
    s.setA1('A2', '99');
    deleteRows(s, 1, 1); // delete row index 1 (row 2)
    expect(s.getRaw(1, 0)).toBe('=#REF!');
    expect(kindOf(s.getA1('B1'))).toBe('#REF!');
  });
  it('shifts references above deletion down', () => {
    const s = new Sheet();
    s.setA1('A5', '100');
    s.setA1('B1', '=A5');
    deleteRows(s, 1, 2); // delete rows 2-3
    expect(s.getRaw(1, 0)).toBe('=A3');
    expect(s.getA1('B1')).toBe(100);
  });
  it('shrinks a range when interior rows are deleted', () => {
    const s = new Sheet();
    s.setA1('A1', '1');
    s.setA1('A2', '2');
    s.setA1('A3', '3');
    s.setA1('A4', '4');
    s.setA1('C1', '=SUM(A1:A4)');
    deleteRows(s, 1, 2); // delete rows 2,3
    expect(s.getRaw(2, 0)).toBe('=SUM(A1:A2)');
    expect(s.getA1('C1')).toBe(5);
  });
  it('whole referenced range deleted becomes #REF!', () => {
    const s = new Sheet();
    s.setA1('A2', '1');
    s.setA1('A3', '2');
    s.setA1('C1', '=SUM(A2:A3)');
    deleteRows(s, 1, 2);
    expect(s.getRaw(2, 0)).toBe('=SUM(#REF!)');
    expect(kindOf(s.getA1('C1'))).toBe('#REF!');
  });
});

describe('column mutations', () => {
  it('insertCols shifts references right', () => {
    const s = new Sheet();
    s.setA1('B1', '5');
    s.setA1('A1', '=B1');
    insertCols(s, 1, 1); // insert before column B
    expect(s.getRaw(0, 0)).toBe('=C1');
    expect(s.getA1('A1')).toBe(5);
  });
  it('deleteCols producing #REF!', () => {
    const s = new Sheet();
    s.setA1('B1', '5');
    s.setA1('A1', '=B1');
    deleteCols(s, 1, 1); // delete column B
    expect(kindOf(s.getA1('A1'))).toBe('#REF!');
  });
  it('absolute references also shift', () => {
    const s = new Sheet();
    s.setA1('A1', '7');
    s.setA1('C1', '=$A$1');
    insertCols(s, 0, 1);
    expect(s.getRaw(3, 0)).toBe('=$B$1');
  });
});
