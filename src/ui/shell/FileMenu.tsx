import { useEffect, useRef, useState } from 'react';
import { exportSuite, importSuite, newSuite } from '../../io/suiteProject';
import { downloadBlob, pickFile } from '../fileUtils';

/** App-shell File menu: whole-suite New / Open / Save (.aioffice project). */
export function FileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const close = () => setOpen(false);

  const newProject = () => {
    if (confirm('Start a new project? Unsaved changes in all modules will be cleared.')) {
      newSuite();
    }
    close();
  };
  const save = () => {
    downloadBlob(
      JSON.stringify(exportSuite(), null, 2),
      'project.aioffice',
      'application/json',
    );
    close();
  };
  const openProject = async () => {
    close();
    const file = await pickFile('.aioffice,application/json');
    if (!file) return;
    try {
      const ok = importSuite(JSON.parse(await file.text()));
      if (!ok) alert('Not a valid AI_Office project file.');
    } catch {
      alert('Could not open file — not a valid .aioffice project.');
    }
  };

  return (
    <div className="file-menu" ref={ref}>
      <button className="file-btn" data-testid="file-menu" onClick={() => setOpen((v) => !v)}>
        File ▾
      </button>
      {open && (
        <div className="file-dropdown" role="menu">
          <button role="menuitem" data-testid="file-new" onClick={newProject}>New project</button>
          <button role="menuitem" data-testid="file-open" onClick={openProject}>Open project…</button>
          <button role="menuitem" data-testid="file-save" onClick={save}>Save project (.aioffice)</button>
        </div>
      )}
    </div>
  );
}
