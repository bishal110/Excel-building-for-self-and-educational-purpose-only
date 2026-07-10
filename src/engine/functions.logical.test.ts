import { describe, expect, it } from 'vitest';
import { evalF, kindOf } from './testkit';

describe('logical functions', () => {
  it('IF returns the correct branch', () => {
    expect(evalF('IF(TRUE,"yes","no")')).toBe('yes');
    expect(evalF('IF(1>2,"yes","no")')).toBe('no');
    expect(evalF('IF(FALSE,1)')).toBe(false);
  });
  it('EXCEL PARITY: IF does not evaluate the untaken branch', () => {
    expect(evalF('IF(TRUE,1,1/0)')).toBe(1);
    expect(evalF('IF(FALSE,1/0,2)')).toBe(2);
  });
  it('IF condition error propagates', () => {
    expect(kindOf(evalF('IF(1/0,1,2)'))).toBe('#DIV/0!');
  });
  it('NOT', () => {
    expect(evalF('NOT(TRUE)')).toBe(false);
    expect(evalF('NOT(0)')).toBe(true);
  });
  it('AND and OR', () => {
    expect(evalF('AND(TRUE,TRUE,1)')).toBe(true);
    expect(evalF('AND(TRUE,FALSE)')).toBe(false);
    expect(evalF('OR(FALSE,FALSE,1)')).toBe(true);
    expect(evalF('OR(FALSE,0)')).toBe(false);
  });
  it('XOR', () => {
    expect(evalF('XOR(TRUE,FALSE)')).toBe(true);
    expect(evalF('XOR(TRUE,TRUE)')).toBe(false);
    expect(evalF('XOR(TRUE,TRUE,TRUE)')).toBe(true);
  });
  it('IFERROR catches errors', () => {
    expect(evalF('IFERROR(1/0,"safe")')).toBe('safe');
    expect(evalF('IFERROR(42,"safe")')).toBe(42);
  });
  it('IFNA only catches #N/A', () => {
    expect(evalF('IFNA(NA(),"missing")')).toBe('missing');
    expect(kindOf(evalF('IFNA(1/0,"missing")'))).toBe('#DIV/0!');
  });
  it('TRUE() and FALSE()', () => {
    expect(evalF('TRUE()')).toBe(true);
    expect(evalF('FALSE()')).toBe(false);
  });
  it('nested IF', () => {
    expect(evalF('=IF(A1>50,"high",IF(A1>20,"mid","low"))', (s) => s.setA1('A1', '35'))).toBe('mid');
  });
});
