import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import { exportDocxBlob } from '../../io/docx';
import { docToMarkdown, docToStandaloneHtml } from '../../io/markdown';
import { textStats } from '../../io/wordCount';
import { downloadBlob } from '../fileUtils';
import { DocRibbon, type DocExportFormat } from './DocRibbon';

const DOC_KEY = 'ai-office:doc';

const DEFAULT_DOC = `
<h1>Untitled document</h1>
<p>Start typing here. Use the ribbon above to format text, add lists, insert a
table, image, or link — then export to <strong>.docx</strong> or print to PDF.</p>
`;

function loadInitial(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_DOC;
  try {
    return localStorage.getItem(DOC_KEY) || DEFAULT_DOC;
  } catch {
    return DEFAULT_DOC;
  }
}

export function DocsView() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: loadInitial(),
    onUpdate: ({ editor }) => {
      try {
        localStorage.setItem(DOC_KEY, editor.getHTML());
      } catch {
        /* storage unavailable */
      }
    },
  });

  // Reload content when a whole-suite project is opened or reset.
  useEffect(() => {
    if (!editor) return;
    const onLoaded = (e: Event) => {
      const html = (e as CustomEvent<string>).detail ?? DEFAULT_DOC;
      editor.commands.setContent(html || DEFAULT_DOC);
    };
    window.addEventListener('aioffice:doc-loaded', onLoaded);
    return () => window.removeEventListener('aioffice:doc-loaded', onLoaded);
  }, [editor]);

  if (!editor) return <div className="doc-loading">Loading editor…</div>;

  const stats = textStats(editor.getText());

  const exportAs = async (format: DocExportFormat) => {
    switch (format) {
      case 'docx':
        downloadBlob(
          await exportDocxBlob(editor.getJSON()),
          'document.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
        break;
      case 'md':
        downloadBlob(docToMarkdown(editor.getJSON()), 'document.md', 'text/markdown');
        break;
      case 'html':
        downloadBlob(
          docToStandaloneHtml(editor.getHTML(), 'AI_Office document'),
          'document.html',
          'text/html',
        );
        break;
      case 'txt':
        downloadBlob(editor.getText(), 'document.txt', 'text/plain');
        break;
    }
  };

  return (
    <>
      <DocRibbon editor={editor} onExport={exportAs} onPrint={() => window.print()} />
      <div className="doc-scroll">
        <div className="doc-page" data-testid="doc-page">
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="status-bar" data-testid="doc-status">
        <span data-testid="word-count">Words: {stats.words}</span>
        <span>Characters: {stats.characters}</span>
        <span className="spacer" />
        <span>AI_Office · Docs</span>
      </div>
    </>
  );
}
