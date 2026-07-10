import { describe, expect, it } from 'vitest';
import { parsePmDoc, docToText } from './docModel';
import { textStats } from './wordCount';

const sampleDoc = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Report' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' and ' },
        { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
      ],
    },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }] },
      ],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] },
          ],
        },
      ],
    },
  ],
};

describe('parsePmDoc', () => {
  const blocks = parsePmDoc(sampleDoc);

  it('parses a heading with level', () => {
    expect(blocks[0]).toMatchObject({ kind: 'heading', level: 1 });
  });
  it('parses a paragraph with marks and alignment', () => {
    const p = blocks[1]!;
    expect(p.kind).toBe('paragraph');
    if (p.kind === 'paragraph') {
      expect(p.align).toBe('center');
      expect(p.runs.find((r) => r.text === 'bold')?.bold).toBe(true);
      expect(p.runs.find((r) => r.text === 'italic')?.italic).toBe(true);
    }
  });
  it('flattens list items', () => {
    const items = blocks.filter((b) => b.kind === 'listItem');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: 'listItem', ordered: false });
  });
  it('parses a table into rows/cells/runs', () => {
    const table = blocks.find((b) => b.kind === 'table');
    expect(table?.kind).toBe('table');
    if (table?.kind === 'table') {
      expect(table.rows[0]).toHaveLength(2);
      expect(table.rows[0]![0]![0]!.text).toBe('A');
    }
  });
  it('handles an empty doc', () => {
    expect(parsePmDoc({ type: 'doc', content: [] })).toEqual([]);
  });
});

describe('docToText + textStats', () => {
  it('extracts plain text', () => {
    const text = docToText(sampleDoc);
    expect(text).toContain('Report');
    expect(text).toContain('Hello');
  });
  it('counts words', () => {
    expect(textStats('the quick brown fox').words).toBe(4);
    expect(textStats('   ').words).toBe(0);
    expect(textStats('one\ntwo  three').words).toBe(3);
  });
});
