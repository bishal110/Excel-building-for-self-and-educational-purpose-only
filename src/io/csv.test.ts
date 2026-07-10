import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csv';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });
  it('handles quoted fields with commas', () => {
    expect(parseCsv('"a,b",c')).toEqual([['a,b', 'c']]);
  });
  it('handles embedded newlines in quotes', () => {
    expect(parseCsv('"line1\nline2",x')).toEqual([['line1\nline2', 'x']]);
  });
  it('handles doubled-quote escapes', () => {
    expect(parseCsv('"she said ""hi""",y')).toEqual([['she said "hi"', 'y']]);
  });
  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
  it('keeps empty fields', () => {
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
  });
});

describe('toCsv', () => {
  it('serializes and quotes only when needed', () => {
    expect(toCsv([['a', 'b,c', 'd']])).toBe('a,"b,c",d');
  });
  it('escapes quotes', () => {
    expect(toCsv([['say "hi"']])).toBe('"say ""hi"""');
  });
  it('round-trips tricky content', () => {
    const rows = [
      ['WHP', 'note'],
      ['3200', 'spike, then\nsteady'],
      ['3195', 'ok "nominal"'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
