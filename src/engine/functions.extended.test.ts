import { describe, expect, it } from 'vitest';
import { evalF, kindOf } from './testkit';

describe('date & time functions (extended)', () => {
  it('TODAY returns a whole-day serial for the current date', () => {
    const serial = evalF('TODAY()') as number;
    expect(Number.isInteger(serial)).toBe(true);
    // Sanity: between 2020-01-01 (43831) and 2100-01-01 (73051).
    expect(serial).toBeGreaterThan(43831);
    expect(serial).toBeLessThan(73051);
  });
  it('NOW is TODAY plus a fraction of a day', () => {
    const now = evalF('NOW()') as number;
    const today = evalF('TODAY()') as number;
    expect(Math.floor(now)).toBe(today);
  });
  it('TIME and its parts', () => {
    expect(evalF('TIME(6,0,0)')).toBeCloseTo(0.25, 10);
    expect(evalF('HOUR(TIME(13,45,30))')).toBe(13);
    expect(evalF('MINUTE(TIME(13,45,30))')).toBe(45);
    expect(evalF('SECOND(TIME(13,45,30))')).toBe(30);
    expect(evalF('TIME(25,0,0)')).toBeCloseTo(1 / 24, 10); // wraps at 24h
  });
  it('EDATE shifts months and clamps the day', () => {
    expect(evalF('EDATE(DATE(2024,1,15),1)')).toBe(evalF('DATE(2024,2,15)'));
    expect(evalF('EDATE(DATE(2024,1,31),1)')).toBe(evalF('DATE(2024,2,29)')); // leap clamp
    expect(evalF('EDATE(DATE(2024,3,31),-1)')).toBe(evalF('DATE(2024,2,29)'));
  });
  it('DATEDIF in Y/M/D/YM units', () => {
    expect(evalF('DATEDIF(DATE(2020,1,15),DATE(2024,3,10),"Y")')).toBe(4);
    expect(evalF('DATEDIF(DATE(2020,1,15),DATE(2024,3,10),"M")')).toBe(49);
    expect(evalF('DATEDIF(DATE(2024,1,1),DATE(2024,1,31),"D")')).toBe(30);
    expect(evalF('DATEDIF(DATE(2020,1,15),DATE(2024,3,10),"YM")')).toBe(1);
    expect(kindOf(evalF('DATEDIF(DATE(2024,1,1),DATE(2020,1,1),"D")'))).toBe('#NUM!');
  });
  it('WEEKNUM: Jan 1 is week 1', () => {
    expect(evalF('WEEKNUM(DATE(2024,1,1))')).toBe(1);
    expect(evalF('WEEKNUM(DATE(2024,12,31))')).toBeGreaterThanOrEqual(52);
  });
});

describe('math functions (extended)', () => {
  it('trig and conversions', () => {
    expect(evalF('SIN(0)')).toBe(0);
    expect(evalF('COS(0)')).toBe(1);
    expect(evalF('TAN(0)')).toBe(0);
    expect(evalF('DEGREES(PI())')).toBeCloseTo(180, 10);
    expect(evalF('RADIANS(180)')).toBeCloseTo(Math.PI, 10);
    expect(evalF('ATAN2(1,1)')).toBeCloseTo(Math.PI / 4, 10);
    expect(kindOf(evalF('ASIN(2)'))).toBe('#NUM!');
  });
  it('FACT, GCD, LCM, QUOTIENT', () => {
    expect(evalF('FACT(5)')).toBe(120);
    expect(evalF('GCD(12,18)')).toBe(6);
    expect(evalF('LCM(4,6)')).toBe(12);
    expect(evalF('QUOTIENT(7,2)')).toBe(3);
    expect(evalF('QUOTIENT(-7,2)')).toBe(-3);
    expect(kindOf(evalF('FACT(-1)'))).toBe('#NUM!');
  });
  it('EVEN, ODD, MROUND', () => {
    expect(evalF('EVEN(3)')).toBe(4);
    expect(evalF('EVEN(-3)')).toBe(-4);
    expect(evalF('ODD(4)')).toBe(5);
    expect(evalF('ODD(0)')).toBe(1);
    expect(evalF('MROUND(7,3)')).toBe(6);
    expect(kindOf(evalF('MROUND(7,-3)'))).toBe('#NUM!');
  });
  it('RAND and RANDBETWEEN stay in range', () => {
    const r = evalF('RAND()') as number;
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(1);
    const n = evalF('RANDBETWEEN(5,7)') as number;
    expect(n).toBeGreaterThanOrEqual(5);
    expect(n).toBeLessThanOrEqual(7);
    expect(Number.isInteger(n)).toBe(true);
  });
  it('SUMPRODUCT multiplies ranges pairwise', () => {
    expect(
      evalF('=SUMPRODUCT(A1:A2,B1:B2)', (s) => {
        s.setA1('A1', '2');
        s.setA1('A2', '3');
        s.setA1('B1', '10');
        s.setA1('B2', '100');
      }),
    ).toBe(320);
  });
  it('SUMIFS sums under multiple criteria', () => {
    expect(
      evalF('=SUMIFS(C1:C4,A1:A4,"east",B1:B4,">10")', (s) => {
        s.setA1('A1', 'east'); s.setA1('B1', '20'); s.setA1('C1', '1');
        s.setA1('A2', 'west'); s.setA1('B2', '20'); s.setA1('C2', '2');
        s.setA1('A3', 'east'); s.setA1('B3', '5'); s.setA1('C3', '4');
        s.setA1('A4', 'east'); s.setA1('B4', '30'); s.setA1('C4', '8');
      }),
    ).toBe(9);
  });
});

describe('stats functions (extended)', () => {
  const seed = (s: { setA1: (a: string, v: string) => void }) => {
    ['4', '1', '3', '1', '5'].forEach((v, i) => s.setA1(`A${i + 1}`, v));
  };
  it('LARGE and SMALL', () => {
    expect(evalF('=LARGE(A1:A5,1)', seed)).toBe(5);
    expect(evalF('=LARGE(A1:A5,2)', seed)).toBe(4);
    expect(evalF('=SMALL(A1:A5,1)', seed)).toBe(1);
    expect(kindOf(evalF('=LARGE(A1:A5,9)', seed))).toBe('#NUM!');
  });
  it('RANK (default descending)', () => {
    expect(evalF('=RANK(5,A1:A5)', seed)).toBe(1);
    expect(evalF('=RANK(1,A1:A5)', seed)).toBe(4);
    expect(evalF('=RANK(1,A1:A5,1)', seed)).toBe(1); // ascending
    expect(kindOf(evalF('=RANK(99,A1:A5)', seed))).toBe('#N/A');
  });
  it('MODE picks the most frequent', () => {
    expect(evalF('=MODE(A1:A5)', seed)).toBe(1);
    expect(kindOf(evalF('MODE(1,2,3)'))).toBe('#NUM!'); // no repeat
  });
  it('PERCENTILE and QUARTILE interpolate', () => {
    expect(evalF('=PERCENTILE(A1:A5,0.5)', seed)).toBe(3);
    expect(evalF('=QUARTILE(A1:A5,2)', seed)).toBe(3); // Q2 = median
    expect(evalF('=QUARTILE(A1:A5,0)', seed)).toBe(1); // min
    expect(evalF('=QUARTILE(A1:A5,4)', seed)).toBe(5); // max
  });
  it('GEOMEAN and AVEDEV', () => {
    expect(evalF('GEOMEAN(2,8)')).toBeCloseTo(4, 10);
    expect(evalF('AVEDEV(2,4)')).toBe(1);
    expect(kindOf(evalF('GEOMEAN(-1,2)'))).toBe('#NUM!');
  });
  it('COUNTIFS / AVERAGEIFS / MAXIFS / MINIFS', () => {
    const grid = (s: { setA1: (a: string, v: string) => void }) => {
      s.setA1('A1', 'x'); s.setA1('B1', '10');
      s.setA1('A2', 'x'); s.setA1('B2', '30');
      s.setA1('A3', 'y'); s.setA1('B3', '50');
    };
    expect(evalF('=COUNTIFS(A1:A3,"x",B1:B3,">5")', grid)).toBe(2);
    expect(evalF('=AVERAGEIFS(B1:B3,A1:A3,"x")', grid)).toBe(20);
    expect(evalF('=MAXIFS(B1:B3,A1:A3,"x")', grid)).toBe(30);
    expect(evalF('=MINIFS(B1:B3,A1:A3,"x")', grid)).toBe(10);
  });
  it('COUNTUNIQUE counts distinct non-blanks', () => {
    expect(
      evalF('=COUNTUNIQUE(A1:A4)', (s) => {
        s.setA1('A1', 'a');
        s.setA1('A2', 'a');
        s.setA1('A3', 'b');
      }),
    ).toBe(2);
  });
});

describe('text functions (extended)', () => {
  it('CHAR and CODE round-trip', () => {
    expect(evalF('CHAR(65)')).toBe('A');
    expect(evalF('CODE("A")')).toBe(65);
    expect(kindOf(evalF('CHAR(0)'))).toBe('#VALUE!');
    expect(kindOf(evalF('CODE("")'))).toBe('#VALUE!');
  });
  it('CLEAN strips control characters', () => {
    expect(evalF('CLEAN(CONCAT("a",CHAR(10),"b"))')).toBe('ab');
  });
  it('TEXTJOIN with and without empties', () => {
    expect(
      evalF('=TEXTJOIN(", ",TRUE,A1:A3)', (s) => {
        s.setA1('A1', 'red');
        s.setA1('A3', 'blue');
      }),
    ).toBe('red, blue');
    expect(
      evalF('=TEXTJOIN("-",FALSE,A1:A3)', (s) => {
        s.setA1('A1', 'a');
        s.setA1('A3', 'c');
      }),
    ).toBe('a--c');
  });
});

describe('logical & info functions (extended)', () => {
  it('IFS returns the first true branch, else #N/A', () => {
    expect(evalF('IFS(FALSE,1,TRUE,2)')).toBe(2);
    expect(kindOf(evalF('IFS(FALSE,1)'))).toBe('#N/A');
    expect(kindOf(evalF('IFS(TRUE)'))).toBe('#VALUE!');
  });
  it('SWITCH matches cases with optional default', () => {
    expect(evalF('SWITCH(2,1,"one",2,"two")')).toBe('two');
    expect(evalF('SWITCH(9,1,"one","other")')).toBe('other');
    expect(kindOf(evalF('SWITCH(9,1,"one")'))).toBe('#N/A');
  });
  it('IS* predicates', () => {
    expect(evalF('ISNUMBER(5)')).toBe(true);
    expect(evalF('ISTEXT("x")')).toBe(true);
    expect(evalF('ISLOGICAL(TRUE)')).toBe(true);
    expect(evalF('=ISBLANK(A1)')).toBe(true);
    expect(evalF('ISEVEN(4)')).toBe(true);
    expect(evalF('ISODD(4)')).toBe(false);
    expect(evalF('ISERROR(1/0)')).toBe(true);
    expect(evalF('ISERR(1/0)')).toBe(true);
    expect(evalF('ISERR(NA())')).toBe(false); // #N/A is excluded from ISERR
    expect(evalF('ISNA(NA())')).toBe(true);
  });
  it('N coerces like Excel', () => {
    expect(evalF('N(7)')).toBe(7);
    expect(evalF('N(TRUE)')).toBe(1);
    expect(evalF('N("text")')).toBe(0);
  });
});

describe('lookup functions (extended)', () => {
  const table = (s: { setA1: (a: string, v: string) => void }) => {
    s.setA1('A1', 'apple'); s.setA1('B1', '10');
    s.setA1('A2', 'banana'); s.setA1('B2', '20');
    s.setA1('A3', 'cherry'); s.setA1('B3', '30');
  };
  it('XLOOKUP exact match', () => {
    expect(evalF('=XLOOKUP("banana",A1:A3,B1:B3)', table)).toBe(20);
  });
  it('XLOOKUP not-found returns #N/A or the fallback', () => {
    expect(kindOf(evalF('=XLOOKUP("kiwi",A1:A3,B1:B3)', table))).toBe('#N/A');
    expect(evalF('=XLOOKUP("kiwi",A1:A3,B1:B3,"none")', table)).toBe('none');
  });
  it('XLOOKUP approximate modes', () => {
    const nums = (s: { setA1: (a: string, v: string) => void }) => {
      s.setA1('A1', '10'); s.setA1('B1', 'low');
      s.setA1('A2', '20'); s.setA1('B2', 'mid');
      s.setA1('A3', '30'); s.setA1('B3', 'high');
    };
    expect(evalF('=XLOOKUP(25,A1:A3,B1:B3,"x",-1)', nums)).toBe('mid'); // ≤ target
    expect(evalF('=XLOOKUP(25,A1:A3,B1:B3,"x",1)', nums)).toBe('high'); // ≥ target
  });
});

describe('aliases', () => {
  it('AVG works like AVERAGE', () => {
    expect(evalF('AVG(2,4,6)')).toBe(4);
  });
  it('dotted modern names resolve', () => {
    expect(evalF('STDEV.P(2,4)')).toBe(1);
    expect(evalF('VAR.P(2,4)')).toBe(1);
    expect(evalF('MODE.SNGL(1,1,2)')).toBe(1);
  });
});
