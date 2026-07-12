import { useState } from 'react';
import { slidesStore, THEMES, type SlideLayout } from './slidesStore';
import { useSlidesVersion } from './useSlides';
import { SlideList } from './SlideList';
import { SlideContent, themeClass } from './SlideThumb';
import { PresentMode } from './PresentMode';
import { Icon } from '../components/Icon';

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
        <div className="tb-group" aria-label="Slides">
          <button className="tool-btn" data-testid="add-slide" onClick={() => slidesStore.addSlide()}><Icon name="plus" />New slide</button>
          <button className="tool-btn" onClick={() => slidesStore.duplicateSlide(slide.id)}><Icon name="duplicate" />Duplicate</button>
          <button className="tool-btn quiet-danger" data-testid="delete-slide" onClick={() => slidesStore.deleteSlide(slide.id)}><Icon name="trash" />Delete</button>
        </div>
        <div className="tb-group" aria-label="Slide design">
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
        <span className="toolbar-spacer" />
        <div className="tb-group export-group" aria-label="Present and export">
          <button className="primary tool-btn" data-testid="present" onClick={() => setPresenting(true)}><Icon name="play" />Present</button>
          <button className="tool-btn" onClick={() => window.print()}><Icon name="download" />Export PDF</button>
        </div>
      </div>

      <div className="slides-workspace">
        <SlideList />
        <div className="slide-editor">
          <section className="slide-stage" aria-label="Slide canvas">
            <div className="slide-stage-header">
              <span>Canvas</span>
              <span>Slide {slidesStore.activeIndex() + 1} · 16:9</span>
            </div>
            <div className={`slide-canvas ${themeClass(theme)}`} data-testid="slide-canvas">
              <SlideContent slide={slide} />
            </div>
          </section>
          <SlideFields />
        </div>
      </div>

      <div className="status-bar" data-testid="slides-status">
        <span className="status-ready"><span className="status-dot" />Ready</span>
        <span className="status-divider" aria-hidden="true" />
        <span>Slide {slidesStore.activeIndex() + 1} of {slidesStore.slides().length}</span>
        <span className="spacer" />
        <span className="status-local" title="Changes are stored on this device"><Icon name="local" size={13} />Local autosave</span>
        <span className="status-module">Slides</span>
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
    <aside className="slide-fields" data-testid="slide-fields" aria-label="Slide properties">
      <div className="inspector-header">
        <span className="inspector-kicker">Properties</span>
        <strong>Slide details</strong>
      </div>
      <label>
        <span>Title</span>
        <input
          data-testid="field-title"
          value={slide.title}
          onChange={(e) => slidesStore.updateActive({ title: e.target.value })}
        />
      </label>
      {slide.layout === 'image' ? (
        <label>
          <span>Image URL</span>
          <input
            data-testid="field-image"
            value={slide.image}
            placeholder="https://…"
            onChange={(e) => slidesStore.updateActive({ image: e.target.value })}
          />
        </label>
      ) : (
        <label>
          <span>Body</span>
          <textarea
            data-testid="field-body"
            value={slide.body}
            rows={4}
            onChange={(e) => slidesStore.updateActive({ body: e.target.value })}
          />
        </label>
      )}
      <label>
        <span>Speaker notes</span>
        <textarea
          data-testid="field-notes"
          value={slide.notes}
          rows={3}
          placeholder="Notes for the presenter (not shown on the slide)"
          onChange={(e) => slidesStore.updateActive({ notes: e.target.value })}
        />
      </label>
    </aside>
  );
}
