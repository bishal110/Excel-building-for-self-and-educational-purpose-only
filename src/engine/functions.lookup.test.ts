import { describe, expect, it } from 'vitest';
import { evalF, kindOf } from './testkit';
import type { Sheet } from './grid/sheet';

const table = (s: Sheet) => {
  // A: key, B: label
  s.setA1('A1', '10'); s.setA1('B1', 'ten');
  s.setA1('A2', '20'); s.setA1('B2', 'twenty');
  s.setA1('A3', '30'); s.setA1('B3', 'thirty');
};

describe('lookup functions', () => {
  it('VLOOKUP exact match', () => {
    expect(evalF('=VLOOKUP(20,A1:B3,2,FALSE)', table)).toBe('twenty');
  });
  it('VLOOKUP not found (exact) is #N/A', () => {
    expect(kindOf(evalF('=VLOOKUP(25,A1:B3,2,FALSE)', table))).toBe('#N/A');
  });
  it('VLOOKUP approximate match', () => {
    expect(evalF('=VLOOKUP(25,A1:B3,2,TRUE)', table)).toBe('twenty');
    expect(evalF('=VLOOKUP(25,A1:B3,2)', table)).toBe('twenty');
  });
  it('VLOOKUP bad column index is #REF!', () => {
    expect(kindOf(evalF('=VLOOKUP(10,A1:B3,3,FALSE)', table))).toBe('#REF!');
  });
  it('HLOOKUP exact match', () => {
    expect(evalF('=HLOOKUP(2,A1:C2,2,FALSE)', (s) => {
      s.setA1('A1', '1'); s.setA1('B1', '2'); s.setA1('C1', '3');
      s.setA1('A2', 'x'); s.setA1('B2', 'y'); s.setA1('C2', 'z');
    })).toBe('y');
  });
  it('INDEX returns cell in a 2D range', () => {
    expect(evalF('=INDEX(A1:B3,2,2)', table)).toBe('twenty');
    expect(evalF('=INDEX(A1:B3,3,1)', table)).toBe(30);
  });
  it('INDEX out of bounds is #REF!', () => {
    expect(kindOf(evalF('=INDEX(A1:B3,5,1)', table))).toBe('#REF!');
  });
  it('INDEX single-row shorthand', () => {
    expect(evalF('=INDEX(A1:C1,2)', (s) => {
      s.setA1('A1', '7'); s.setA1('B1', '8'); s.setA1('C1', '9');
    })).toBe(8);
  });
  it('MATCH exact', () => {
    expect(evalF('=MATCH(30,A1:A3,0)', table)).toBe(3);
    expect(kindOf(evalF('=MATCH(99,A1:A3,0)', table))).toBe('#N/A');
  });
  it('MATCH approximate (ascending)', () => {
    expect(evalF('=MATCH(25,A1:A3,1)', table)).toBe(2);
  });
  it('INDEX+MATCH combo', () => {
    expect(evalF('=INDEX(B1:B3,MATCH(30,A1:A3,0))', table)).toBe('thirty');
  });
  it('CHOOSE', () => {
    expect(evalF('CHOOSE(2,"a","b","c")')).toBe('b');
    expect(kindOf(evalF('CHOOSE(9,"a","b")'))).toBe('#VALUE!');
  });
});
