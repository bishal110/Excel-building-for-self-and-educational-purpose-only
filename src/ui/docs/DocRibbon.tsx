import type { Editor } from '@tiptap/react';
import { sanitizeImageUrl, sanitizeLinkUrl } from '../security';

const FONTS = ['Default', 'Arial', 'Georgia', 'Times New Roman', 'Courier New'];

export function DocRibbon({
  editor,
  onExportDocx,
  onPrint,
}: {
  editor: Editor;
  onExportDocx: () => void;
  onPrint: () => void;
}) {
  const active = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs) ? ' active' : '';

  const styleValue = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
      ? 'h2'
      : editor.isActive('heading', { level: 3 })
        ? 'h3'
        : 'p';

  return (
    <div className="toolbar" data-testid="doc-ribbon">
      <div className="tb-group">
        <select
          value={styleValue}
          data-testid="style-select"
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
          }}
          title="Paragraph style"
        >
          <option value="p">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <select
          title="Font"
          onChange={(e) => {
            const f = e.target.value;
            if (f === 'Default') editor.chain().focus().unsetFontFamily().run();
            else editor.chain().focus().setFontFamily(f).run();
          }}
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div className="tb-group">
        <button className={active('bold')} data-testid="doc-bold" onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)"><b>B</b></button>
        <button className={active('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)"><i>I</i></button>
        <button className={active('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)"><u>U</u></button>
      </div>

      <div className="tb-group">
        <button className={active('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">• List</button>
        <button className={active('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1. List</button>
      </div>

      <div className="tb-group">
        <button className={active({ textAlign: 'left' } as never)} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left">⯇</button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center">≡</button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right">⯈</button>
      </div>

      <div className="tb-group">
        <button
          data-testid="insert-table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insert table"
        >
          Table
        </button>
        <button
          onClick={() => {
            const url = prompt('Image URL');
            if (!url) return;
            const safe = sanitizeImageUrl(url);
            if (safe) editor.chain().focus().setImage({ src: safe }).run();
            else alert('Only http(s) or data:image URLs are allowed.');
          }}
          title="Insert image"
        >
          Image
        </button>
        <button
          onClick={() => {
            const url = prompt('Link URL');
            if (!url) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            const safe = sanitizeLinkUrl(url);
            if (safe) editor.chain().focus().setLink({ href: safe }).run();
            else alert('Only http(s) or mailto links are allowed.');
          }}
          title="Insert link"
        >
          Link
        </button>
      </div>

      <div className="tb-group">
        <button data-testid="export-docx" onClick={onExportDocx}>Export .docx</button>
        <button onClick={onPrint}>Print / PDF</button>
      </div>
    </div>
  );
}
