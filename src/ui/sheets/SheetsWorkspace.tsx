import { useEffect, useState } from 'react';
import { store } from '../state/store';
import { dispatchShortcut } from './shortcuts';
import { Toolbar } from '../components/Toolbar';
import { FormulaBar } from '../components/FormulaBar';
import { Grid } from '../components/Grid';
import { SheetTabs } from '../components/SheetTabs';
import { StatusBar } from '../components/StatusBar';
import { MacroEditor } from '../components/MacroEditor';
import { ChartBuilder } from '../components/ChartBuilder';
import { HelpPanel } from '../components/HelpPanel';

type Modal = 'macro' | 'chart' | 'help' | null;

export function SheetsWorkspace() {
  const [modal, setModal] = useState<Modal>(null);

  useEffect(() => {
    const isEditableTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (modal) return;
      if (store.editing || isEditableTarget(e.target)) return;

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
      <Toolbar
        onOpenMacro={() => setModal('macro')}
        onOpenChart={() => setModal('chart')}
        onOpenHelp={() => setModal('help')}
      />
      <FormulaBar />
      <Grid />
      <SheetTabs />
      <StatusBar />
      {modal === 'macro' && <MacroEditor onClose={() => setModal(null)} />}
      {modal === 'chart' && <ChartBuilder onClose={() => setModal(null)} />}
      {modal === 'help' && <HelpPanel onClose={() => setModal(null)} />}
    </>
  );
}
