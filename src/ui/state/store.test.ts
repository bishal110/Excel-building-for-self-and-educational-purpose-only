import { beforeEach, describe, expect, it } from 'vitest';
import { Store, selectionBox } from './store';

describe('Store editing and undo', () => {
  let s: Store;
  beforeEach(() => {
    s = new Store();
  });

  it('commits a cell and reads its value', () => {
    s.commitCell(0, 0, '42');
    expect(s.getValue(0, 0)).toBe(42);
    expect(s.getRaw(0, 0)).toBe('42');
  });

  it('evaluates formulas across cells', () => {
    s.commitCell(0, 0, '10');
    s.commitCell(0, 1, '=A1*2');
    expect(s.getValue(0, 1)).toBe(20);
  });

  it('undoes and redoes edits', () => {
    s.commitCell(0, 0, '1');
    s.commitCell(0, 0, '2');
    expect(s.getValue(0, 0)).toBe(2);
    s.undo();
    expect(s.getValue(0, 0)).toBe(1);
    s.undo();
    expect(s.getValue(0, 0)).toBeNull();
    s.redo();
    expect(s.getValue(0, 0)).toBe(1);
  });

  it('caps undo history at 100 steps', () => {
    for (let i = 0; i < 130; i++) s.commitCell(0, 0, String(i));
    let count = 0;
    while (s.canUndo()) {
      s.undo();
      count++;
    }
    expect(count).toBe(100);
  });
});

describe('Store selection and stats', () => {
  let s: Store;
  beforeEach(() => {
    s = new Store();
    s.commitCell(0, 0, '10');
    s.commitCell(0, 1, '20');
    s.commitCell(0, 2, '30');
    s.commitCell(0, 3, 'text');
  });

  it('computes selection box from anchor/active', () => {
    s.setActive(0, 0);
    s.setActive(0, 3, true);
    expect(selectionBox(s.selection)).toEqual({ c1: 0, r1: 0, c2: 0, r2: 3 });
  });

  it('reports sum/avg/count over the selection', () => {
    s.setActive(0, 0);
    s.setActive(0, 3, true);
    const stats = s.selectionStats();
    expect(stats.count).toBe(3);
    expect(stats.sum).toBe(60);
    expect(stats.avg).toBe(20);
  });

  it('autoSum inserts a SUM formula for the contiguous numbers above', () => {
    // A1:A3 are numeric, A4 is text — autoSum from A4 should not be reached;
    // use a clean column instead.
    s.commitCell(2, 0, '10');
    s.commitCell(2, 1, '20');
    s.commitCell(2, 2, '30');
    s.setActive(2, 3);
    s.autoSum();
    expect(s.getRaw(2, 3)).toBe('=SUM(C1:C3)');
    expect(s.getValue(2, 3)).toBe(60);
  });
});

describe('Store clipboard and formatting', () => {
  let s: Store;
  beforeEach(() => {
    s = new Store();
  });

  it('copies and pastes with relative-ref adjustment', () => {
    s.commitCell(0, 0, '5');
    s.commitCell(1, 0, '=A1*2');
    s.setActive(1, 0);
    s.copy();
    s.setActive(1, 1);
    s.paste();
    expect(s.getRaw(1, 1)).toBe('=A2*2');
  });

  it('cut moves content and clears the source', () => {
    s.commitCell(0, 0, 'x');
    s.setActive(0, 0);
    s.copy(true);
    s.setActive(2, 2);
    s.paste();
    expect(s.getValue(2, 2)).toBe('x');
    expect(s.getValue(0, 0)).toBeNull();
  });

  it('toggles bold on the selection', () => {
    s.setActive(0, 0);
    s.toggleStyle('bold');
    expect(s.getStyle(0, 0)?.bold).toBe(true);
    s.toggleStyle('bold');
    expect(s.getStyle(0, 0)?.bold).toBe(false);
  });

  it('applies an INR number format to the display text', () => {
    s.commitCell(0, 0, '1234567');
    s.setActive(0, 0);
    s.setNumberFormat('inr');
    expect(s.displayText(0, 0)).toBe('₹12,34,567.00');
  });
});

describe('Store row/column mutations keep styles aligned', () => {
  it('shifts styles down when inserting a row', () => {
    const s = new Store();
    s.commitCell(0, 1, 'b');
    s.setActive(0, 1);
    s.toggleStyle('bold');
    s.insertRowAt(0);
    expect(s.getStyle(0, 2)?.bold).toBe(true);
    expect(s.getValue(0, 2)).toBe('b');
  });
});
