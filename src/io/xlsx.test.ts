import { describe, expect, it } from 'vitest';
import { readXlsx, writeXlsx } from './xlsx';

describe('xlsx round-trip', () => {
  it('preserves text, numbers, and formulas', async () => {
    const rows = [
      ['Well', 'WHP', 'Total'],
      ['A-1', '3200', '=B2*2'],
      ['A-2', '3185', ''],
    ];
    const blob = writeXlsx(rows);
    expect(blob).toBeInstanceOf(Blob);

    // readXlsx only needs an object with arrayBuffer(); a Blob suffices.
    const back = await readXlsx(blob as unknown as File);
    expect(back[0]).toEqual(['Well', 'WHP', 'Total']);
    expect(back[1]![0]).toBe('A-1');
    expect(back[1]![1]).toBe('3200');
    expect(back[1]![2]).toBe('=B2*2');
  });

  it('handles an empty grid', () => {
    const blob = writeXlsx([['']]);
    expect(blob).toBeInstanceOf(Blob);
  });
});
