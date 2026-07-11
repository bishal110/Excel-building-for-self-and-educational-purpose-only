import { describe, expect, it } from 'vitest';
import { docToMarkdown, docToStandaloneHtml } from './markdown';

const doc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Report' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Plain ' },
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' and ' },
        { type: 'text', text: 'a link', marks: [{ type: 'link', attrs: { href: 'https://x.com' } }] },
      ],
    },
    {
      type: 'orderedList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'first' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'second' }] }] },
      ],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'WHP' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Prod' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '3200' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1240' }] }] },
          ],
        },
      ],
    },
  ],
};

describe('docToMarkdown', () => {
  const md = docToMarkdown(doc);

  it('renders headings', () => {
    expect(md).toContain('## Report');
  });
  it('renders bold and links', () => {
    expect(md).toContain('**bold**');
    expect(md).toContain('[a link](https://x.com)');
  });
  it('renders ordered lists with incrementing numbers', () => {
    expect(md).toContain('1. first\n2. second');
  });
  it('renders tables with a separator row', () => {
    expect(md).toContain('| WHP | Prod |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('| 3200 | 1240 |');
  });
  it('handles an empty document', () => {
    expect(docToMarkdown({ type: 'doc', content: [] })).toBe('\n');
  });
});

describe('docToStandaloneHtml', () => {
  it('wraps body html and escapes the title', () => {
    const html = docToStandaloneHtml('<p>hi</p>', 'My <Doc>');
    expect(html).toContain('<p>hi</p>');
    expect(html).toContain('My &lt;Doc>');
    expect(html).toContain('<!doctype html>');
  });
});
