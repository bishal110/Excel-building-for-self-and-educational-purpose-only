import { store } from '../ui/state/store';
import { slidesStore, type DeckState } from '../ui/slides/slidesStore';
import { ProjectState } from './project';

const DOC_KEY = 'ai-office:doc';

/** The whole-suite `.aioffice` file: workbook + document + slide deck. */
export interface SuiteFile {
  version: 1;
  app: 'AI_Office';
  kind: 'suite';
  sheets: ProjectState;
  doc: string; // document HTML
  deck: DeckState;
}

function readDocHtml(): string {
  if (typeof localStorage === 'undefined') return '';
  try {
    return localStorage.getItem(DOC_KEY) ?? '';
  } catch {
    return '';
  }
}

export function exportSuite(): SuiteFile {
  return {
    version: 1,
    app: 'AI_Office',
    kind: 'suite',
    sheets: store.toProject(),
    doc: readDocHtml(),
    deck: slidesStore.exportDeck(),
  };
}

/** Load a whole-suite file into all three modules. Returns false if invalid. */
export function importSuite(data: unknown): boolean {
  const file = data as Partial<SuiteFile> | undefined;
  if (!file || file.app !== 'AI_Office') return false;

  if (file.sheets) store.loadProject(file.sheets);
  if (file.deck) slidesStore.loadDeck(file.deck);
  if (typeof file.doc === 'string' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(DOC_KEY, file.doc);
    } catch {
      /* ignore */
    }
    // Notify a mounted Docs editor to reload its content.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aioffice:doc-loaded', { detail: file.doc }));
    }
  }
  return true;
}

/** Reset every module to a blank state. */
export function newSuite(): void {
  store.newProject();
  slidesStore.loadDeck({
    slides: [
      {
        id: 'slide-1',
        layout: 'title',
        title: 'My Presentation',
        body: 'A subtitle goes here',
        image: '',
        notes: '',
      },
    ],
    activeId: 'slide-1',
    theme: 'light',
  });
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(DOC_KEY);
    } catch {
      /* ignore */
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aioffice:doc-loaded', { detail: '' }));
  }
}
