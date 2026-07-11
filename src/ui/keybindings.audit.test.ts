import { describe, expect, it } from 'vitest';
import { KEYBINDINGS, bindingsByCategory } from './keybindings';
import { SHORTCUTS } from './sheets/shortcuts';

/**
 * Phase-5 requirement: the in-app Help must contain ONLY shortcuts that are
 * actually implemented, and the two must never diverge. The Help panel renders
 * from KEYBINDINGS; the key handler runs SHORTCUTS. This test fails the build if
 * they disagree, so Help can never advertise a shortcut that does nothing (or
 * omit one that works).
 */
describe('Help ↔ keybinding audit', () => {
  const helpIds = new Set(KEYBINDINGS.map((k) => k.id));
  const implementedIds = new Set(SHORTCUTS.map((s) => s.id));

  it('every documented shortcut is implemented', () => {
    const undocumented = [...helpIds].filter((id) => !implementedIds.has(id));
    expect(undocumented, `Help lists shortcuts with no handler: ${undocumented}`).toEqual([]);
  });

  it('every implemented shortcut is documented in Help', () => {
    const missing = [...implementedIds].filter((id) => !helpIds.has(id));
    expect(missing, `Handler runs shortcuts missing from Help: ${missing}`).toEqual([]);
  });

  it('the combo strings match for each id', () => {
    const helpCombo = new Map(KEYBINDINGS.map((k) => [k.id, k.combo]));
    for (const s of SHORTCUTS) {
      expect(helpCombo.get(s.id), `combo mismatch for ${s.id}`).toBe(s.combo);
    }
  });

  it('has no duplicate ids or combos', () => {
    expect(new Set(KEYBINDINGS.map((k) => k.id)).size).toBe(KEYBINDINGS.length);
    expect(new Set(KEYBINDINGS.map((k) => k.combo)).size).toBe(KEYBINDINGS.length);
  });

  it('every binding renders under a category in Help', () => {
    const rendered = Object.values(bindingsByCategory()).flat();
    expect(rendered).toHaveLength(KEYBINDINGS.length);
  });
});
