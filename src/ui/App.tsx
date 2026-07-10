import { useState } from 'react';
import { SheetsWorkspace } from './sheets/SheetsWorkspace';
import { DocsView } from './docs/DocsView';
import { SlidesView } from './slides/SlidesView';

type Module = 'sheets' | 'docs' | 'slides';

export function App() {
  const [module, setModule] = useState<Module>('sheets');

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">AI_Office</div>
        <nav className="module-nav" data-testid="module-nav">
          <button
            className={module === 'sheets' ? 'active' : ''}
            data-testid="nav-sheets"
            onClick={() => setModule('sheets')}
          >
            Sheets
          </button>
          <button
            className={module === 'docs' ? 'active' : ''}
            data-testid="nav-docs"
            onClick={() => setModule('docs')}
          >
            Docs
          </button>
          <button
            className={module === 'slides' ? 'active' : ''}
            data-testid="nav-slides"
            onClick={() => setModule('slides')}
          >
            Slides
          </button>
        </nav>
      </header>
      {module === 'sheets' && <SheetsWorkspace />}
      {module === 'docs' && <DocsView />}
      {module === 'slides' && <SlidesView />}
    </div>
  );
}
