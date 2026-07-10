/**
 * Convert a TipTap / ProseMirror document (plain JSON) into a simple, testable
 * block model. Kept separate from the `docx` builder so the mapping logic can be
 * unit-tested without the binary packer.
 */

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  link?: string;
}

export type Block =
  | { kind: 'paragraph'; runs: Run[]; align?: string }
  | { kind: 'heading'; level: number; runs: Run[] }
  | { kind: 'listItem'; ordered: boolean; runs: Run[] }
  | { kind: 'table'; rows: Run[][][] };

interface PmNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

function runsFromInline(nodes: PmNode[] | undefined): Run[] {
  const runs: Run[] = [];
  for (const n of nodes ?? []) {
    if (n.type !== 'text' || !n.text) continue;
    const run: Run = { text: n.text };
    for (const m of n.marks ?? []) {
      if (m.type === 'bold') run.bold = true;
      else if (m.type === 'italic') run.italic = true;
      else if (m.type === 'underline') run.underline = true;
      else if (m.type === 'link') run.link = String(m.attrs?.href ?? '');
    }
    runs.push(run);
  }
  return runs;
}

function firstParagraphRuns(node: PmNode): Run[] {
  // A list item / table cell wraps its text in a paragraph.
  const para = node.content?.find((c) => c.type === 'paragraph');
  return runsFromInline(para?.content ?? node.content);
}

export function parsePmDoc(doc: unknown): Block[] {
  const root = doc as PmNode | undefined;
  const blocks: Block[] = [];
  for (const node of root?.content ?? []) {
    switch (node.type) {
      case 'paragraph':
        blocks.push({
          kind: 'paragraph',
          runs: runsFromInline(node.content),
          align: node.attrs?.textAlign as string | undefined,
        });
        break;
      case 'heading':
        blocks.push({
          kind: 'heading',
          level: Number(node.attrs?.level ?? 1),
          runs: runsFromInline(node.content),
        });
        break;
      case 'bulletList':
      case 'orderedList': {
        const ordered = node.type === 'orderedList';
        for (const item of node.content ?? []) {
          blocks.push({ kind: 'listItem', ordered, runs: firstParagraphRuns(item) });
        }
        break;
      }
      case 'table': {
        const rows: Run[][][] = [];
        for (const row of node.content ?? []) {
          const cells: Run[][] = [];
          for (const cell of row.content ?? []) {
            cells.push(firstParagraphRuns(cell));
          }
          rows.push(cells);
        }
        blocks.push({ kind: 'table', rows });
        break;
      }
      default:
        break;
    }
  }
  return blocks;
}

/** Flatten a document to plain text (for word count / previews). */
export function docToText(doc: unknown): string {
  const parts: string[] = [];
  const walk = (n: PmNode) => {
    if (n.type === 'text' && n.text) parts.push(n.text);
    for (const c of n.content ?? []) walk(c);
    if (n.type === 'paragraph' || n.type === 'heading') parts.push('\n');
  };
  walk(doc as PmNode);
  return parts.join('');
}
