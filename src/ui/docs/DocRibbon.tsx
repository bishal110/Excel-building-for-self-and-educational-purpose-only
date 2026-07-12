import type { Editor } from '@tiptap/react';
import { sanitizeImageUrl, sanitizeLinkUrl } from '../security';
import { Icon } from '../components/Icon';

const FONTS = ['Default', 'Arial', 'Georgia', 'Times New Roman', 'Courier New'];

export type DocExportFormat = 'docx' | 'md' | 'html' | 'txt';

export function DocRibbon({
  editor,
  onExport,
  onPrint,
}: {
  editor: Editor;
  onExport: (format: DocExportFormat) => void;
  onPrint: () => void;
}) {
  const active = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs) ? ' active' : '';
  const alignmentActive = (align: 'left' | 'center' | 'right') =>
    editor.isActive({ textAlign: align }) ? ' active' : '';

  const styleValue = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
      ? 'h2'
      : editor.isActive('heading', { level: 3 })
        ? 'h3'
        : 'p';

  return (
    <div className="toolbar doc-toolbar" data-testid="doc-ribbon">
      <div className="tb-group" aria-label="Text style">
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

      <div className="tb-group" aria-label="Font formatting">
        <button className={`icon-btn${active('bold')}`} aria-pressed={editor.isActive('bold')} data-testid="doc-bold" onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)"><b>B</b></button>
        <button className={`icon-btn${active('italic')}`} aria-pressed={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)"><i>I</i></button>
        <button className={`icon-btn${active('underline')}`} aria-pressed={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)"><u>U</u></button>
      </div>

      <div className="tb-group" aria-label="Lists">
        <button className={`tool-btn${active('bulletList')}`} aria-pressed={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><Icon name="bulletList" />Bullets</button>
        <button className={`tool-btn${active('orderedList')}`} aria-pressed={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><Icon name="numberedList" />Numbering</button>
      </div>

      <div className="tb-group" aria-label="Paragraph alignment">
        <button className={`icon-btn${alignmentActive('left')}`} aria-pressed={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left"><Icon name="alignLeft" /></button>
        <button className={`icon-btn${alignmentActive('center')}`} aria-pressed={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center"><Icon name="alignCenter" /></button>
        <button className={`icon-btn${alignmentActive('right')}`} aria-pressed={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right"><Icon name="alignRight" /></button>
      </div>

      <div className="tb-group" aria-label="Insert">
        <button
          className="tool-btn"
          data-testid="insert-table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insert table"
        >
          <Icon name="table" />Table
        </button>
        <button
          className="tool-btn"
          onClick={() => {
            const url = prompt('Image URL');
            if (!url) return;
            const safe = sanitizeImageUrl(url);
            if (safe) editor.chain().focus().setImage({ src: safe }).run();
            else alert('Only http(s) or data:image URLs are allowed.');
          }}
          title="Insert image"
        >
          <Icon name="image" />Image
        </button>
        <button
          className="tool-btn"
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
          <Icon name="link" />Link
        </button>
      </div>

      <span className="toolbar-spacer" />
      <div className="tb-group export-group" aria-label="Export">
        <Icon name="download" className="select-leading-icon" />
        <select
          data-testid="export-select"
          value=""
          onChange={(e) => {
            const v = e.target.value as DocExportFormat | '';
            if (v) onExport(v);
            e.target.value = '';
          }}
          title="Download the document in a chosen format"
        >
          <option value="" disabled>Download as…</option>
          <option value="docx">Word (.docx)</option>
          <option value="md">Markdown (.md)</option>
          <option value="html">Web page (.html)</option>
          <option value="txt">Plain text (.txt)</option>
        </select>
        <button className="tool-btn" onClick={onPrint}><Icon name="print" />Print / PDF</button>
      </div>
    </div>
  );
}
