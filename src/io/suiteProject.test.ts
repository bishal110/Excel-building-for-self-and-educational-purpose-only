import { describe, expect, it } from 'vitest';
import { exportSuite, importSuite, newSuite } from './suiteProject';
import { store } from '../ui/state/store';
import { slidesStore } from '../ui/slides/slidesStore';

describe('suite project (whole-suite .aioffice)', () => {
  it('round-trips sheets and slides through export/import', () => {
    store.commitCell(0, 0, '=40+2');
    slidesStore.updateActive({ title: 'Deck A' });
    slidesStore.setTheme('ocean');

    const suite = exportSuite();
    expect(suite.app).toBe('AI_Office');
    expect(suite.kind).toBe('suite');

    newSuite();
    expect(store.getValue(0, 0)).toBeNull();
    expect(slidesStore.active().title).toBe('My Presentation');

    expect(importSuite(suite)).toBe(true);
    expect(store.getValue(0, 0)).toBe(42);
    expect(slidesStore.active().title).toBe('Deck A');
    expect(slidesStore.theme()).toBe('ocean');
  });

  it('rejects a non-AI_Office file', () => {
    expect(importSuite({ app: 'Something' })).toBe(false);
    expect(importSuite(null)).toBe(false);
  });
});
