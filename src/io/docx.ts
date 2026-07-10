import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { Block, Run, parsePmDoc } from './docModel';

const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

function toRuns(runs: Run[]): TextRun[] {
  if (runs.length === 0) return [new TextRun('')];
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.bold,
        italics: r.italic,
        underline: r.underline ? {} : undefined,
      }),
  );
}

function alignmentOf(align?: string) {
  switch (align) {
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    default:
      return AlignmentType.LEFT;
  }
}

function blockToParagraphs(block: Block): (Paragraph | Table)[] {
  switch (block.kind) {
    case 'paragraph':
      return [new Paragraph({ children: toRuns(block.runs), alignment: alignmentOf(block.align) })];
    case 'heading':
      return [
        new Paragraph({
          heading: HEADINGS[Math.min(block.level, 6) - 1] ?? HeadingLevel.HEADING_1,
          children: toRuns(block.runs),
        }),
      ];
    case 'listItem':
      return [
        new Paragraph({
          children: toRuns(block.runs),
          bullet: block.ordered ? undefined : { level: 0 },
          numbering: block.ordered ? { reference: 'ordered', level: 0 } : undefined,
        }),
      ];
    case 'table':
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: block.rows.map(
            (row) =>
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children: [new Paragraph({ children: toRuns(cell) })],
                    }),
                ),
              }),
          ),
        }),
      ];
  }
}

/** Build a `docx` Document from TipTap/ProseMirror JSON. */
export function buildDocxDocument(pmDoc: unknown): Document {
  const blocks = parsePmDoc(pmDoc);
  const children = blocks.flatMap(blockToParagraphs);
  return new Document({
    numbering: {
      config: [
        {
          reference: 'ordered',
          levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
        },
      ],
    },
    sections: [{ children: children.length ? children : [new Paragraph('')] }],
  });
}

export async function exportDocxBlob(pmDoc: unknown): Promise<Blob> {
  return Packer.toBlob(buildDocxDocument(pmDoc));
}
