import { useEffect, useRef, useState } from 'react';
import { exportSuite, importSuite, newSuite } from '../../io/suiteProject';
import { parseCsv, toCsv } from '../../io/csv';
import { readXlsxWorkbook, writeXlsxWorkbook } from '../../io/xlsx';
import { store } from '../state/store';
import { downloadBlob, pickFile } from '../fileUtils';
import { Icon } from '../components/Icon';

type Module = 'sheets' | 'docs' | 'slides';

/**
 * App-shell File menu (Excel-style backstage): New, Open (recognizes
 * .aioffice / .xlsx / .xls / .csv), and Save As (project / Excel / CSV).
 * Import/Export are folded in here — no separate toolbar buttons.
 */
export function FileMenu({
  module,
  onSwitchModule,
}: {
  module: Module;
  onSwitchModule: (m: Module) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSaveAsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const close = () => {
    setOpen(false);
    setSaveAsOpen(false);
  };

  const newProject = () => {
    if (confirm('Start a new project? Unsaved changes in all modules will be cleared.')) {
      newSuite();
    }
    close();
  };

  const openFile = async () => {
    close();
    const file = await pickFile(
      '.aioffice,.json,.xlsx,.xls,.xlsm,.csv,.txt,.tsv,' +
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
        'application/vnd.ms-excel,text/csv,text/plain,application/json',
    );
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    try {
      if (ext === 'aioffice' || ext === 'json') {
        const ok = importSuite(JSON.parse(await file.text()));
        if (!ok) alert('Not a valid AI_Office project file.');
      } else if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') {
        const sheets = await readXlsxWorkbook(file);
        if (sheets.length === 0) return alert('That workbook appears to be empty.');
        onSwitchModule('sheets');
        store.openSheets(sheets); // every worksheet becomes a tab
      } else if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
        onSwitchModule('sheets');
        store.openRows(parseCsv(await file.text()), file.name);
      } else {
        alert(`Unsupported file type: .${ext}`);
      }
    } catch {
      alert(`Could not open "${file.name}".`);
    }
  };

  const saveProject = () => {
    downloadBlob(JSON.stringify(exportSuite(), null, 2), 'project.aioffice', 'application/json');
    close();
  };
  const saveXlsx = () => {
    downloadBlob(
      writeXlsxWorkbook(store.exportWorkbookRaw()),
      'workbook.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    close();
  };
  const saveCsv = () => {
    downloadBlob(toCsv(store.exportRows()), 'sheet.csv', 'text/csv');
    close();
  };

  const inSheets = module === 'sheets';

  return (
    <div className="file-menu" ref={ref}>
      <button
        className="file-btn"
        data-testid="file-menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="file" />
        <span>File</span>
        <Icon name="chevronDown" size={13} />
      </button>
      {open && (
        <div className="file-dropdown" role="menu" aria-label="File actions">
          <button role="menuitem" data-testid="file-new" onClick={newProject}>
            <span className="menu-item-icon"><Icon name="plus" /></span>
            <span className="menu-item-copy"><strong>New workspace</strong><small>Start with a clean local project</small></span>
          </button>
          <button role="menuitem" data-testid="file-open" onClick={openFile}>
            <span className="menu-item-icon"><Icon name="file" /></span>
            <span className="menu-item-copy"><strong>Open</strong><small>Excel, CSV, or AI Office project</small></span>
          </button>
          <div className="menu-separator" />
          <div
            className="file-submenu-parent"
            onMouseEnter={() => setSaveAsOpen(true)}
            onMouseLeave={() => setSaveAsOpen(false)}
          >
            <button
              role="menuitem"
              data-testid="file-saveas"
              aria-expanded={saveAsOpen}
              aria-haspopup="menu"
              onClick={() => setSaveAsOpen((v) => !v)}
            >
              <span className="menu-item-icon"><Icon name="download" /></span>
              <span className="menu-item-copy"><strong>Save as</strong><small>Choose a local file format</small></span>
              <Icon name="chevronRight" size={14} />
            </button>
            {saveAsOpen && (
              <div className="file-submenu" role="menu" aria-label="Save formats">
                <button role="menuitem" data-testid="save-project" onClick={saveProject}>AI Office project <span>.aioffice</span></button>
                <button role="menuitem" data-testid="save-xlsx" disabled={!inSheets} onClick={saveXlsx}>Excel workbook <span>.xlsx</span></button>
                <button role="menuitem" data-testid="save-csv" disabled={!inSheets} onClick={saveCsv}>Comma-separated values <span>.csv</span></button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
