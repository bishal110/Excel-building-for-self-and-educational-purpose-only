import { useEffect, useRef, useState } from 'react';
import { exportSuite, importSuite, newSuite } from '../../io/suiteProject';
import { parseCsv, toCsv } from '../../io/csv';
import { readXlsxWorkbook, writeXlsxWorkbook } from '../../io/xlsx';
import { store } from '../state/store';
import { downloadBlob, pickFile } from '../fileUtils';
import { Icon } from '../components/Icon';
import { ConfirmDialog, toast } from '../components/dialogs';

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
  const [confirmNew, setConfirmNew] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const close = (returnFocus = false) => {
    setOpen(false);
    setSaveAsOpen(false);
    if (returnFocus) triggerRef.current?.focus();
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
        if (!ok) return toast('Not a valid AI_Office project file.', 'error');
        toast(`Opened project "${file.name}".`, 'success');
      } else if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') {
        const sheets = await readXlsxWorkbook(file);
        if (sheets.length === 0) return toast('That workbook appears to be empty.', 'error');
        onSwitchModule('sheets');
        store.openSheets(sheets); // every worksheet becomes a tab
        toast(`Opened ${sheets.length} sheet(s) from "${file.name}".`, 'success');
      } else if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
        onSwitchModule('sheets');
        store.openRows(parseCsv(await file.text()), file.name);
        toast(`Opened "${file.name}".`, 'success');
      } else {
        toast(`Unsupported file type: .${ext}`, 'error');
      }
    } catch (e) {
      toast(
        `Could not open "${file.name}": ${e instanceof Error ? e.message : 'unknown error'}`,
        'error',
      );
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

  /** Roving focus among the menu items currently in the given container. */
  const moveFocus = (container: HTMLElement, delta: 1 | -1 | 'first' | 'last') => {
    const items = [...container.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')];
    if (items.length === 0) return;
    if (delta === 'first') return items[0]!.focus();
    if (delta === 'last') return items[items.length - 1]!.focus();
    const idx = items.indexOf(document.activeElement as HTMLElement);
    const next = items[(idx + delta + items.length) % items.length]!;
    next.focus();
  };

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const menu = e.currentTarget;
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        if (saveAsOpen) setSaveAsOpen(false);
        else close(true);
        return;
      case 'ArrowDown':
        e.preventDefault();
        return moveFocus(menu, 1);
      case 'ArrowUp':
        e.preventDefault();
        return moveFocus(menu, -1);
      case 'Home':
        e.preventDefault();
        return moveFocus(menu, 'first');
      case 'End':
        e.preventDefault();
        return moveFocus(menu, 'last');
    }
  };

  return (
    <div className="file-menu" ref={ref}>
      <button
        ref={triggerRef}
        className="file-btn"
        data-testid="file-menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && open) {
            e.preventDefault();
            const menu = ref.current?.querySelector<HTMLElement>('.file-dropdown');
            if (menu) moveFocus(menu, 'first');
          }
        }}
      >
        <Icon name="file" />
        <span>File</span>
        <Icon name="chevronDown" size={13} />
      </button>
      {open && (
        <div className="file-dropdown" role="menu" aria-label="File actions" onKeyDown={onMenuKeyDown}>
          <button role="menuitem" data-testid="file-new" onClick={() => { close(); setConfirmNew(true); }}>
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
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setSaveAsOpen(true);
                  requestAnimationFrame(() => {
                    const sub = ref.current?.querySelector<HTMLElement>('.file-submenu');
                    if (sub) moveFocus(sub, 'first');
                  });
                }
              }}
            >
              <span className="menu-item-icon"><Icon name="download" /></span>
              <span className="menu-item-copy"><strong>Save as</strong><small>Choose a local file format</small></span>
              <Icon name="chevronRight" size={14} />
            </button>
            {saveAsOpen && (
              <div
                className="file-submenu"
                role="menu"
                aria-label="Save formats"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    e.stopPropagation();
                    setSaveAsOpen(false);
                    ref.current?.querySelector<HTMLElement>('[data-testid="file-saveas"]')?.focus();
                  }
                }}
              >
                <button role="menuitem" data-testid="save-project" onClick={saveProject}>AI Office project <span>.aioffice</span></button>
                <button role="menuitem" data-testid="save-xlsx" disabled={!inSheets} onClick={saveXlsx}>Excel workbook — all sheets <span>.xlsx</span></button>
                <button role="menuitem" data-testid="save-csv" disabled={!inSheets} onClick={saveCsv}>CSV — active sheet only <span>.csv</span></button>
              </div>
            )}
          </div>
        </div>
      )}
      {confirmNew && (
        <ConfirmDialog
          title="Start a new project"
          message="Unsaved changes in Sheets, Docs, and Slides will all be cleared. Continue?"
          confirmLabel="New project"
          danger
          onConfirm={() => newSuite()}
          onClose={() => setConfirmNew(false)}
        />
      )}
    </div>
  );
}
