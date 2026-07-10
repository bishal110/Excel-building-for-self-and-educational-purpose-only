import { useEffect, useState } from 'react';
import { store } from './state/store';
import { Toolbar } from './components/Toolbar';
import { FormulaBar } from './components/FormulaBar';
import { Grid } from './components/Grid';
import { SheetTabs } from './components/SheetTabs';
import { StatusBar } from './components/StatusBar';
import { MacroEditor } from './components/MacroEditor';
import { ChartBuilder } from './components/ChartBuilder';
import { HelpPanel } from './components/HelpPanel';

type Modal = 'macro' | 'chart' | 'help' | null;

export function App() {
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
      // Let the active cell editor and any input field handle their own keys.
      if (store.editing || isEditableTarget(e.target)) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key;

      if (ctrl) {
        switch (key.toLowerCase()) {
          case 'c': store.copy(); return e.preventDefault();
          case 'x': store.copy(true); return e.preventDefault();
          case 'v': store.paste(); return e.preventDefault();
          case 'z': store.undo(); return e.preventDefault();
          case 'y': store.redo(); return e.preventDefault();
          case 'b': store.toggleStyle('bold'); return e.preventDefault();
          case 'i': store.toggleStyle('italic'); return e.preventDefault();
          case 'u': store.toggleStyle('underline'); return e.preventDefault();
          case 'a': store.selectAll(); return e.preventDefault();
        }
        return;
      }

      if (e.altKey && key === '=') {
        store.autoSum();
        return e.preventDefault();
      }

      switch (key) {
        case 'ArrowUp': store.moveActive(0, -1, e.shiftKey); return e.preventDefault();
        case 'ArrowDown': store.moveActive(0, 1, e.shiftKey); return e.preventDefault();
        case 'ArrowLeft': store.moveActive(-1, 0, e.shiftKey); return e.preventDefault();
        case 'ArrowRight': store.moveActive(1, 0, e.shiftKey); return e.preventDefault();
        case 'Home': store.setActive(0, store.selection.active.row, e.shiftKey); return e.preventDefault();
        case 'Enter': store.moveActive(0, e.shiftKey ? -1 : 1); return e.preventDefault();
        case 'Tab': store.moveActive(e.shiftKey ? -1 : 1, 0); return e.preventDefault();
        case 'F2': store.startEditing(store.selection.active); return e.preventDefault();
        case 'Delete':
        case 'Backspace': store.clearSelection(); return e.preventDefault();
        case 'Escape': store.stopEditing(); return;
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
    <div className="app">
      <header className="app-header">
        <div className="brand">AI_Office <span className="brand-sub">Sheets</span></div>
      </header>
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
    </div>
  );
}
