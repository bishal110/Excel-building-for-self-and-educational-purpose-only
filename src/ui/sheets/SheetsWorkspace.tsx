import { useEffect, useState } from 'react';
import { store } from '../state/store';
import { dispatchShortcut } from './shortcuts';
import { SheetsRibbon } from '../components/SheetsRibbon';
import { FormulaBar } from '../components/FormulaBar';
import { Grid } from '../components/Grid';
import { SheetTabs } from '../components/SheetTabs';
import { StatusBar } from '../components/StatusBar';
import { MacroEditor } from '../components/MacroEditor';
import { ChartBuilder } from '../components/ChartBuilder';
import { PivotBuilder } from '../components/PivotBuilder';
import { HelpPanel } from '../components/HelpPanel';

type Modal = 'macro' | 'chart' | 'pivot' | 'help' | null;

export function SheetsWorkspace() {
  const [modal, setModal] = useState<Modal>(null);

  useEffect(() => {
    const targetOwnsKey = (t: EventTarget | null, e: KeyboardEvent) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      // Form fields and editable regions own every key.
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) {
        return true;
      }
      // Buttons/links own only their activation keys, so a keyboard user can
      // press Enter on a focused toolbar button — while Ctrl+Z etc. still
      // reaches the grid after a mouse click leaves focus on the button.
      if (tag === 'BUTTON' || tag === 'A') {
        return e.key === 'Enter' || e.key === ' ';
      }
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (modal) return;
      if (store.editing || targetOwnsKey(e.target, e)) return;

      // Documented shortcuts (shared with the Help panel via SHORTCUTS/KEYBINDINGS).
      if (dispatchShortcut(e)) {
        if (e.key !== 'Escape') e.preventDefault();
        return;
      }

      const key = e.key;
      // Undocumented navigation / editing behaviours.
      switch (key) {
        case 'ArrowUp': store.moveActive(0, -1, e.shiftKey); return e.preventDefault();
        case 'ArrowDown': store.moveActive(0, 1, e.shiftKey); return e.preventDefault();
        case 'ArrowLeft': store.moveActive(-1, 0, e.shiftKey); return e.preventDefault();
        case 'ArrowRight': store.moveActive(1, 0, e.shiftKey); return e.preventDefault();
      }

      // Type-to-edit: a printable character starts editing the active cell.
      if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        store.startEditing(store.selection.active, key);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal]);

  return (
    <>
      <SheetsRibbon
        onOpenMacro={() => setModal('macro')}
        onOpenChart={() => setModal('chart')}
        onOpenPivot={() => setModal('pivot')}
        onOpenHelp={() => setModal('help')}
      />
      <FormulaBar />
      <Grid />
      <SheetTabs />
      <StatusBar />
      {modal === 'macro' && <MacroEditor onClose={() => setModal(null)} />}
      {modal === 'chart' && <ChartBuilder onClose={() => setModal(null)} />}
      {modal === 'pivot' && <PivotBuilder onClose={() => setModal(null)} />}
      {modal === 'help' && <HelpPanel onClose={() => setModal(null)} />}
    </>
  );
}
