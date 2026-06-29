import { useState } from 'react';
import type { Run } from '../engine/types';

interface ResultScreenProps {
  run: Run;
  fromHistory?: boolean;
  onPlayAgain: () => void;
  onViewHistory: () => void;
  onBack?: () => void;
}

function buildShareText(run: Run): string {
  const header = run.isPerfect
    ? `I just went ${run.finalScoreline} in Perfect Cup 8-0-0!`
    : `Perfect Cup 8-0-0 run: ${run.finalScoreline} (${run.goalsFor}-${run.goalsAgainst})`;
  return `${header}\nTeam strength: ${run.teamStrength}\nballknw.com/perfect-cup`;
}

export function ResultScreen({ run, fromHistory, onPlayAgain, onViewHistory, onBack }: ResultScreenProps) {
  const [shared, setShared] = useState(false);

  async function handleShare() {
    const text = buildShareText(run);
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        window.setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  }

  return (
    <div className="pc-screen pc-result">
      {run.isPerfect && (
        <div className="pc-result__perfect-banner">PERFECT RUN &mdash; {run.finalScoreline}</div>
      )}

      <h2 className="pc-result__title">{run.isPerfect ? 'Perfect Cup Champions' : 'Run Complete'}</h2>

      <div className="pc-result__stats">
        <div className="pc-stat">
          <span className="pc-stat__label">Record</span>
          <span className="pc-stat__value">{run.finalScoreline}</span>
        </div>
        <div className="pc-stat">
          <span className="pc-stat__label">Goals</span>
          <span className="pc-stat__value">
            {run.goalsFor}-{run.goalsAgainst}
          </span>
        </div>
        <div className="pc-stat">
          <span className="pc-stat__label">Team Strength</span>
          <span className="pc-stat__value">{run.teamStrength}</span>
        </div>
      </div>

      <ol className="pc-match-log">
        {run.matches.map((m) => (
          <li key={m.round} className={`pc-match-log__row pc-outcome-${m.outcome}`}>
            <span className="pc-match-log__round">R{m.round}</span>
            <span className="pc-match-log__opponent">{m.opponent}</span>
            <span className="pc-match-log__score">
              {m.ourGoals}-{m.opponentGoals}
            </span>
            <span className="pc-match-log__outcome">{m.outcome.toUpperCase()}</span>
          </li>
        ))}
      </ol>

      <div className="pc-result__actions">
        <button type="button" className="pc-btn pc-btn--secondary" onClick={handleShare}>
          {shared ? 'Copied!' : 'Share Run'}
        </button>
        {fromHistory ? (
          <button type="button" className="pc-btn pc-btn--ghost" onClick={onBack}>
            Back to History
          </button>
        ) : (
          <>
            <button type="button" className="pc-btn pc-btn--primary" onClick={onPlayAgain}>
              Play Again
            </button>
            <button type="button" className="pc-btn pc-btn--ghost" onClick={onViewHistory}>
              View History
            </button>
          </>
        )}
      </div>
    </div>
  );
}
