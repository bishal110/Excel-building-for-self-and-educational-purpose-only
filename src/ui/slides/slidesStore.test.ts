import { beforeEach, describe, expect, it } from 'vitest';
import { SlidesStore } from './slidesStore';

describe('SlidesStore', () => {
  let s: SlidesStore;
  beforeEach(() => {
    s = new SlidesStore();
  });

  it('starts with one slide', () => {
    expect(s.slides()).toHaveLength(1);
    expect(s.activeIndex()).toBe(0);
  });

  it('adds a slide after the active one and selects it', () => {
    s.addSlide();
    expect(s.slides()).toHaveLength(2);
    expect(s.activeIndex()).toBe(1);
  });

  it('duplicates a slide', () => {
    s.updateActive({ title: 'Original' });
    s.duplicateSlide(s.active().id);
    expect(s.slides()).toHaveLength(2);
    expect(s.active().title).toBe('Original');
    expect(s.slides()[0]!.id).not.toBe(s.slides()[1]!.id);
  });

  it('deletes a slide but keeps at least one', () => {
    s.addSlide();
    s.deleteSlide(s.active().id);
    expect(s.slides()).toHaveLength(1);
    s.deleteSlide(s.active().id); // ignored
    expect(s.slides()).toHaveLength(1);
  });

  it('reorders slides via moveSlide', () => {
    s.updateActive({ title: 'A' });
    s.addSlide();
    s.updateActive({ title: 'B' });
    s.addSlide();
    s.updateActive({ title: 'C' });
    // order: A, B, C → move C (index 2) to front
    s.moveSlide(2, 0);
    expect(s.slides().map((x) => x.title)).toEqual(['C', 'A', 'B']);
  });

  it('updates the active slide content', () => {
    s.updateActive({ title: 'Well Overview', body: 'ESP status', layout: 'titleBody' });
    expect(s.active().title).toBe('Well Overview');
    expect(s.active().body).toBe('ESP status');
  });

  it('navigates next/prev with clamping', () => {
    s.addSlide();
    s.addSlide();
    s.selectIndex(0);
    s.prev();
    expect(s.activeIndex()).toBe(0); // clamped
    s.next();
    expect(s.activeIndex()).toBe(1);
    s.selectIndex(99);
    expect(s.activeIndex()).toBe(2); // clamped
  });

  it('sets a theme', () => {
    s.setTheme('ocean');
    expect(s.theme()).toBe('ocean');
  });

  it('notifies subscribers on change', () => {
    let calls = 0;
    const unsub = s.subscribe(() => calls++);
    s.addSlide();
    s.updateActive({ title: 'x' });
    expect(calls).toBe(2);
    unsub();
    s.addSlide();
    expect(calls).toBe(2);
  });
});
