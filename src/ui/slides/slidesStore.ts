export type SlideLayout = 'title' | 'titleBody' | 'image';

export interface Slide {
  id: string;
  layout: SlideLayout;
  title: string;
  body: string;
  image: string; // URL
  notes: string;
}

export type Theme = 'light' | 'dark' | 'ocean' | 'sand';
export const THEMES: Theme[] = ['light', 'dark', 'ocean', 'sand'];

const DECK_KEY = 'ai-office:deck';

function makeSlide(id: string, layout: SlideLayout = 'titleBody'): Slide {
  return {
    id,
    layout,
    title: 'Slide title',
    body: 'Click to edit the slide body.',
    image: '',
    notes: '',
  };
}

interface DeckState {
  slides: Slide[];
  activeId: string;
  theme: Theme;
}

export class SlidesStore {
  private slidesArr: Slide[];
  private activeId: string;
  private themeVal: Theme = 'light';
  private nextId = 1;

  private version = 0;
  private listeners = new Set<() => void>();

  constructor() {
    const loaded = this.load();
    if (loaded) {
      this.slidesArr = loaded.slides;
      this.activeId = loaded.activeId;
      this.themeVal = loaded.theme;
      this.nextId = this.slidesArr.length + 1;
    } else {
      const first = makeSlide(this.newId(), 'title');
      first.title = 'My Presentation';
      first.body = 'A subtitle goes here';
      this.slidesArr = [first];
      this.activeId = first.id;
    }
  }

  private newId(): string {
    return `slide-${this.nextId++}`;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = (): number => this.version;
  private emit() {
    this.version++;
    for (const l of this.listeners) l();
    this.save();
  }

  slides(): Slide[] {
    return this.slidesArr;
  }
  theme(): Theme {
    return this.themeVal;
  }
  activeIndex(): number {
    return Math.max(0, this.slidesArr.findIndex((s) => s.id === this.activeId));
  }
  active(): Slide {
    return this.slidesArr[this.activeIndex()]!;
  }

  select(id: string) {
    if (this.slidesArr.some((s) => s.id === id)) {
      this.activeId = id;
      this.emit();
    }
  }
  selectIndex(i: number) {
    const s = this.slidesArr[Math.max(0, Math.min(i, this.slidesArr.length - 1))];
    if (s) this.select(s.id);
  }

  addSlide(layout: SlideLayout = 'titleBody') {
    const slide = makeSlide(this.newId(), layout);
    const at = this.activeIndex() + 1;
    this.slidesArr.splice(at, 0, slide);
    this.activeId = slide.id;
    this.emit();
  }

  duplicateSlide(id: string) {
    const idx = this.slidesArr.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const copy: Slide = { ...this.slidesArr[idx]!, id: this.newId() };
    this.slidesArr.splice(idx + 1, 0, copy);
    this.activeId = copy.id;
    this.emit();
  }

  deleteSlide(id: string) {
    if (this.slidesArr.length <= 1) return; // keep at least one
    const idx = this.slidesArr.findIndex((s) => s.id === id);
    if (idx === -1) return;
    this.slidesArr.splice(idx, 1);
    if (this.activeId === id) {
      const next = this.slidesArr[Math.min(idx, this.slidesArr.length - 1)]!;
      this.activeId = next.id;
    }
    this.emit();
  }

  /** Move a slide from one index to another (drag reorder). */
  moveSlide(from: number, to: number) {
    if (from === to || from < 0 || from >= this.slidesArr.length) return;
    const clampedTo = Math.max(0, Math.min(to, this.slidesArr.length - 1));
    const [moved] = this.slidesArr.splice(from, 1);
    this.slidesArr.splice(clampedTo, 0, moved!);
    this.emit();
  }

  updateActive(patch: Partial<Omit<Slide, 'id'>>) {
    const idx = this.activeIndex();
    this.slidesArr[idx] = { ...this.slidesArr[idx]!, ...patch };
    this.emit();
  }

  setTheme(theme: Theme) {
    this.themeVal = theme;
    this.emit();
  }

  next() {
    this.selectIndex(this.activeIndex() + 1);
  }
  prev() {
    this.selectIndex(this.activeIndex() - 1);
  }

  private save() {
    if (typeof localStorage === 'undefined') return;
    try {
      const state: DeckState = {
        slides: this.slidesArr,
        activeId: this.activeId,
        theme: this.themeVal,
      };
      localStorage.setItem(DECK_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
  private load(): DeckState | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(DECK_KEY);
      if (!raw) return null;
      const state = JSON.parse(raw) as DeckState;
      if (Array.isArray(state.slides) && state.slides.length > 0) return state;
    } catch {
      /* ignore */
    }
    return null;
  }
}

export const slidesStore = new SlidesStore();
