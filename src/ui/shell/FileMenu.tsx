import { useEffect, useRef, useState } from 'react';
import { exportSuite, importSuite, newSuite } from '../../io/suiteProject';
import { parseCsv, toCsv } from '../../io/csv';
import { readXlsx, writeXlsx } from '../../io/xlsx';
import { store } from '../state/store';
import { downloadBlob, pickFile } from '../fileUtils';

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
        const rows = await readXlsx(file);
        if (rows.length === 0) return alert('That workbook appears to be empty.');
        onSwitchModule('sheets');
        store.openRows(rows, file.name);
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
      writeXlsx(store.exportRowsRaw()),
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
      <button className="file-btn" data-testid="file-menu" onClick={() => setOpen((v) => !v)}>
        File ▾
      </button>
      {open && (
        <div className="file-dropdown" role="menu">
          <button role="menuitem" data-testid="file-new" onClick={newProject}>New</button>
          <button role="menuitem" data-testid="file-open" onClick={openFile}>Open…  (Excel, CSV, or project)</button>
          <div
            className="file-submenu-parent"
            onMouseEnter={() => setSaveAsOpen(true)}
            onMouseLeave={() => setSaveAsOpen(false)}
          >
            <button role="menuitem" data-testid="file-saveas">Save As ▸</button>
            {saveAsOpen && (
              <div className="file-submenu">
                <button data-testid="save-project" onClick={saveProject}>AI_Office project (.aioffice)</button>
                <button data-testid="save-xlsx" disabled={!inSheets} onClick={saveXlsx}>Excel workbook (.xlsx)</button>
                <button data-testid="save-csv" disabled={!inSheets} onClick={saveCsv}>CSV (.csv)</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
