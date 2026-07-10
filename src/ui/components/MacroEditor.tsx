import { useState } from 'react';
import { store } from '../state/store';

const SAMPLES: Record<string, string> = {
  'Double column A → B': `// Double each value in A1:A10 into column B
const vals = sheet.range("A1:A10");
sheet.setRange("B1", vals.map(row => [Number(row[0]) * 2 || 0]));
sheet.log("Done");`,
  'Fill a series': `for (let i = 1; i <= 12; i++) {
  sheet.set("A" + i, i * i);
}
sheet.log("Filled A1:A12");`,
  'Sum via macro': `let total = 0;
for (const row of sheet.range("A1:A20")) {
  total += Number(row[0]) || 0;
}
sheet.set("C1", total);
sheet.log("Total = " + total);`,
};

export function MacroEditor({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState(SAMPLES['Double column A → B']!);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();

  const run = () => {
    const res = store.runMacroCode(code);
    setOutput(res.logs);
    setError(res.error);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Macros (JavaScript, Office-Scripts style)</h2>
          <button onClick={onClose}>×</button>
        </header>
        <div className="macro-samples">
          Samples:
          {Object.keys(SAMPLES).map((name) => (
            <button key={name} onClick={() => setCode(SAMPLES[name]!)}>
              {name}
            </button>
          ))}
        </div>
        <textarea
          className="macro-code"
          data-testid="macro-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
        />
        <div className="macro-actions">
          <button className="primary" onClick={run} data-testid="macro-run">
            Run macro
          </button>
        </div>
        {error && <pre className="macro-error">Error: {error}</pre>}
        {output.length > 0 && (
          <pre className="macro-output">{output.join('\n')}</pre>
        )}
        <p className="macro-note">
          Macros are JavaScript with a documented <code>sheet</code> API — not
          VBA. See docs/MACRO_API.md.
        </p>
      </div>
    </div>
  );
}
