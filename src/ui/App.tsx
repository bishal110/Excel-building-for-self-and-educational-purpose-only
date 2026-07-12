import { useState } from 'react';
import { SheetsWorkspace } from './sheets/SheetsWorkspace';
import { DocsView } from './docs/DocsView';
import { SlidesView } from './slides/SlidesView';
import { FileMenu } from './shell/FileMenu';
import { Icon } from './components/Icon';

type Module = 'sheets' | 'docs' | 'slides';

export function App() {
  const [module, setModule] = useState<Module>('sheets');

  return (
    <div className={`app module-${module}`} data-module={module}>
      <header className="app-header">
        <div className="brand-lockup" aria-label="AI Office">
          <span className="brand-mark"><Icon name="app" size={18} /></span>
          <span className="brand">AI Office</span>
        </div>
        <FileMenu module={module} onSwitchModule={setModule} />
        <nav className="module-nav" data-testid="module-nav" aria-label="Workspace modules">
          <button
            className={module === 'sheets' ? 'active' : ''}
            data-testid="nav-sheets"
            aria-pressed={module === 'sheets'}
            aria-label="Sheets"
            onClick={() => setModule('sheets')}
          >
            <Icon name="sheets" />
            <span className="module-label">Sheets</span>
          </button>
          <button
            className={module === 'docs' ? 'active' : ''}
            data-testid="nav-docs"
            aria-pressed={module === 'docs'}
            aria-label="Docs"
            onClick={() => setModule('docs')}
          >
            <Icon name="docs" />
            <span className="module-label">Docs</span>
          </button>
          <button
            className={module === 'slides' ? 'active' : ''}
            data-testid="nav-slides"
            aria-pressed={module === 'slides'}
            aria-label="Slides"
            onClick={() => setModule('slides')}
          >
            <Icon name="slides" />
            <span className="module-label">Slides</span>
          </button>
        </nav>
        <span className="header-spacer" />
        <div className="workspace-meta">
          <span className="workspace-name">Personal workspace</span>
          <span className="save-state" title="Your work is stored on this device">
            <Icon name="check" size={13} /> Saved locally
          </span>
        </div>
      </header>
      {module === 'sheets' && <SheetsWorkspace />}
      {module === 'docs' && <DocsView />}
      {module === 'slides' && <SlidesView />}
    </div>
  );
}
