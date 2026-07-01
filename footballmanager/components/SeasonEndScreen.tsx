'use client';

import type { GameState, SeasonSummary } from '@/engine/types';
import { formatMoney } from '@/engine/utils';

export default function SeasonEndScreen({
  state,
  summary,
  onContinue,
}: {
  state: GameState;
  summary: SeasonSummary;
  onContinue: () => void;
}) {
  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const banner = summary.champions
    ? { cls: 'fm-banner--gold', text: '🏆 CHAMPIONS!' }
    : summary.promoted
      ? { cls: 'fm-banner--green', text: '⬆ PROMOTED!' }
      : summary.relegated
        ? { cls: 'fm-banner--red', text: '⬇ RELEGATED' }
        : { cls: 'fm-banner--plain', text: 'SEASON COMPLETE' };

  return (
    <div className="fm-screen fm-start">
      <span className={`fm-banner ${banner.cls}`}>{banner.text}</span>
      <h2 style={{ margin: '4px 0 0' }}>
        {club.name} — {summary.year}/{(summary.year + 1) % 100}
      </h2>
      <div className="fm-panel">
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div className="fm-stat" style={{ border: 'none', background: 'transparent' }}>
            <span className="fm-stat__label">Division</span>
            <span className="fm-stat__value">{summary.division}</span>
          </div>
          <div className="fm-stat" style={{ border: 'none', background: 'transparent' }}>
            <span className="fm-stat__label">Finished</span>
            <span className="fm-stat__value fm-stat__value--gold">{summary.position}</span>
          </div>
          <div className="fm-stat" style={{ border: 'none', background: 'transparent' }}>
            <span className="fm-stat__label">Points</span>
            <span className="fm-stat__value">{summary.pts}</span>
          </div>
          <div className="fm-stat" style={{ border: 'none', background: 'transparent' }}>
            <span className="fm-stat__label">Prize</span>
            <span className="fm-stat__value">{formatMoney(summary.prize)}</span>
          </div>
        </div>
      </div>

      {state.history.length > 1 && (
        <div className="fm-panel" style={{ textAlign: 'left' }}>
          <p className="fm-label" style={{ marginTop: 0 }}>
            Career history
          </p>
          <ul className="fm-news">
            {[...state.history].reverse().map((h) => (
              <li key={h.year}>
                {h.year}/{(h.year + 1) % 100}: D{h.division}, {h.position}
                {ordinal(h.position)} — {h.pts} pts
                {h.champions ? ' 🏆' : h.promoted ? ' ⬆' : h.relegated ? ' ⬇' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="fm-hint">
        Players have aged a year — youngsters improved, veterans declined. Prize money added to your budget.
      </p>
      <button className="fm-btn fm-btn--primary fm-btn--large" onClick={onContinue}>
        Start the {state.seasonYear}/{(state.seasonYear + 1) % 100} season
      </button>
    </div>
  );
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}
