import { describe, expect, it } from 'vitest';
import { evalF, kindOf } from './testkit';

const fill = (s: import('./grid/sheet').Sheet) => {
  s.setA1('A1', '10');
  s.setA1('A2', '20');
  s.setA1('A3', '30');
  s.setA1('A4', 'text');
  s.setA1('A5', '40');
};

describe('stats functions', () => {
  it('AVERAGE ignores text and blanks', () => {
    expect(evalF('=AVERAGE(A1:A5)', fill)).toBe(25);
  });
  it('AVERAGE of empty is #DIV/0!', () => {
    expect(kindOf(evalF('=AVERAGE(B1:B3)'))).toBe('#DIV/0!');
  });
  it('COUNT counts numbers only', () => {
    expect(evalF('=COUNT(A1:A5)', fill)).toBe(4);
  });
  it('COUNTA counts non-empty', () => {
    expect(evalF('=COUNTA(A1:A5)', fill)).toBe(5);
  });
  it('COUNTBLANK counts blanks', () => {
    expect(evalF('=COUNTBLANK(A1:A6)', fill)).toBe(1);
  });
  it('MAX and MIN', () => {
    expect(evalF('=MAX(A1:A5)', fill)).toBe(40);
    expect(evalF('=MIN(A1:A5)', fill)).toBe(10);
  });
  it('MEDIAN odd and even counts', () => {
    expect(evalF('MEDIAN(1,2,3,4,5)')).toBe(3);
    expect(evalF('MEDIAN(1,2,3,4)')).toBe(2.5);
  });
  it('STDEV and VAR (sample)', () => {
    expect(evalF('VAR(2,4,6)')).toBeCloseTo(4);
    expect(evalF('STDEV(2,4,6)')).toBeCloseTo(2);
  });
  it('STDEVP and VARP (population)', () => {
    expect(evalF('VARP(2,4,6)')).toBeCloseTo(8 / 3);
  });
  it('COUNTIF with comparison criteria', () => {
    expect(evalF('=COUNTIF(A1:A5,">15")', fill)).toBe(3);
    expect(evalF('=COUNTIF(A1:A5,"text")', fill)).toBe(1);
  });
  it('SUMIF with criteria', () => {
    expect(evalF('=SUMIF(A1:A5,">15")', fill)).toBe(90);
  });
  it('SUMIF with separate sum range', () => {
    expect(evalF('=SUMIF(A1:A3,">10",B1:B3)', (s) => {
      s.setA1('A1', '10');
      s.setA1('A2', '20');
      s.setA1('A3', '30');
      s.setA1('B1', '1');
      s.setA1('B2', '2');
      s.setA1('B3', '3');
    })).toBe(5);
  });
  it('AVERAGEIF', () => {
    expect(evalF('=AVERAGEIF(A1:A5,">15")', fill)).toBe(30);
  });
  it('error propagates through COUNTIF range', () => {
    expect(evalF('=COUNTIF(A1:A2,">0")', (s) => {
      s.setA1('A1', '=1/0');
      s.setA1('A2', '5');
    })).toBe(1);
  });
});
