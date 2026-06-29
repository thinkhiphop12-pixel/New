import type { Run } from '../engine/types';
import type { PersistMode } from '../hooks/useRunHistory';

interface HistoryScreenProps {
  runs: Run[];
  mode: PersistMode;
  onSelect: (run: Run) => void;
  onClear: () => void;
  onBack: () => void;
}

export function HistoryScreen({ runs, mode, onSelect, onClear, onBack }: HistoryScreenProps) {
  return (
    <div className="pc-screen pc-history">
      <h2 className="pc-history__title">Past Runs</h2>
      <p className="pc-history__source">
        {mode === 'supabase'
          ? 'Synced from Supabase'
          : 'Stored on this device (Supabase unavailable)'}
      </p>

      {runs.length === 0 ? (
        <p className="pc-history__empty">No runs yet — go play a Cup.</p>
      ) : (
        <ul className="pc-history__list">
          {runs.map((run) => (
            <li key={run.id}>
              <button
                type="button"
                className={`pc-history__item${run.success ? ' pc-history__item--perfect' : ''}`}
                onClick={() => {
                  onSelect(run);
                }}
              >
                <span className="pc-history__record">{run.finalRecord}</span>
                <span className="pc-history__date">
                  {new Date(run.date).toLocaleDateString()}
                </span>
                <span className="pc-history__goals">
                  {run.goalsFor}-{run.goalsAgainst}
                </span>
                <span className="pc-history__strength">OVR {run.teamStrength}</span>
                {run.isPerfect ? (
                  <span className="pc-history__badge">8-0</span>
                ) : run.isChampion ? (
                  <span className="pc-history__badge">🏆</span>
                ) : (
                  <span className="pc-history__badge pc-history__badge--muted">—</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="pc-history__actions">
        <button type="button" className="pc-btn pc-btn--ghost" onClick={onBack}>
          Back
        </button>
        {runs.length > 0 && (
          <button type="button" className="pc-btn pc-btn--ghost" onClick={onClear}>
            Clear History
          </button>
        )}
      </div>
    </div>
  );
}
