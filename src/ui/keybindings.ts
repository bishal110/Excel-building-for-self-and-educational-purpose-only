/**
 * Single source of truth for keyboard shortcuts. The in-app Help panel is
 * rendered from this same list, so the two can never drift (a Phase-5 build
 * audit will assert Help === this table).
 */

export interface KeyBinding {
  id: string;
  /** Human-readable shortcut, e.g. "Ctrl+B". */
  combo: string;
  description: string;
  category: 'Editing' | 'Clipboard' | 'Formatting' | 'Navigation' | 'Formulas';
}

export const KEYBINDINGS: KeyBinding[] = [
  { id: 'copy', combo: 'Ctrl+C', description: 'Copy selection', category: 'Clipboard' },
  { id: 'cut', combo: 'Ctrl+X', description: 'Cut selection', category: 'Clipboard' },
  { id: 'paste', combo: 'Ctrl+V', description: 'Paste', category: 'Clipboard' },
  { id: 'undo', combo: 'Ctrl+Z', description: 'Undo', category: 'Editing' },
  { id: 'redo', combo: 'Ctrl+Y', description: 'Redo', category: 'Editing' },
  { id: 'bold', combo: 'Ctrl+B', description: 'Bold', category: 'Formatting' },
  { id: 'italic', combo: 'Ctrl+I', description: 'Italic', category: 'Formatting' },
  { id: 'underline', combo: 'Ctrl+U', description: 'Underline', category: 'Formatting' },
  { id: 'selectAll', combo: 'Ctrl+A', description: 'Select all', category: 'Navigation' },
  { id: 'home', combo: 'Home', description: 'Jump to start of row', category: 'Navigation' },
  { id: 'autoSum', combo: 'Alt+=', description: 'AutoSum', category: 'Formulas' },
  { id: 'edit', combo: 'F2', description: 'Edit active cell', category: 'Editing' },
  { id: 'commitDown', combo: 'Enter', description: 'Commit and move down', category: 'Editing' },
  { id: 'commitRight', combo: 'Tab', description: 'Commit and move right', category: 'Editing' },
  { id: 'cancel', combo: 'Esc', description: 'Cancel editing', category: 'Editing' },
  { id: 'delete', combo: 'Delete', description: 'Clear selection', category: 'Editing' },
];

export function bindingsByCategory(): Record<string, KeyBinding[]> {
  const out: Record<string, KeyBinding[]> = {};
  for (const b of KEYBINDINGS) (out[b.category] ??= []).push(b);
  return out;
}
