import { useState } from 'react';
import { slidesStore, THEMES, type SlideLayout } from './slidesStore';
import { useSlidesVersion } from './useSlides';
import { SlideList } from './SlideList';
import { SlideContent, themeClass } from './SlideThumb';
import { PresentMode } from './PresentMode';

const LAYOUTS: { key: SlideLayout; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'titleBody', label: 'Title + Body' },
  { key: 'image', label: 'Image' },
];

export function SlidesView() {
  useSlidesVersion();
  const [presenting, setPresenting] = useState(false);
  const slide = slidesStore.active();
  const theme = slidesStore.theme();

  return (
    <>
      <div className="toolbar" data-testid="slides-toolbar">
        <div className="tb-group">
          <button data-testid="add-slide" onClick={() => slidesStore.addSlide()}>+ Slide</button>
          <button onClick={() => slidesStore.duplicateSlide(slide.id)}>Duplicate</button>
          <button data-testid="delete-slide" onClick={() => slidesStore.deleteSlide(slide.id)}>Delete</button>
        </div>
        <div className="tb-group">
          <select
            data-testid="layout-select"
            value={slide.layout}
            onChange={(e) => slidesStore.updateActive({ layout: e.target.value as SlideLayout })}
            title="Slide layout"
          >
            {LAYOUTS.map((l) => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
          <select
            data-testid="theme-select"
            value={theme}
            onChange={(e) => slidesStore.setTheme(e.target.value as never)}
            title="Theme"
          >
            {THEMES.map((t) => (
              <option key={t} value={t}>{t[0]!.toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="tb-group">
          <button className="primary" data-testid="present" onClick={() => setPresenting(true)}>▶ Present</button>
          <button onClick={() => window.print()}>Export PDF</button>
        </div>
      </div>

      <div className="slides-workspace">
        <SlideList />
        <div className="slide-editor">
          <div className={`slide-canvas ${themeClass(theme)}`} data-testid="slide-canvas">
            <SlideContent slide={slide} />
          </div>
          <SlideFields />
        </div>
      </div>

      {/* Print-only: every slide, one per page */}
      <div className="slides-print" aria-hidden>
        {slidesStore.slides().map((s) => (
          <div key={s.id} className={`present-slide ${themeClass(theme)}`}>
            <SlideContent slide={s} />
          </div>
        ))}
      </div>

      {presenting && <PresentMode onExit={() => setPresenting(false)} />}
    </>
  );
}

function SlideFields() {
  const slide = slidesStore.active();
  return (
    <div className="slide-fields" data-testid="slide-fields">
      <label>
        Title
        <input
          data-testid="field-title"
          value={slide.title}
          onChange={(e) => slidesStore.updateActive({ title: e.target.value })}
        />
      </label>
      {slide.layout === 'image' ? (
        <label>
          Image URL
          <input
            data-testid="field-image"
            value={slide.image}
            placeholder="https://…"
            onChange={(e) => slidesStore.updateActive({ image: e.target.value })}
          />
        </label>
      ) : (
        <label>
          Body
          <textarea
            data-testid="field-body"
            value={slide.body}
            rows={4}
            onChange={(e) => slidesStore.updateActive({ body: e.target.value })}
          />
        </label>
      )}
      <label>
        Speaker notes
        <textarea
          data-testid="field-notes"
          value={slide.notes}
          rows={3}
          placeholder="Notes for the presenter (not shown on the slide)"
          onChange={(e) => slidesStore.updateActive({ notes: e.target.value })}
        />
      </label>
    </div>
  );
}
