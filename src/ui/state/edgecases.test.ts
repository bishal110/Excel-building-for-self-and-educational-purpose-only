import { describe, expect, it } from 'vitest';
import { Store } from './store';
import { isError } from '../../engine';

describe('AUDIT: edge cases (safety)', () => {
  it('pasting a formula off the left edge does not crash', () => {
    const s = new Store();
    s.commitCell(1, 0, '=A1'); // B1 references A1
    s.setActive(1, 0);
    s.copy();
    s.setActive(0, 0); // paste into A1 → relative ref would go off-grid
    expect(() => s.paste()).not.toThrow();
    // The out-of-range ref is left as-is rather than corrupting the grid.
    expect(typeof s.getRaw(0, 0)).toBe('string');
  });

  it('running a macro on an empty sheet does not crash', () => {
    const s = new Store();
    const res = s.runMacroCode('const r = sheet.range("A1:C3"); sheet.log(r.length);');
    expect(res.error).toBeUndefined();
    expect(res.logs).toEqual(['3']);
  });

  it('a circular reference resolves to #CYCLE! and terminates', () => {
    const s = new Store();
    s.commitCell(0, 0, '=B1');
    s.commitCell(1, 0, '=A1');
    const v = s.getValue(0, 0);
    expect(isError(v) && v.kind).toBe('#CYCLE!');
  });

  it('a circular reference remains safe after deleting a row', () => {
    const s = new Store();
    s.commitCell(0, 1, '=B2');
    s.commitCell(1, 1, '=A2');
    s.deleteRowAt(0); // shift the cycle up a row
    const v = s.getValue(0, 0);
    expect(isError(v) && v.kind).toBe('#CYCLE!'); // still detected, no hang
  });

  it('clearing an empty selection is a no-op', () => {
    const s = new Store();
    expect(() => s.clearSelection()).not.toThrow();
  });

  it('undo/redo with empty stacks are safe no-ops', () => {
    const s = new Store();
    expect(() => s.undo()).not.toThrow();
    expect(() => s.redo()).not.toThrow();
    expect(s.canUndo()).toBe(false);
  });

  it('pasting a 3x3 block at the far grid edge does not crash', () => {
    const s = new Store();
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) s.commitCell(c, r, `${r}${c}`);
    s.setActive(0, 0);
    s.setActive(2, 2, true);
    s.copy();
    s.setActive(60, 220); // beyond default 52x200 view
    expect(() => s.paste()).not.toThrow();
    expect(s.getValue(62, 222)).toBe(22); // "22" parses to the number 22
  });
});
