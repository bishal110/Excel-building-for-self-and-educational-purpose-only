import { Block, Run, parsePmDoc } from './docModel';

/** Convert TipTap/ProseMirror JSON to Markdown (Word-style "Save As" target). */

function runToMd(run: Run): string {
  let text = run.text;
  if (run.bold) text = `**${text}**`;
  if (run.italic) text = `*${text}*`;
  if (run.underline) text = `<u>${text}</u>`; // Markdown has no underline
  if (run.link) text = `[${text}](${run.link})`;
  return text;
}

function runsToMd(runs: Run[]): string {
  return runs.map(runToMd).join('');
}

function blockToMd(block: Block, listIndex: { n: number }): string {
  switch (block.kind) {
    case 'heading':
      listIndex.n = 0;
      return `${'#'.repeat(Math.min(block.level, 6))} ${runsToMd(block.runs)}`;
    case 'paragraph':
      listIndex.n = 0;
      return runsToMd(block.runs);
    case 'listItem':
      if (block.ordered) {
        listIndex.n += 1;
        return `${listIndex.n}. ${runsToMd(block.runs)}`;
      }
      listIndex.n = 0;
      return `- ${runsToMd(block.runs)}`;
    case 'table': {
      listIndex.n = 0;
      const rows = block.rows.map(
        (row) => `| ${row.map((cell) => runsToMd(cell) || ' ').join(' | ')} |`,
      );
      if (rows.length > 0) {
        const cols = block.rows[0]!.length;
        rows.splice(1, 0, `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`);
      }
      return rows.join('\n');
    }
  }
}

export function docToMarkdown(pmDoc: unknown): string {
  const blocks = parsePmDoc(pmDoc);
  const counter = { n: 0 };
  const parts: string[] = [];
  let prevWasListItem = false;
  for (const block of blocks) {
    const md = blockToMd(block, counter);
    const isListItem = block.kind === 'listItem';
    // Consecutive list items stay in one list; everything else gets a blank line.
    if (parts.length > 0) parts.push(isListItem && prevWasListItem ? '\n' : '\n\n');
    parts.push(md);
    prevWasListItem = isListItem;
  }
  return parts.join('') + '\n';
}

/** Wrap editor HTML in a minimal standalone page (Word-style "Web Page" save). */
export function docToStandaloneHtml(bodyHtml: string, title = 'Document'): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title.replace(/</g, '&lt;')}</title>
<style>
  body { max-width: 760px; margin: 40px auto; padding: 0 20px;
         font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; color: #1a1a1a; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #999; padding: 4px 10px; }
  img { max-width: 100%; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}
