import { useState } from 'react';
import { SheetsWorkspace } from './sheets/SheetsWorkspace';
import { DocsView } from './docs/DocsView';

type Module = 'sheets' | 'docs';

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
        </nav>
      </header>
      {module === 'sheets' ? <SheetsWorkspace /> : <DocsView />}
    </div>
  );
}
