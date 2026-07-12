import type { ReactNode } from 'react';
import { PRESETS } from '../../engine/format/numberFormat';
import { parseCsv, toCsv } from '../../io/csv';
import { readXlsx, writeXlsx } from '../../io/xlsx';
import { ProjectState } from '../../io/project';
import { store, selectionBox } from '../state/store';
import { useStoreVersion } from '../state/useStore';
import { downloadBlob, pickFile } from '../fileUtils';

const FORMAT_OPTIONS: { key: string; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'integer', label: '1,234' },
  { key: 'number2', label: '1,234.00' },
  { key: 'percent', label: 'Percent' },
  { key: 'inr', label: '₹ Indian' },
  { key: 'usd', label: '$ USD' },
];

export function Toolbar({
  onOpenMacro,
  onOpenChart,
  onOpenHelp,
}: {
  onOpenMacro: () => void;
  onOpenChart: () => void;
  onOpenHelp: () => void;
}) {
  useStoreVersion();

  const importCsv = async () => {
    const file = await pickFile('.csv,.txt,.tsv,text/csv,text/plain');
    if (!file) return;
    try {
      store.importRows(parseCsv(await file.text()));
    } catch {
      alert('Could not read that CSV file.');
    }
  };
  const exportCsv = () => {
    downloadBlob(toCsv(store.exportRows()), 'ai-office.csv', 'text/csv');
  };
  const importXlsx = async () => {
    const file = await pickFile(
      '.xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
    );
    if (!file) return;
    try {
      const rows = await readXlsx(file);
      if (rows.length === 0) {
        alert('That workbook appears to be empty.');
        return;
      }
      store.importRows(rows);
    } catch {
      alert('Could not read that Excel file. Try re-saving it as .xlsx or export to CSV.');
    }
  };
  const exportXlsx = () => {
    downloadBlob(
      writeXlsx(store.exportRowsRaw()),
      'ai-office.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  };
  const saveProject = () => {
    downloadBlob(
      JSON.stringify(store.toProject(), null, 2),
      'workbook.aioffice',
      'application/json',
    );
  };
  const openProject = async () => {
    const file = await pickFile('.aioffice,.json,application/json');
    if (!file) return;
    try {
      const state = JSON.parse(await file.text()) as ProjectState;
      store.loadProject(state);
    } catch {
      alert('Could not open file — not a valid .aioffice project.');
    }
  };
  const findReplace = () => {
    const find = prompt('Find what?');
    if (find === null || find === '') return;
    const replace = prompt('Replace with?') ?? '';
    const n = store.findReplaceAll(find, replace);
    alert(`Replaced in ${n} cell(s).`);
  };

  const box = selectionBox(store.selection);

  return (
    <div className="toolbar" data-testid="toolbar">
      <Group>
        <button onClick={() => store.newProject()} title="New">New</button>
        <button onClick={openProject} title="Open .aioffice">Open</button>
        <button onClick={saveProject} title="Save .aioffice">Save</button>
      </Group>
      <Group>
        <button onClick={importCsv}>Import CSV</button>
        <button onClick={exportCsv} data-testid="export-csv">Export CSV</button>
        <button onClick={importXlsx}>Import xlsx</button>
        <button onClick={exportXlsx}>Export xlsx</button>
      </Group>
      <Group>
        <button disabled={!store.canUndo()} onClick={() => store.undo()} title="Undo (Ctrl+Z)">↶</button>
        <button disabled={!store.canRedo()} onClick={() => store.redo()} title="Redo (Ctrl+Y)">↷</button>
      </Group>
      <Group>
        <button className="fmt-b" onClick={() => store.toggleStyle('bold')} title="Bold (Ctrl+B)"><b>B</b></button>
        <button className="fmt-i" onClick={() => store.toggleStyle('italic')} title="Italic (Ctrl+I)"><i>I</i></button>
        <button className="fmt-u" onClick={() => store.toggleStyle('underline')} title="Underline (Ctrl+U)"><u>U</u></button>
        <button onClick={() => store.applyStyle({ align: 'left' })} title="Align left">⯇</button>
        <button onClick={() => store.applyStyle({ align: 'center' })} title="Align center">≡</button>
        <button onClick={() => store.applyStyle({ align: 'right' })} title="Align right">⯈</button>
      </Group>
      <Group>
        <select
          data-testid="format-select"
          value={store.getStyle(box.c1, box.r1)?.format ?? 'general'}
          onChange={(e) => store.setNumberFormat(e.target.value)}
          title="Number format"
        >
          {FORMAT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key} disabled={!(o.key in PRESETS) && o.key !== 'general'}>
              {o.label}
            </option>
          ))}
        </select>
      </Group>
      <Group>
        <button onClick={() => store.insertRowAt(box.r1)} data-testid="insert-row">Insert row</button>
        <button onClick={() => store.deleteRowAt(box.r1)}>Delete row</button>
        <button onClick={() => store.insertColAt(box.c1)}>Insert col</button>
        <button onClick={() => store.deleteColAt(box.c1)}>Delete col</button>
      </Group>
      <Group>
        <button onClick={() => store.autoSum()} title="AutoSum (Alt+=)">Σ</button>
        <button onClick={() => store.sortSelection(true)} title="Sort ascending">A→Z</button>
        <button onClick={() => store.sortSelection(false)} title="Sort descending">Z→A</button>
        <button onClick={findReplace}>Find &amp; Replace</button>
        <button onClick={() => store.toggleFreeze()}>Freeze</button>
      </Group>
      <Group>
        <button onClick={onOpenChart}>Chart</button>
        <button onClick={onOpenMacro} data-testid="open-macro">Macro</button>
        <button onClick={onOpenHelp} data-testid="open-help">Help</button>
      </Group>
    </div>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <div className="tb-group">{children}</div>;
}
