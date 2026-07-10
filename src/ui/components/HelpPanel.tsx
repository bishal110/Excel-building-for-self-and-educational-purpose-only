import { bindingsByCategory } from '../keybindings';

export function HelpPanel({ onClose }: { onClose: () => void }) {
  const groups = bindingsByCategory();
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Keyboard shortcuts</h2>
          <button onClick={onClose}>×</button>
        </header>
        <p className="help-note">
          Every shortcut below is actually implemented. This list is generated
          from the app's keybinding table.
        </p>
        <div className="help-grid" data-testid="help-grid">
          {Object.entries(groups).map(([category, binds]) => (
            <div key={category} className="help-group">
              <h3>{category}</h3>
              <table>
                <tbody>
                  {binds.map((b) => (
                    <tr key={b.id}>
                      <td className="help-combo">{b.combo}</td>
                      <td>{b.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
