import type { Run } from '../engine/types';

interface HistoryScreenProps {
  runs: Run[];
  onSelect: (run: Run) => void;
  onClear: () => void;
  onBack: () => void;
}

export function HistoryScreen({ runs, onSelect, onClear, onBack }: HistoryScreenProps) {
  return (
    <div className="pc-screen pc-history">
      <h2 className="pc-history__title">Past Runs</h2>

      {runs.length === 0 ? (
        <p className="pc-history__empty">No runs yet — go play a Cup.</p>
      ) : (
        <ul className="pc-history__list">
          {runs.map((run) => (
            <li key={run.id}>
              <button
                type="button"
                className={`pc-history__item${run.isPerfect ? ' pc-history__item--perfect' : ''}`}
                onClick={() => onSelect(run)}
              >
                <span className="pc-history__record">{run.finalScoreline}</span>
                <span className="pc-history__date">
                  {new Date(run.date).toLocaleDateString()}
                </span>
                <span className="pc-history__goals">
                  {run.goalsFor}-{run.goalsAgainst}
                </span>
                <span className="pc-history__strength">OVR {run.teamStrength}</span>
                {run.isPerfect && <span className="pc-history__badge">PERFECT</span>}
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
