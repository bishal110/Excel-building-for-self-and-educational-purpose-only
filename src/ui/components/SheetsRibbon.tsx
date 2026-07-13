import { useState } from 'react';
import type { ReactNode } from 'react';
import { PRESETS } from '../../engine/format/numberFormat';
import { store, selectionBox } from '../state/store';
import { useStoreVersion } from '../state/useStore';
import { Icon } from './Icon';
import { DialogFrame } from './DialogFrame';
import { toast } from './dialogs';

const FORMAT_OPTIONS: { key: string; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'integer', label: '1,234' },
  { key: 'number2', label: '1,234.00' },
  { key: 'percent', label: 'Percent' },
  { key: 'inr', label: '₹ Indian' },
  { key: 'usd', label: '$ USD' },
];

type Tab = 'home' | 'insert' | 'data' | 'view';

export function SheetsRibbon({
  onOpenChart,
  onOpenPivot,
  onOpenMacro,
  onOpenHelp,
}: {
  onOpenChart: () => void;
  onOpenPivot: () => void;
  onOpenMacro: () => void;
  onOpenHelp: () => void;
}) {
  useStoreVersion();
  const [tab, setTab] = useState<Tab>('home');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const box = selectionBox(store.selection);
  const currentStyle = store.getStyle(box.c1, box.r1);

  return (
    <div className="ribbon" data-testid="sheets-ribbon">
      <div
        className="ribbon-tabs"
        role="tablist"
        aria-label="Ribbon tabs"
        onKeyDown={(e) => {
          // Arrow/Home/End navigation with roving tabindex (WAI-ARIA tabs).
          const order: Tab[] = ['home', 'insert', 'data', 'view'];
          const idx = order.indexOf(tab);
          let next: Tab | null = null;
          if (e.key === 'ArrowRight') next = order[(idx + 1) % order.length]!;
          else if (e.key === 'ArrowLeft') next = order[(idx - 1 + order.length) % order.length]!;
          else if (e.key === 'Home') next = order[0]!;
          else if (e.key === 'End') next = order[order.length - 1]!;
          if (next) {
            e.preventDefault();
            setTab(next);
            (e.currentTarget.querySelector(`[data-testid="ribbon-tab-${next}"]`) as HTMLElement)?.focus();
          }
        }}
      >
        {(['home', 'insert', 'data', 'view'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            data-testid={`ribbon-tab-${t}`}
            className={'ribbon-tab' + (tab === t ? ' active' : '')}
            aria-selected={tab === t}
            aria-controls="sheets-ribbon-panel"
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
          >
            {t[0]!.toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="ribbon-body" data-testid="toolbar" id="sheets-ribbon-panel" role="tabpanel">
        {tab === 'home' && (
          <>
            <Group label="Undo">
              <button className="icon-btn" aria-label="Undo" disabled={!store.canUndo()} onClick={() => store.undo()} title="Undo (Ctrl+Z)"><Icon name="undo" /></button>
              <button className="icon-btn" aria-label="Redo" disabled={!store.canRedo()} onClick={() => store.redo()} title="Redo (Ctrl+Y)"><Icon name="redo" /></button>
            </Group>
            <Group label="Clipboard">
              <button className="icon-btn" aria-label="Cut" onClick={() => store.copy(true)} title="Cut (Ctrl+X)"><Icon name="cut" /></button>
              <button className="icon-btn" aria-label="Copy" onClick={() => store.copy()} title="Copy (Ctrl+C)"><Icon name="copy" /></button>
              <button className="icon-btn" aria-label="Paste" onClick={() => store.paste()} title="Paste (Ctrl+V)"><Icon name="paste" /></button>
            </Group>
            <Group label="Font">
              <button className={currentStyle?.bold ? 'icon-btn active' : 'icon-btn'} aria-pressed={!!currentStyle?.bold} onClick={() => store.toggleStyle('bold')} title="Bold (Ctrl+B)"><b>B</b></button>
              <button className={currentStyle?.italic ? 'icon-btn active' : 'icon-btn'} aria-pressed={!!currentStyle?.italic} onClick={() => store.toggleStyle('italic')} title="Italic (Ctrl+I)"><i>I</i></button>
              <button className={currentStyle?.underline ? 'icon-btn active' : 'icon-btn'} aria-pressed={!!currentStyle?.underline} onClick={() => store.toggleStyle('underline')} title="Underline (Ctrl+U)"><u>U</u></button>
            </Group>
            <Group label="Alignment">
              <button className={currentStyle?.align === 'left' ? 'icon-btn active' : 'icon-btn'} aria-pressed={currentStyle?.align === 'left'} onClick={() => store.applyStyle({ align: 'left' })} title="Align left"><Icon name="alignLeft" /></button>
              <button className={currentStyle?.align === 'center' ? 'icon-btn active' : 'icon-btn'} aria-pressed={currentStyle?.align === 'center'} onClick={() => store.applyStyle({ align: 'center' })} title="Align center"><Icon name="alignCenter" /></button>
              <button className={currentStyle?.align === 'right' ? 'icon-btn active' : 'icon-btn'} aria-pressed={currentStyle?.align === 'right'} onClick={() => store.applyStyle({ align: 'right' })} title="Align right"><Icon name="alignRight" /></button>
            </Group>
            <Group label="Number">
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
            <Group label="Cells">
              <button className="tool-btn" onClick={() => store.insertRowAt(box.r1)} data-testid="insert-row"><Icon name="insertRow" />Insert row</button>
              <button className="tool-btn" onClick={() => store.insertColAt(box.c1)}><Icon name="insertColumn" />Insert column</button>
              <button className="tool-btn quiet-danger" onClick={() => store.deleteRowAt(box.r1)}><Icon name="trash" />Delete row</button>
              <button className="tool-btn quiet-danger" onClick={() => store.deleteColAt(box.c1)}><Icon name="trash" />Delete column</button>
            </Group>
            <Group label="Editing">
              <button className="tool-btn" onClick={() => store.autoSum()} title="AutoSum (Alt+=)"><span className="sigma-icon">Σ</span>AutoSum</button>
              <button className="tool-btn" onClick={() => store.clearSelection()} title="Clear contents (Delete)"><Icon name="eraser" />Clear</button>
            </Group>
          </>
        )}

        {tab === 'insert' && (
          <>
            <Group label="Tables">
              <button className="big-btn" data-testid="open-pivot" onClick={onOpenPivot}>
                <Icon name="table" size={20} />PivotTable
              </button>
            </Group>
            <Group label="Charts">
              <button className="big-btn" data-testid="open-chart" onClick={onOpenChart}>
                <Icon name="chart" size={20} />Chart
              </button>
            </Group>
            <Group label="Cells">
              <button className="tool-btn" onClick={() => store.insertRowAt(box.r1)}><Icon name="insertRow" />Insert row</button>
              <button className="tool-btn" onClick={() => store.insertColAt(box.c1)}><Icon name="insertColumn" />Insert column</button>
            </Group>
          </>
        )}

        {tab === 'data' && (
          <>
            <Group label="Sort & Filter">
              <button className="tool-btn" onClick={() => store.sortSelection(true)} title="Sort ascending"><Icon name="sortAscending" />A to Z</button>
              <button className="tool-btn" onClick={() => store.sortSelection(false)} title="Sort descending"><Icon name="sortDescending" />Z to A</button>
              <button className="tool-btn" data-testid="open-find-replace" onClick={() => setShowFindReplace(true)}><Icon name="search" />Find &amp; Replace</button>
            </Group>
            <Group label="Analysis">
              <button className="big-btn" onClick={onOpenPivot}>
                <Icon name="table" size={20} />PivotTable
              </button>
              <button className="big-btn" onClick={onOpenChart}>
                <Icon name="chart" size={20} />Chart
              </button>
            </Group>
          </>
        )}

        {tab === 'view' && (
          <>
            <Group label="Window">
              <button className="tool-btn" onClick={() => store.toggleFreeze()} title="Freeze panes"><Icon name="freeze" />Freeze</button>
            </Group>
            <Group label="Automation">
              <button className="tool-btn" data-testid="open-macro" onClick={onOpenMacro}><Icon name="code" />Macros</button>
            </Group>
            <Group label="Help">
              <button className="tool-btn" data-testid="open-help" onClick={onOpenHelp}><Icon name="help" />Help</button>
            </Group>
          </>
        )}
      </div>
      {showFindReplace && <FindReplaceDialog onClose={() => setShowFindReplace(false)} />}
    </div>
  );
}

function FindReplaceDialog({ onClose }: { onClose: () => void }) {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const run = () => {
    if (find === '') return;
    const n = store.findReplaceAll(find, replace);
    onClose();
    toast(`Replaced in ${n} cell(s).`, n > 0 ? 'success' : 'info');
  };
  return (
    <DialogFrame title="Find & Replace" onClose={onClose} className="input-dialog">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <label className="dialog-field">
          <span>Find what</span>
          <input data-testid="fr-find" value={find} autoFocus onChange={(e) => setFind(e.target.value)} />
        </label>
        <label className="dialog-field">
          <span>Replace with</span>
          <input data-testid="fr-replace" value={replace} onChange={(e) => setReplace(e.target.value)} />
        </label>
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" data-testid="fr-run" disabled={find === ''}>
            Replace all
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ribbon-group">
      <div className="ribbon-group-btns">{children}</div>
      <div className="ribbon-group-label">{label}</div>
    </div>
  );
}
