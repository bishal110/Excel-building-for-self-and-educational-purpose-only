import { beforeEach, describe, expect, it } from 'vitest';
import { Store } from './store';

/** Exhaustive audit of every Store feature the toolbar/ribbon exposes. */
describe('AUDIT: number formats', () => {
  let s: Store;
  beforeEach(() => {
    s = new Store();
    s.commitCell(0, 0, '1234567.5');
    s.setActive(0, 0);
  });
  it('general shows the raw number', () => {
    s.setNumberFormat('general');
    expect(s.displayText(0, 0)).toBe('1234567.5');
  });
  it('integer groups with commas', () => {
    s.setNumberFormat('integer');
    expect(s.displayText(0, 0)).toBe('1,234,568');
  });
  it('number2 keeps two decimals', () => {
    s.setNumberFormat('number2');
    expect(s.displayText(0, 0)).toBe('1,234,567.50');
  });
  it('percent multiplies by 100', () => {
    s.commitCell(0, 0, '0.25');
    s.setActive(0, 0);
    s.setNumberFormat('percent');
    expect(s.displayText(0, 0)).toBe('25.00%');
  });
  it('inr uses Indian grouping', () => {
    s.setNumberFormat('inr');
    expect(s.displayText(0, 0)).toBe('₹12,34,567.50');
  });
  it('usd groups with a dollar prefix', () => {
    s.setNumberFormat('usd');
    expect(s.displayText(0, 0)).toBe('$1,234,567.50');
  });
});

describe('AUDIT: row/column insert & delete', () => {
  let s: Store;
  beforeEach(() => {
    s = new Store();
    s.commitCell(0, 0, '1');
    s.commitCell(1, 0, '2');
    s.commitCell(0, 1, '3');
  });
  it('insertColAt shifts data right', () => {
    s.insertColAt(0);
    expect(s.getValue(0, 0)).toBeNull();
    expect(s.getValue(1, 0)).toBe(1);
    expect(s.getValue(2, 0)).toBe(2);
  });
  it('deleteColAt removes a column', () => {
    s.deleteColAt(0);
    expect(s.getValue(0, 0)).toBe(2);
  });
  it('deleteRowAt removes a row', () => {
    s.deleteRowAt(0);
    expect(s.getValue(0, 0)).toBe(3);
  });
  it('column style shifts on insert', () => {
    s.setActive(0, 0);
    s.toggleStyle('bold');
    s.insertColAt(0);
    expect(s.getStyle(1, 0)?.bold).toBe(true);
  });
});

describe('AUDIT: sort and find/replace', () => {
  it('sorts a selection ascending then descending', () => {
    const s = new Store();
    s.commitCell(0, 0, '3');
    s.commitCell(0, 1, '1');
    s.commitCell(0, 2, '2');
    s.setActive(0, 0);
    s.setActive(0, 2, true);
    s.sortSelection(true);
    expect([s.getValue(0, 0), s.getValue(0, 1), s.getValue(0, 2)]).toEqual([1, 2, 3]);
    s.sortSelection(false);
    expect([s.getValue(0, 0), s.getValue(0, 1), s.getValue(0, 2)]).toEqual([3, 2, 1]);
  });
  it('find & replace counts and applies', () => {
    const s = new Store();
    s.commitCell(0, 0, 'well A');
    s.commitCell(0, 1, 'well B');
    const n = s.findReplaceAll('well', 'Well');
    expect(n).toBe(2);
    expect(s.getValue(0, 0)).toBe('Well A');
  });
});

describe('AUDIT: sheets management', () => {
  let s: Store;
  beforeEach(() => {
    s = new Store();
  });
  it('adds, switches, and isolates sheets', () => {
    s.commitCell(0, 0, 'first');
    s.addSheet();
    expect(s.activeIndex()).toBe(1);
    s.commitCell(0, 0, 'second');
    expect(s.getValue(0, 0)).toBe('second');
    s.setActiveSheet(0);
    expect(s.getValue(0, 0)).toBe('first');
  });
  it('renames a sheet', () => {
    s.renameSheet(0, 'Wells');
    expect(s.sheetNames()[0]).toBe('Wells');
  });
  it('removes a sheet but keeps at least one', () => {
    s.addSheet();
    s.removeSheet(1);
    expect(s.sheetNames()).toHaveLength(1);
    s.removeSheet(0); // ignored — last sheet
    expect(s.sheetNames()).toHaveLength(1);
  });
});

describe('AUDIT: freeze, width, selection', () => {
  it('toggles freeze on and off', () => {
    const s = new Store();
    s.setActive(2, 3);
    s.toggleFreeze();
    expect(s.activeMeta().frozenRows).toBeGreaterThan(0);
    s.toggleFreeze();
    expect(s.activeMeta().frozenRows).toBe(0);
  });
  it('sets and clamps column width', () => {
    const s = new Store();
    s.setColWidth(0, 200);
    expect(s.colWidth(0)).toBe(200);
    s.setColWidth(0, 5);
    expect(s.colWidth(0)).toBe(32); // min width
  });
  it('moveActive never goes negative', () => {
    const s = new Store();
    s.setActive(0, 0);
    s.moveActive(-5, -5);
    expect(s.selection.active).toEqual({ col: 0, row: 0 });
  });
  it('selectAll spans the used range', () => {
    const s = new Store();
    s.commitCell(3, 4, 'x');
    s.selectAll();
    expect(s.selection.active).toEqual({ col: 3, row: 4 });
  });
});

describe('AUDIT: project persistence & macros', () => {
  it('round-trips a project through save/load', () => {
    const s = new Store();
    s.commitCell(0, 0, '=1+1');
    s.setActive(0, 0);
    s.toggleStyle('bold');
    const project = s.toProject();
    s.newProject();
    expect(s.getValue(0, 0)).toBeNull();
    s.loadProject(project);
    expect(s.getValue(0, 0)).toBe(2);
    expect(s.getStyle(0, 0)?.bold).toBe(true);
  });
  it('runs a macro and can undo it', () => {
    const s = new Store();
    const res = s.runMacroCode('sheet.set("A1", 5);');
    expect(res.error).toBeUndefined();
    expect(s.getValue(0, 0)).toBe(5);
    s.undo();
    expect(s.getValue(0, 0)).toBeNull();
  });
  it('reports macro errors without throwing', () => {
    const s = new Store();
    const res = s.runMacroCode('nonexistent.call();');
    expect(res.error).toBeTruthy();
  });
  it('imports rows and exports values and raw', () => {
    const s = new Store();
    s.importRows([
      ['a', 'b'],
      ['=1+1', '2'],
    ]);
    expect(s.exportRows()).toEqual([
      ['a', 'b'],
      ['2', '2'],
    ]);
    expect(s.exportRowsRaw()[1]![0]).toBe('=1+1');
  });
});
