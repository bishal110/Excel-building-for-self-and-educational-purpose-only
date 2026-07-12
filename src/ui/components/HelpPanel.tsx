import { bindingsByCategory } from '../keybindings';
import { DialogFrame } from './DialogFrame';

export function HelpPanel({ onClose }: { onClose: () => void }) {
  const groups = bindingsByCategory();
  return (
    <DialogFrame title="Keyboard shortcuts" onClose={onClose}>
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
    </DialogFrame>
  );
}
