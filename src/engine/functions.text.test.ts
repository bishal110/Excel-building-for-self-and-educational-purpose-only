import { describe, expect, it } from 'vitest';
import { evalF, kindOf } from './testkit';

describe('text functions', () => {
  it('LEN, LOWER, UPPER, PROPER', () => {
    expect(evalF('LEN("hello")')).toBe(5);
    expect(evalF('LOWER("HeLLo")')).toBe('hello');
    expect(evalF('UPPER("abc")')).toBe('ABC');
    expect(evalF('PROPER("the well HEAD")')).toBe('The Well Head');
  });
  it('TRIM collapses whitespace', () => {
    expect(evalF('TRIM("  a   b ")')).toBe('a b');
  });
  it('LEFT, RIGHT, MID', () => {
    expect(evalF('LEFT("petroleum",4)')).toBe('petr');
    expect(evalF('RIGHT("petroleum",3)')).toBe('eum');
    expect(evalF('MID("petroleum",3,4)')).toBe('trol');
    expect(evalF('LEFT("abc")')).toBe('a');
  });
  it('CONCAT and CONCATENATE', () => {
    expect(evalF('CONCAT("a","b","c")')).toBe('abc');
    expect(evalF('CONCATENATE("x",1,TRUE)')).toBe('x1TRUE');
  });
  it('CONCAT over a range', () => {
    expect(evalF('=CONCAT(A1:A3)', (s) => {
      s.setA1('A1', 'a');
      s.setA1('A2', 'b');
      s.setA1('A3', 'c');
    })).toBe('abc');
  });
  it('REPT and EXACT', () => {
    expect(evalF('REPT("ab",3)')).toBe('ababab');
    expect(evalF('EXACT("A","A")')).toBe(true);
    expect(evalF('EXACT("A","a")')).toBe(false);
  });
  it('FIND is case-sensitive, SEARCH is not', () => {
    expect(evalF('FIND("P","WHP")')).toBe(3);
    expect(kindOf(evalF('FIND("p","WHP")'))).toBe('#VALUE!');
    expect(evalF('SEARCH("p","WHP")')).toBe(3);
  });
  it('SUBSTITUTE all and nth', () => {
    expect(evalF('SUBSTITUTE("a-b-c","-","+")')).toBe('a+b+c');
    expect(evalF('SUBSTITUTE("a-b-c","-","+",2)')).toBe('a-b+c');
  });
  it('REPLACE', () => {
    expect(evalF('REPLACE("abcdef",2,3,"XY")')).toBe('aXYef');
  });
  it('VALUE parses numeric text', () => {
    expect(evalF('VALUE("42")')).toBe(42);
    expect(kindOf(evalF('VALUE("x")'))).toBe('#VALUE!');
  });
  it('TEXT formats with decimals', () => {
    expect(evalF('TEXT(3.14159,"0.00")')).toBe('3.14');
    expect(evalF('TEXT(5,"0")')).toBe('5');
  });
  it('propagates errors', () => {
    expect(kindOf(evalF('LEN(1/0)'))).toBe('#DIV/0!');
  });
});
