import { describe, expect, it } from 'vitest';
import { Sheet } from './grid/sheet';
import { isError } from './formula/errors';

/** Evaluate a formula in an isolated cell and return the value. */
function evalF(formula: string, setup?: (s: Sheet) => void) {
  const s = new Sheet();
  setup?.(s);
  s.setA1('Z1', formula.startsWith('=') ? formula : '=' + formula);
  return s.getA1('Z1');
}

describe('arithmetic', () => {
  it('adds, subtracts, multiplies, divides', () => {
    expect(evalF('1+2')).toBe(3);
    expect(evalF('5-3')).toBe(2);
    expect(evalF('4*3')).toBe(12);
    expect(evalF('10/4')).toBe(2.5);
  });
  it('respects precedence', () => {
    expect(evalF('1+2*3')).toBe(7);
    expect(evalF('(1+2)*3')).toBe(9);
    expect(evalF('2+3*4-1')).toBe(13);
  });
  it('EXCEL PARITY: -2^2 = 4', () => {
    expect(evalF('-2^2')).toBe(4);
  });
  it('2^-2 = 0.25', () => {
    expect(evalF('2^-2')).toBe(0.25);
  });
  it('^ is left-associative: 2^3^2 = 64', () => {
    expect(evalF('2^3^2')).toBe(64);
  });
  it('percent postfix', () => {
    expect(evalF('50%')).toBe(0.5);
    expect(evalF('200%*3')).toBe(6);
  });
  it('unary minus and plus', () => {
    expect(evalF('-5')).toBe(-5);
    expect(evalF('--5')).toBe(5);
    expect(evalF('+7')).toBe(7);
  });
});

describe('errors', () => {
  it('division by zero yields #DIV/0!', () => {
    const v = evalF('1/0');
    expect(isError(v) && v.kind).toBe('#DIV/0!');
  });
  it('sqrt of negative via ^ yields #NUM!', () => {
    const v = evalF('(-1)^0.5');
    expect(isError(v) && v.kind).toBe('#NUM!');
  });
  it('text in arithmetic yields #VALUE!', () => {
    const v = evalF('"abc"+1');
    expect(isError(v) && v.kind).toBe('#VALUE!');
  });
  it('unknown function yields #NAME?', () => {
    const v = evalF('NOTAFUNC(1)');
    expect(isError(v) && v.kind).toBe('#NAME?');
  });
  it('EXCEL PARITY: #DIV/0! propagates through references', () => {
    const v = evalF('=A1+1', (s) => s.setA1('A1', '=1/0'));
    expect(isError(v) && v.kind).toBe('#DIV/0!');
  });
  it('EXCEL PARITY: error propagates through SUM range', () => {
    const v = evalF('=SUM(A1:A3)', (s) => {
      s.setA1('A1', '1');
      s.setA1('A2', '=1/0');
      s.setA1('A3', '3');
    });
    expect(isError(v) && v.kind).toBe('#DIV/0!');
  });
});

describe('comparison and text', () => {
  it('numeric comparisons', () => {
    expect(evalF('1<2')).toBe(true);
    expect(evalF('2<=2')).toBe(true);
    expect(evalF('3<>3')).toBe(false);
    expect(evalF('5>=6')).toBe(false);
  });
  it('string comparison is case-insensitive', () => {
    expect(evalF('"abc"="ABC"')).toBe(true);
  });
  it('concatenation with &', () => {
    expect(evalF('"a"&"b"&"c"')).toBe('abc');
    expect(evalF('"x"&1')).toBe('x1');
  });
  it('cross-type ordering: number < text', () => {
    expect(evalF('1<"a"')).toBe(true);
  });
});

describe('references', () => {
  it('reads a cell', () => {
    expect(evalF('=A1*2', (s) => s.setA1('A1', '21'))).toBe(42);
  });
  it('empty cell reads as 0 in arithmetic', () => {
    expect(evalF('=A1+5')).toBe(5);
  });
  it('absolute refs resolve the same as relative', () => {
    expect(evalF('=$A$1+1', (s) => s.setA1('A1', '9'))).toBe(10);
  });
});
