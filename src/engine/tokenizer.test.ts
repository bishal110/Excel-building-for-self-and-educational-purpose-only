import { describe, expect, it } from 'vitest';
import { tokenize } from './formula/tokenizer';

describe('tokenizer', () => {
  it('tokenizes numbers', () => {
    expect(tokenize('12.5').map((t) => t.type)).toEqual(['number']);
    expect(tokenize('1e3')[0]!.value).toBe('1e3');
    expect(tokenize('.5')[0]!.value).toBe('.5');
    expect(tokenize('1.2E-3')[0]!.value).toBe('1.2E-3');
  });
  it('tokenizes strings with escaped quotes', () => {
    const t = tokenize('"he said ""hi"""');
    expect(t[0]!.type).toBe('string');
    expect(t[0]!.value).toBe('he said "hi"');
  });
  it('tokenizes operators including multi-char', () => {
    expect(tokenize('<=').map((t) => t.value)).toEqual(['<=']);
    expect(tokenize('>=').map((t) => t.value)).toEqual(['>=']);
    expect(tokenize('<>').map((t) => t.value)).toEqual(['<>']);
  });
  it('distinguishes refs from names', () => {
    expect(tokenize('A1')[0]!.type).toBe('ref');
    expect(tokenize('$A$1')[0]!.type).toBe('ref');
    expect(tokenize('SUM')[0]!.type).toBe('name');
  });
  it('tokenizes booleans', () => {
    expect(tokenize('TRUE')[0]!.type).toBe('boolean');
    expect(tokenize('false')[0]!.value).toBe('FALSE');
  });
  it('tokenizes error literals', () => {
    expect(tokenize('#DIV/0!')[0]!.type).toBe('error');
    expect(tokenize('#REF!')[0]!.value).toBe('#REF!');
  });
  it('tokenizes a range with colon', () => {
    const types = tokenize('A1:B2').map((t) => t.type);
    expect(types).toEqual(['ref', 'colon', 'ref']);
  });
  it('tokenizes a function call', () => {
    const types = tokenize('SUM(A1,B2)').map((t) => t.type);
    expect(types).toEqual(['name', 'lparen', 'ref', 'comma', 'ref', 'rparen']);
  });
  it('skips whitespace', () => {
    expect(tokenize('  1 +  2 ').map((t) => t.value)).toEqual(['1', '+', '2']);
  });
  it('throws on unterminated string', () => {
    expect(() => tokenize('"abc')).toThrow();
  });
  it('throws on unexpected char', () => {
    expect(() => tokenize('1 ~ 2')).toThrow();
  });
});
