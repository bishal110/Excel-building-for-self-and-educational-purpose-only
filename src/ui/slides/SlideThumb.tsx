import { sanitizeImageUrl } from '../security';
import type { Slide, Theme } from './slidesStore';

/** A miniature render of a slide, reused by the list and present mode. */
export function SlideContent({ slide }: { slide: Slide }) {
  const safeImage = slide.image ? sanitizeImageUrl(slide.image) : null;
  return (
    <div className={`slide-inner layout-${slide.layout}`}>
      {slide.layout === 'image' ? (
        <>
          <h2 className="slide-title">{slide.title}</h2>
          {safeImage ? (
            <img className="slide-image" src={safeImage} alt={slide.title} />
          ) : (
            <div className="slide-image placeholder">Image (set a valid http(s) URL)</div>
          )}
        </>
      ) : slide.layout === 'title' ? (
        <div className="slide-center">
          <h1 className="slide-title">{slide.title}</h1>
          <p className="slide-subtitle">{slide.body}</p>
        </div>
      ) : (
        <>
          <h2 className="slide-title">{slide.title}</h2>
          <div className="slide-body">
            {slide.body.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function themeClass(theme: Theme): string {
  return `theme-${theme}`;
}
