import { describe, expect, it } from 'vitest';
import { evalF } from './testkit';

describe('date functions', () => {
  it('DATE produces an Excel-compatible serial', () => {
    // 2020-01-01 is serial 43831 in Excel's 1900 system.
    expect(evalF('DATE(2020,1,1)')).toBe(43831);
  });
  it('YEAR, MONTH, DAY round-trip from a serial', () => {
    expect(evalF('YEAR(DATE(2023,7,15))')).toBe(2023);
    expect(evalF('MONTH(DATE(2023,7,15))')).toBe(7);
    expect(evalF('DAY(DATE(2023,7,15))')).toBe(15);
  });
  it('DATE handles month rollover', () => {
    expect(evalF('MONTH(DATE(2023,13,1))')).toBe(1);
    expect(evalF('YEAR(DATE(2023,13,1))')).toBe(2024);
  });
  it('DAYS between two dates', () => {
    expect(evalF('DAYS(DATE(2023,1,31),DATE(2023,1,1))')).toBe(30);
  });
  it('WEEKDAY type 1 (Sun=1)', () => {
    // 2023-07-16 is a Sunday.
    expect(evalF('WEEKDAY(DATE(2023,7,16))')).toBe(1);
    expect(evalF('WEEKDAY(DATE(2023,7,17))')).toBe(2);
  });
  it('WEEKDAY type 2 (Mon=1)', () => {
    expect(evalF('WEEKDAY(DATE(2023,7,17),2)')).toBe(1);
  });
  it('EOMONTH returns the last day of the month', () => {
    expect(evalF('DAY(EOMONTH(DATE(2024,2,10),0))')).toBe(29); // 2024 leap year
    expect(evalF('DAY(EOMONTH(DATE(2023,2,10),0))')).toBe(28);
    expect(evalF('MONTH(EOMONTH(DATE(2023,1,15),1))')).toBe(2);
  });
});
