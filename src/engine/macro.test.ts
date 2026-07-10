import { describe, expect, it } from 'vitest';
import { Sheet } from './grid/sheet';
import { runMacro } from './macro/runtime';

describe('macro runtime', () => {
  it('reads and writes cells via the sheet API', () => {
    const s = new Sheet();
    s.setA1('A1', '5');
    const res = runMacro(s, 'sheet.set("B1", sheet.getNumber("A1") * 2);');
    expect(res.error).toBeUndefined();
    expect(s.getA1('B1')).toBe(10);
  });
  it('captures log output', () => {
    const s = new Sheet();
    const res = runMacro(s, 'sheet.log("hello", 42);');
    expect(res.logs).toEqual(['hello 42']);
  });
  it('reads and writes ranges', () => {
    const s = new Sheet();
    s.setA1('A1', '1'); s.setA1('A2', '2'); s.setA1('A3', '3');
    const res = runMacro(
      s,
      `const vals = sheet.range("A1:A3");
       const doubled = vals.map(row => [row[0] * 2]);
       sheet.setRange("B1", doubled);`,
    );
    expect(res.error).toBeUndefined();
    expect(s.getA1('B1')).toBe(2);
    expect(s.getA1('B3')).toBe(6);
  });
  it('clears a range', () => {
    const s = new Sheet();
    s.setA1('A1', '1'); s.setA1('A2', '2');
    runMacro(s, 'sheet.clear("A1:A2");');
    expect(s.getA1('A1')).toBeNull();
    expect(s.getA1('A2')).toBeNull();
  });
  it('loops to fill a column', () => {
    const s = new Sheet();
    const res = runMacro(
      s,
      `for (let i = 1; i <= 5; i++) { sheet.set("A" + i, i * i); }`,
    );
    expect(res.error).toBeUndefined();
    expect(s.getA1('A5')).toBe(25);
  });
  it('reports runtime errors instead of throwing', () => {
    const s = new Sheet();
    const res = runMacro(s, 'throw new Error("boom");');
    expect(res.error).toContain('boom');
  });
  it('reports invalid references', () => {
    const s = new Sheet();
    const res = runMacro(s, 'sheet.set("notaref", 1);');
    expect(res.error).toContain('Invalid reference');
  });
});
