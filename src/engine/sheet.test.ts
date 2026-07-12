import { describe, expect, it } from 'vitest';
import { Sheet } from './grid/sheet';
import { kindOf } from './testkit';

describe('Sheet literals', () => {
  it('stores and parses number literals', () => {
    const s = new Sheet();
    s.setA1('A1', '42');
    expect(s.getA1('A1')).toBe(42);
    s.setA1('A2', '-3.5');
    expect(s.getA1('A2')).toBe(-3.5);
  });
  it('stores booleans and text', () => {
    const s = new Sheet();
    s.setA1('A1', 'TRUE');
    s.setA1('A2', 'hello');
    expect(s.getA1('A1')).toBe(true);
    expect(s.getA1('A2')).toBe('hello');
  });
  it('leading apostrophe forces text', () => {
    const s = new Sheet();
    s.setA1('A1', "'42");
    expect(s.getA1('A1')).toBe('42');
  });
  it('empty cell is null', () => {
    const s = new Sheet();
    expect(s.getA1('A1')).toBeNull();
  });
  it('clears a cell with empty string', () => {
    const s = new Sheet();
    s.setA1('A1', '5');
    s.setA1('A1', '');
    expect(s.getA1('A1')).toBeNull();
    expect(s.hasCell(0, 0)).toBe(false);
  });
  it('grows its dimensions when data is written beyond the initial grid', () => {
    const s = new Sheet('Large import', 10, 5);
    s.setRaw(59, 249, 'visible');
    expect(s.colCount).toBe(60);
    expect(s.rowCount).toBe(250);
    expect(s.getRaw(59, 249)).toBe('visible');
  });
});

describe('Sheet formulas', () => {
  it('computes a formula chain', () => {
    const s = new Sheet();
    s.setA1('A1', '2');
    s.setA1('A2', '=A1*3');
    s.setA1('A3', '=A2+A1');
    expect(s.getA1('A3')).toBe(8);
  });
  it('recomputes after an edit', () => {
    const s = new Sheet();
    s.setA1('A1', '2');
    s.setA1('A2', '=A1*3');
    expect(s.getA1('A2')).toBe(6);
    s.setA1('A1', '5');
    expect(s.getA1('A2')).toBe(15);
  });
  it('malformed formula yields #VALUE!', () => {
    const s = new Sheet();
    s.setA1('A1', '=1+');
    expect(kindOf(s.getA1('A1'))).toBe('#VALUE!');
  });
});

describe('cycle detection', () => {
  it('detects a direct self-reference', () => {
    const s = new Sheet();
    s.setA1('A1', '=A1+1');
    expect(kindOf(s.getA1('A1'))).toBe('#CYCLE!');
  });
  it('detects an indirect cycle', () => {
    const s = new Sheet();
    s.setA1('A1', '=B1');
    s.setA1('B1', '=C1');
    s.setA1('C1', '=A1');
    expect(kindOf(s.getA1('A1'))).toBe('#CYCLE!');
  });
  it('non-cyclic diamond dependency works', () => {
    const s = new Sheet();
    s.setA1('A1', '10');
    s.setA1('B1', '=A1*2');
    s.setA1('C1', '=A1*3');
    s.setA1('D1', '=B1+C1');
    expect(s.getA1('D1')).toBe(50);
  });
  it('breaking a cycle restores computation', () => {
    const s = new Sheet();
    s.setA1('A1', '=A1');
    expect(kindOf(s.getA1('A1'))).toBe('#CYCLE!');
    s.setA1('A1', '99');
    expect(s.getA1('A1')).toBe(99);
  });
});
