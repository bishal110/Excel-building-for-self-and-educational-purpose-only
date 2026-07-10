import { useEffect } from 'react';
import { slidesStore } from './slidesStore';
import { SlideContent, themeClass } from './SlideThumb';

export function PresentMode({ onExit }: { onExit: () => void }) {
  const slides = slidesStore.slides();
  const idx = slidesStore.activeIndex();
  const theme = slidesStore.theme();
  const slide = slides[idx]!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        slidesStore.next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        slidesStore.prev();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    // Best-effort real fullscreen (ignored if the browser blocks it).
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      window.removeEventListener('keydown', onKey);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onExit]);

  return (
    <div className="present-backdrop" data-testid="present-mode">
      <div className={`present-slide ${themeClass(theme)}`}>
        <SlideContent slide={slide} />
      </div>
      <div className="present-controls">
        <button onClick={() => slidesStore.prev()} aria-label="Previous">‹</button>
        <span data-testid="present-counter">{idx + 1} / {slides.length}</span>
        <button onClick={() => slidesStore.next()} aria-label="Next">›</button>
        <button className="present-exit" data-testid="present-exit" onClick={onExit}>
          Exit (Esc)
        </button>
      </div>
    </div>
  );
}
