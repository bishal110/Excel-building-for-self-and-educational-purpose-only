import { store } from '../state/store';

/**
 * The documented keyboard shortcuts, as executable data. Both the Sheets key
 * handler AND the in-app Help panel derive from this + the KEYBINDINGS registry,
 * and a build-time audit (`keybindings.audit.test.ts`) fails if the two diverge.
 *
 * Each `id`/`combo` here must match an entry in `../keybindings.ts`.
 */
export interface Shortcut {
  id: string;
  combo: string;
  match: (e: KeyboardEvent) => boolean;
  run: (e: KeyboardEvent) => void;
}

const ctrl = (e: KeyboardEvent) => e.ctrlKey || e.metaKey;

export const SHORTCUTS: Shortcut[] = [
  { id: 'copy', combo: 'Ctrl+C', match: (e) => ctrl(e) && e.key.toLowerCase() === 'c', run: () => store.copy() },
  { id: 'cut', combo: 'Ctrl+X', match: (e) => ctrl(e) && e.key.toLowerCase() === 'x', run: () => store.copy(true) },
  { id: 'paste', combo: 'Ctrl+V', match: (e) => ctrl(e) && e.key.toLowerCase() === 'v', run: () => store.paste() },
  { id: 'undo', combo: 'Ctrl+Z', match: (e) => ctrl(e) && e.key.toLowerCase() === 'z', run: () => store.undo() },
  { id: 'redo', combo: 'Ctrl+Y', match: (e) => ctrl(e) && e.key.toLowerCase() === 'y', run: () => store.redo() },
  { id: 'bold', combo: 'Ctrl+B', match: (e) => ctrl(e) && e.key.toLowerCase() === 'b', run: () => store.toggleStyle('bold') },
  { id: 'italic', combo: 'Ctrl+I', match: (e) => ctrl(e) && e.key.toLowerCase() === 'i', run: () => store.toggleStyle('italic') },
  { id: 'underline', combo: 'Ctrl+U', match: (e) => ctrl(e) && e.key.toLowerCase() === 'u', run: () => store.toggleStyle('underline') },
  { id: 'selectAll', combo: 'Ctrl+A', match: (e) => ctrl(e) && e.key.toLowerCase() === 'a', run: () => store.selectAll() },
  { id: 'home', combo: 'Home', match: (e) => !ctrl(e) && e.key === 'Home', run: (e) => store.setActive(0, store.selection.active.row, e.shiftKey) },
  { id: 'autoSum', combo: 'Alt+=', match: (e) => e.altKey && e.key === '=', run: () => store.autoSum() },
  { id: 'edit', combo: 'F2', match: (e) => e.key === 'F2', run: () => store.startEditing(store.selection.active) },
  { id: 'commitDown', combo: 'Enter', match: (e) => !ctrl(e) && e.key === 'Enter', run: (e) => store.moveActive(0, e.shiftKey ? -1 : 1) },
  { id: 'commitRight', combo: 'Tab', match: (e) => e.key === 'Tab', run: (e) => store.moveActive(e.shiftKey ? -1 : 1, 0) },
  { id: 'cancel', combo: 'Esc', match: (e) => e.key === 'Escape', run: () => store.stopEditing() },
  { id: 'delete', combo: 'Delete', match: (e) => e.key === 'Delete' || e.key === 'Backspace', run: () => store.clearSelection() },
];

/** Try to run a documented shortcut. Returns true if one matched. */
export function dispatchShortcut(e: KeyboardEvent): boolean {
  for (const s of SHORTCUTS) {
    if (s.match(e)) {
      s.run(e);
      return true;
    }
  }
  return false;
}
