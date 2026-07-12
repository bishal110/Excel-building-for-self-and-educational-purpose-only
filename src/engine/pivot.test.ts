import { describe, expect, it } from 'vitest';
import { pivotGrid } from './grid/pivot';
import type { CellValue } from './formula/values';

// Well data: Well | Shift | Prod
const DATA: CellValue[][] = [
  ['Well', 'Shift', 'Prod'],
  ['A-1', 'Day', 100],
  ['A-1', 'Night', 120],
  ['A-2', 'Day', 200],
  ['A-2', 'Night', 180],
  ['A-1', 'Day', 50],
];

describe('pivotGrid', () => {
  it('sums by row field only', () => {
    const grid = pivotGrid(DATA, { rowField: 0, colField: null, valueField: 2, agg: 'sum' });
    expect(grid[0]).toEqual(['Well', 'sum of Prod']);
    expect(grid[1]).toEqual(['A-1', '270']);
    expect(grid[2]).toEqual(['A-2', '380']);
    expect(grid[3]).toEqual(['Grand Total', '650']);
  });

  it('pivots rows x columns with grand totals', () => {
    const grid = pivotGrid(DATA, { rowField: 0, colField: 1, valueField: 2, agg: 'sum' });
    expect(grid[0]).toEqual(['Well', 'Day', 'Night', 'Grand Total']);
    expect(grid[1]).toEqual(['A-1', '150', '120', '270']);
    expect(grid[2]).toEqual(['A-2', '200', '180', '380']);
    expect(grid[3]).toEqual(['Grand Total', '350', '300', '650']);
  });

  it('supports count, avg, min, max', () => {
    const count = pivotGrid(DATA, { rowField: 0, colField: null, valueField: 2, agg: 'count' });
    expect(count[1]).toEqual(['A-1', '3']);
    const avg = pivotGrid(DATA, { rowField: 0, colField: null, valueField: 2, agg: 'avg' });
    expect(avg[1]).toEqual(['A-1', '90']); // (100+120+50)/3
    const min = pivotGrid(DATA, { rowField: 0, colField: null, valueField: 2, agg: 'min' });
    expect(min[2]).toEqual(['A-2', '180']);
    const max = pivotGrid(DATA, { rowField: 0, colField: null, valueField: 2, agg: 'max' });
    expect(max[2]).toEqual(['A-2', '200']);
  });

  it('skips fully blank rows and labels blank keys', () => {
    const data: CellValue[][] = [
      ['K', 'V'],
      [null, 5],
      ['x', 7],
      [null, null],
    ];
    const grid = pivotGrid(data, { rowField: 0, colField: null, valueField: 1, agg: 'sum' });
    expect(grid.map((r) => r[0])).toEqual(['K', '(blank)', 'x', 'Grand Total']);
    expect(grid[3]![1]).toBe('12');
  });

  it('ignores non-numeric values for sum but counts them for count', () => {
    const data: CellValue[][] = [
      ['K', 'V'],
      ['a', 10],
      ['a', 'oops'],
    ];
    const sum = pivotGrid(data, { rowField: 0, colField: null, valueField: 1, agg: 'sum' });
    expect(sum[1]).toEqual(['a', '10']);
    const count = pivotGrid(data, { rowField: 0, colField: null, valueField: 1, agg: 'count' });
    expect(count[1]).toEqual(['a', '2']);
  });

  it('handles an empty selection gracefully', () => {
    const grid = pivotGrid([], { rowField: 0, colField: null, valueField: 0, agg: 'sum' });
    expect(grid).toHaveLength(2); // header + grand total
  });
});
