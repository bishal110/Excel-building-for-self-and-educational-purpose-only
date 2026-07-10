import { describe, expect, it } from 'vitest';
import { evalF, kindOf } from './testkit';

describe('math functions', () => {
  it('SUM of args and ranges', () => {
    expect(evalF('SUM(1,2,3)')).toBe(6);
    expect(evalF('=SUM(A1:A3)', (s) => {
      s.setA1('A1', '1');
      s.setA1('A2', '2');
      s.setA1('A3', '4');
    })).toBe(7);
  });
  it('SUM ignores text in ranges but coerces scalar strings', () => {
    expect(evalF('=SUM(A1:A2)', (s) => {
      s.setA1('A1', '10');
      s.setA1('A2', 'hello');
    })).toBe(10);
    expect(evalF('SUM(1,"2")')).toBe(3);
  });
  it('PRODUCT', () => {
    expect(evalF('PRODUCT(2,3,4)')).toBe(24);
  });
  it('ABS, SIGN, INT', () => {
    expect(evalF('ABS(-5)')).toBe(5);
    expect(evalF('SIGN(-3)')).toBe(-1);
    expect(evalF('INT(2.9)')).toBe(2);
    expect(evalF('INT(-2.1)')).toBe(-3);
  });
  it('SQRT and its #NUM! guard', () => {
    expect(evalF('SQRT(9)')).toBe(3);
    expect(kindOf(evalF('SQRT(-1)'))).toBe('#NUM!');
  });
  it('POWER and LOG family', () => {
    expect(evalF('POWER(2,10)')).toBe(1024);
    expect(evalF('LOG10(1000)')).toBeCloseTo(3);
    expect(evalF('LOG(8,2)')).toBeCloseTo(3);
    expect(evalF('LN(1)')).toBe(0);
  });
  it('MOD takes sign of divisor', () => {
    expect(evalF('MOD(10,3)')).toBe(1);
    expect(evalF('MOD(-10,3)')).toBe(2);
    expect(kindOf(evalF('MOD(1,0)'))).toBe('#DIV/0!');
  });
  it('ROUND, ROUNDUP, ROUNDDOWN', () => {
    expect(evalF('ROUND(2.345,2)')).toBe(2.35);
    expect(evalF('ROUND(2.5,0)')).toBe(3);
    expect(evalF('ROUNDUP(2.01,0)')).toBe(3);
    expect(evalF('ROUNDDOWN(2.99,0)')).toBe(2);
    expect(evalF('ROUNDDOWN(-2.99,0)')).toBe(-2);
  });
  it('TRUNC', () => {
    expect(evalF('TRUNC(3.7)')).toBe(3);
    expect(evalF('TRUNC(-3.7)')).toBe(-3);
    expect(evalF('TRUNC(3.14159,2)')).toBe(3.14);
  });
  it('CEILING and FLOOR', () => {
    expect(evalF('CEILING(4.1,1)')).toBe(5);
    expect(evalF('CEILING(2.5,0.5)')).toBe(2.5);
    expect(evalF('FLOOR(4.9,1)')).toBe(4);
    expect(kindOf(evalF('FLOOR(4,0)'))).toBe('#DIV/0!');
  });
  it('PI', () => {
    expect(evalF('PI()')).toBeCloseTo(Math.PI);
  });
  it('propagates errors from args', () => {
    expect(kindOf(evalF('ABS(1/0)'))).toBe('#DIV/0!');
  });
});
