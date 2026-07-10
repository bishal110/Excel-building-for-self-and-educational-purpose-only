import { describe, expect, it } from 'vitest';
import { Sheet } from './grid/sheet';
import { fillDown, fillRight, sortRange, findReplace, offsetFormula } from './grid/ops';

describe('offsetFormula', () => {
  it('shifts relative refs, keeps absolute', () => {
    expect(offsetFormula('=A1+$B$1', 0, 1)).toBe('=A2+$B$1');
    expect(offsetFormula('=A1', 1, 0)).toBe('=B1');
    expect(offsetFormula('=$A1+A$1', 1, 1)).toBe('=$A2+B$1');
  });
  it('leaves literals unchanged', () => {
    expect(offsetFormula('42', 0, 5)).toBe('42');
  });
});

describe('fillDown', () => {
  it('fills a relative formula down', () => {
    const s = new Sheet();
    s.setA1('A1', '1'); s.setA1('A2', '2'); s.setA1('A3', '3');
    s.setA1('B1', '=A1*10');
    fillDown(s, 1, 0, 2);
    expect(s.getA1('B2')).toBe(20);
    expect(s.getA1('B3')).toBe(30);
    expect(s.getRaw(1, 2)).toBe('=A3*10');
  });
});

describe('fillRight', () => {
  it('fills a relative formula right', () => {
    const s = new Sheet();
    s.setA1('A1', '2'); s.setA1('B1', '3'); s.setA1('C1', '4');
    s.setA1('A2', '=A1*10');
    fillRight(s, 1, 0, 2);
    expect(s.getA1('B2')).toBe(30);
    expect(s.getA1('C2')).toBe(40);
  });
});

describe('sortRange', () => {
  it('sorts rows ascending by key column', () => {
    const s = new Sheet();
    s.setA1('A1', '3'); s.setA1('B1', 'c');
    s.setA1('A2', '1'); s.setA1('B2', 'a');
    s.setA1('A3', '2'); s.setA1('B3', 'b');
    sortRange(s, { c1: 0, r1: 0, c2: 1, r2: 2, keyCol: 0, ascending: true });
    expect(s.getA1('A1')).toBe(1);
    expect(s.getA1('B1')).toBe('a');
    expect(s.getA1('A3')).toBe(3);
    expect(s.getA1('B3')).toBe('c');
  });
  it('sorts descending', () => {
    const s = new Sheet();
    s.setA1('A1', '1'); s.setA1('A2', '2'); s.setA1('A3', '3');
    sortRange(s, { c1: 0, r1: 0, c2: 0, r2: 2, keyCol: 0, ascending: false });
    expect(s.getA1('A1')).toBe(3);
    expect(s.getA1('A3')).toBe(1);
  });
});

describe('findReplace', () => {
  it('replaces substrings and counts changes', () => {
    const s = new Sheet();
    s.setA1('A1', 'well head');
    s.setA1('A2', 'well bore');
    const n = findReplace(s, 'well', 'WELL');
    expect(n).toBe(2);
    expect(s.getA1('A1')).toBe('WELL head');
  });
  it('whole-cell match only', () => {
    const s = new Sheet();
    s.setA1('A1', 'ab');
    s.setA1('A2', 'abc');
    const n = findReplace(s, 'ab', 'X', { wholeCell: true });
    expect(n).toBe(1);
    expect(s.getA1('A1')).toBe('X');
    expect(s.getA1('A2')).toBe('abc');
  });
  it('case-sensitive option', () => {
    const s = new Sheet();
    s.setA1('A1', 'WHP whp');
    expect(findReplace(s, 'whp', 'X', { matchCase: true })).toBe(1);
    expect(s.getA1('A1')).toBe('WHP X');
  });
});
