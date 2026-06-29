import { useEffect, useState } from 'react';
import type { Run } from '../engine/types';

interface ResultScreenProps {
  run: Run;
  fromHistory?: boolean;
  revealMode?: 'watch' | 'instant';
  onPlayAgain: () => void;
  onViewHistory: () => void;
  onBack?: () => void;
}

function headline(run: Run): string {
  if (run.objective === 'perfect') {
    return run.isPerfect ? `Perfect run — ${run.finalRecord}` : 'Run ended';
  }
  return run.isChampion ? 'World Champions' : 'Knocked out';
}

function buildShareText(run: Run): string {
  const head =
    run.objective === 'perfect'
      ? run.isPerfect
        ? `I went 8-0 in Perfect Cup!`
        : `Perfect Cup run: ${run.finalRecord}`
      : run.isChampion
        ? `I won the Perfect Cup! (${run.finalRecord})`
        : `Perfect Cup run: ${run.finalRecord}`;
  return `${head}\nTeam strength: ${run.teamStrength}\ndraftfantasy.com/perfect/8-0`;
}

export function ResultScreen({
  run,
  fromHistory,
  revealMode = 'instant',
  onPlayAgain,
  onViewHistory,
  onBack,
}: ResultScreenProps) {
  const [shared, setShared] = useState(false);
  const animate = revealMode === 'watch' && !fromHistory;
  const [revealed, setRevealed] = useState(animate ? 0 : run.matches.length);

  useEffect(() => {
    if (!animate) {
      setRevealed(run.matches.length);
      return;
    }
    setRevealed(0);
    let n = 0;
    const timer = window.setInterval(() => {
      n += 1;
      setRevealed(n);
      if (n >= run.matches.length) window.clearInterval(timer);
    }, 550);
    return () => window.clearInterval(timer);
  }, [animate, run]);

  const allRevealed = revealed >= run.matches.length;
  const success = run.success;

  async function handleShare() {
    const text = buildShareText(run);
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        window.setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="pc-screen pc-result">
      {allRevealed && success && (
        <div className="pc-result__perfect-banner">
          {run.objective === 'perfect' ? `PERFECT — ${run.finalRecord}` : '🏆 CHAMPIONS'}
        </div>
      )}

      <h2 className="pc-result__title">{allRevealed ? headline(run) : 'Simulating the run…'}</h2>

      <div className="pc-result__lineup">
        {run.picks.map((p) => (
          <span key={p.player.id} className="pc-result__pill">
            <span className="pc-result__pill-pos">{p.player.position}</span>
            {p.player.name} <span className="pc-result__pill-rating">{p.player.rating}</span>
          </span>
        ))}
      </div>

      <ol className="pc-match-log">
        {run.matches.slice(0, revealed).map((m) => (
          <li key={m.round} className={`pc-match-log__row pc-outcome-${m.outcome}`}>
            <span className="pc-match-log__round">{m.roundName}</span>
            <span className="pc-match-log__opponent">{m.opponent}</span>
            <span className="pc-match-log__score">
              {m.ourGoals}-{m.opponentGoals}
            </span>
            <span className="pc-match-log__outcome">{m.outcome.toUpperCase()}</span>
          </li>
        ))}
      </ol>

      {allRevealed && (
        <>
          <div className="pc-result__stats">
            <div className="pc-stat">
              <span className="pc-stat__label">Record</span>
              <span className="pc-stat__value">{run.finalRecord}</span>
            </div>
            <div className="pc-stat">
              <span className="pc-stat__label">Goals</span>
              <span className="pc-stat__value">
                {run.goalsFor}-{run.goalsAgainst}
              </span>
            </div>
            <div className="pc-stat">
              <span className="pc-stat__label">Strength</span>
              <span className="pc-stat__value">{run.teamStrength}</span>
            </div>
          </div>

          <div className="pc-result__actions">
            <button type="button" className="pc-btn pc-btn--secondary" onClick={handleShare}>
              {shared ? 'Copied!' : 'Share run'}
            </button>
            {fromHistory ? (
              <button type="button" className="pc-btn pc-btn--ghost" onClick={onBack}>
                Back to history
              </button>
            ) : (
              <>
                <button type="button" className="pc-btn pc-btn--primary" onClick={onPlayAgain}>
                  Play again
                </button>
                <button type="button" className="pc-btn pc-btn--ghost" onClick={onViewHistory}>
                  View history
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
