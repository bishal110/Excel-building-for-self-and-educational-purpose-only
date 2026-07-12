import { describe, expect, it } from 'vitest';
import { Store } from './store';

describe('fill handle autofill', () => {
  it('extends an arithmetic series downward (1,2 → 3,4,5)', () => {
    const s = new Store();
    s.commitCell(0, 0, '1');
    s.commitCell(0, 1, '2');
    s.autoFill({ c1: 0, r1: 0, c2: 0, r2: 1 }, 'down', 3);
    expect(s.getValue(0, 2)).toBe(3);
    expect(s.getValue(0, 3)).toBe(4);
    expect(s.getValue(0, 4)).toBe(5);
  });

  it('extends a stepped series (10,20 → 30,40) and non-integer steps', () => {
    const s = new Store();
    s.commitCell(0, 0, '10');
    s.commitCell(0, 1, '20');
    s.autoFill({ c1: 0, r1: 0, c2: 0, r2: 1 }, 'down', 2);
    expect(s.getValue(0, 2)).toBe(30);
    expect(s.getValue(0, 3)).toBe(40);

    const t = new Store();
    t.commitCell(0, 0, '0.1');
    t.commitCell(0, 1, '0.2');
    t.autoFill({ c1: 0, r1: 0, c2: 0, r2: 1 }, 'down', 1);
    expect(t.getValue(0, 2)).toBe(0.3); // no FP noise
  });

  it('a single value copies rather than increments', () => {
    const s = new Store();
    s.commitCell(0, 0, '7');
    s.autoFill({ c1: 0, r1: 0, c2: 0, r2: 0 }, 'down', 2);
    expect(s.getValue(0, 1)).toBe(7);
    expect(s.getValue(0, 2)).toBe(7);
  });

  it('formulas re-anchor relatively when filled down', () => {
    const s = new Store();
    s.commitCell(0, 0, '5'); // A1
    s.commitCell(0, 1, '6'); // A2
    s.commitCell(0, 2, '7'); // A3
    s.commitCell(1, 0, '=A1*2'); // B1
    s.autoFill({ c1: 1, r1: 0, c2: 1, r2: 0 }, 'down', 2);
    expect(s.getRaw(1, 1)).toBe('=A2*2');
    expect(s.getValue(1, 1)).toBe(12);
    expect(s.getValue(1, 2)).toBe(14);
  });

  it('text tiles cyclically', () => {
    const s = new Store();
    s.commitCell(0, 0, 'red');
    s.commitCell(0, 1, 'blue');
    s.autoFill({ c1: 0, r1: 0, c2: 0, r2: 1 }, 'down', 3);
    expect(s.getValue(0, 2)).toBe('red');
    expect(s.getValue(0, 3)).toBe('blue');
    expect(s.getValue(0, 4)).toBe('red');
  });

  it('fills rightward along rows', () => {
    const s = new Store();
    s.commitCell(0, 0, '1'); // A1
    s.commitCell(1, 0, '3'); // B1
    s.autoFill({ c1: 0, r1: 0, c2: 1, r2: 0 }, 'right', 2);
    expect(s.getValue(2, 0)).toBe(5);
    expect(s.getValue(3, 0)).toBe(7);
  });

  it('fills upward with the series reversed', () => {
    const s = new Store();
    s.commitCell(0, 3, '10'); // A4
    s.commitCell(0, 4, '20'); // A5
    s.autoFill({ c1: 0, r1: 3, c2: 0, r2: 4 }, 'up', 2);
    expect(s.getValue(0, 2)).toBe(0);
    expect(s.getValue(0, 1)).toBe(-10);
  });

  it('each column fills independently (series next to text)', () => {
    const s = new Store();
    s.commitCell(0, 0, '1');
    s.commitCell(0, 1, '2');
    s.commitCell(1, 0, 'a');
    s.commitCell(1, 1, 'b');
    s.autoFill({ c1: 0, r1: 0, c2: 1, r2: 1 }, 'down', 2);
    expect(s.getValue(0, 2)).toBe(3);
    expect(s.getValue(1, 2)).toBe('a');
  });

  it('selects the whole filled area afterwards and is undoable', () => {
    const s = new Store();
    s.commitCell(0, 0, '1');
    s.commitCell(0, 1, '2');
    s.autoFill({ c1: 0, r1: 0, c2: 0, r2: 1 }, 'down', 2);
    expect(s.selection.anchor).toEqual({ col: 0, row: 0 });
    expect(s.selection.active).toEqual({ col: 0, row: 3 });
    s.undo();
    expect(s.getValue(0, 2)).toBe(null);
  });
});
