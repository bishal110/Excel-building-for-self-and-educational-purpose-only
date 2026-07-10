import { describe, expect, it } from 'vitest';
import { functionCount, functionNames, getFunction } from './formula/functions';

describe('function registry', () => {
  it('provides at least 40 functions (brief minimum)', () => {
    expect(functionCount()).toBeGreaterThanOrEqual(40);
  });
  it('covers every required category', () => {
    const names = new Set(functionNames());
    const required = [
      // math
      'SUM', 'PRODUCT', 'ABS', 'ROUND', 'MOD', 'POWER', 'SQRT', 'INT',
      // stats
      'AVERAGE', 'COUNT', 'MAX', 'MIN', 'MEDIAN', 'STDEV', 'COUNTIF', 'SUMIF',
      // text
      'LEFT', 'RIGHT', 'MID', 'LEN', 'CONCAT', 'UPPER', 'LOWER', 'SUBSTITUTE',
      // logical
      'IF', 'AND', 'OR', 'NOT', 'IFERROR',
      // lookup
      'VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH', 'CHOOSE',
      // date
      'DATE', 'YEAR', 'MONTH', 'DAY', 'DAYS',
    ];
    for (const fn of required) {
      expect(names.has(fn), `missing function ${fn}`).toBe(true);
    }
  });
  it('lookup is case-insensitive', () => {
    expect(getFunction('sum')).toBeDefined();
    expect(getFunction('Sum')).toBeDefined();
  });
  it('unknown function is undefined', () => {
    expect(getFunction('NOPE')).toBeUndefined();
  });
});
