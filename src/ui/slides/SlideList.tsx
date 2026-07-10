import { useState } from 'react';
import { slidesStore } from './slidesStore';
import { SlideContent, themeClass } from './SlideThumb';

export function SlideList() {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const slides = slidesStore.slides();
  const activeIdx = slidesStore.activeIndex();
  const theme = slidesStore.theme();

  return (
    <div className="slide-list" data-testid="slide-list">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={'slide-thumb-row' + (i === activeIdx ? ' active' : '')}
          draggable
          data-testid={`thumb-${i}`}
          onClick={() => slidesStore.select(slide.id)}
          onDragStart={() => setDragFrom(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragFrom !== null) slidesStore.moveSlide(dragFrom, i);
            setDragFrom(null);
          }}
        >
          <span className="thumb-num">{i + 1}</span>
          <div className={`slide-thumb ${themeClass(theme)}`}>
            <SlideContent slide={slide} />
          </div>
        </div>
      ))}
    </div>
  );
}
