import type { Objective, Pool, RevealMode } from '../engine/types';

interface StartScreenProps {
  pool: Pool;
  objective: Objective;
  revealMode: RevealMode;
  historyCount: number;
  legendsCount: number;
  englandCount: number;
  hasHistory: boolean;
  onSetPool: (pool: Pool) => void;
  onSetObjective: (objective: Objective) => void;
  onSetRevealMode: (mode: RevealMode) => void;
  onStart: () => void;
  onViewHistory: () => void;
}

export function StartScreen({
  pool,
  objective,
  revealMode,
  historyCount,
  legendsCount,
  englandCount,
  hasHistory,
  onSetPool,
  onSetObjective,
  onSetRevealMode,
  onStart,
  onViewHistory,
}: StartScreenProps) {
  return (
    <div className="pc-screen pc-start">
      <h1 className="pc-start__title">
        PERFECT <span className="pc-start__title-accent">CUP</span>
      </h1>
      <p className="pc-start__tagline">Draft five World Cup legends. Simulate a run. Try to win it all.</p>

      <ol className="pc-howto">
        <li className="pc-howto__step">
          <span className="pc-howto__num">1</span>
          <div>
            <h3>Spin &amp; draft five</h3>
            <p>Each spin offers one World Cup squad. Pick one player for an open slot: 1 GK, 1 DEF, 2 MID, 1 FWD.</p>
          </div>
        </li>
        <li className="pc-howto__step">
          <span className="pc-howto__num">2</span>
          <div>
            <h3>Two rerolls</h3>
            <p>Don&apos;t like a squad? Swap the edition (same country) or the squad (same year). One of each per game.</p>
          </div>
        </li>
        <li className="pc-howto__step">
          <span className="pc-howto__num">3</span>
          <div>
            <h3>Win the World Cup</h3>
            <p>Your five are simulated through the group stage and knockouts. A perfect run wins every match.</p>
          </div>
        </li>
      </ol>

      <section className="pc-config">
        <h2 className="pc-config__label">Choose your pool</h2>
        <div className="pc-option-grid">
          <button
            type="button"
            className={`pc-option${pool === 'legends' ? ' pc-option--active' : ''}`}
            onClick={() => {
              onSetPool('legends');
            }}
          >
            <span className="pc-option__title">Classic Legends</span>
            <span className="pc-option__desc">{legendsCount} hand-picked iconic squads</span>
          </button>
          <button
            type="button"
            className={`pc-option${pool === 'history' ? ' pc-option--active' : ''}`}
            onClick={() => {
              onSetPool('history');
            }}
          >
            <span className="pc-option__title">Full History</span>
            <span className="pc-option__desc">Every men&apos;s World Cup squad, {historyCount} teams</span>
          </button>
          <button
            type="button"
            className={`pc-option${pool === 'england' ? ' pc-option--active' : ''}`}
            onClick={() => {
              onSetPool('england');
            }}
          >
            <span className="pc-option__title">🏴󠁧󠁢󠁥󠁮󠁧󠁿 England</span>
            <span className="pc-option__desc">All-time England XI, {englandCount} editions</span>
          </button>
        </div>
      </section>

      <section className="pc-config">
        <h2 className="pc-config__label">Objective</h2>
        <div className="pc-option-grid pc-option-grid--two">
          <button
            type="button"
            className={`pc-option${objective === 'perfect' ? ' pc-option--active' : ''}`}
            onClick={() => {
              onSetObjective('perfect');
            }}
          >
            <span className="pc-option__title">🔥 Go 8-0</span>
            <span className="pc-option__desc">Win every match, group stage included.</span>
          </button>
          <button
            type="button"
            className={`pc-option${objective === 'trophy' ? ' pc-option--active' : ''}`}
            onClick={() => {
              onSetObjective('trophy');
            }}
          >
            <span className="pc-option__title">🏆 Win the Cup</span>
            <span className="pc-option__desc">Lift the trophy. A group slip-up is survivable.</span>
          </button>
        </div>
      </section>

      <div className="pc-reveal">
        <span className="pc-reveal__label">Reveal mode</span>
        <div className="pc-toggle">
          <button
            type="button"
            className={`pc-toggle__btn${revealMode === 'watch' ? ' pc-toggle__btn--active' : ''}`}
            onClick={() => {
              onSetRevealMode('watch');
            }}
          >
            Watch
          </button>
          <button
            type="button"
            className={`pc-toggle__btn${revealMode === 'instant' ? ' pc-toggle__btn--active' : ''}`}
            onClick={() => {
              onSetRevealMode('instant');
            }}
          >
            Instant
          </button>
        </div>
      </div>

      <button type="button" className="pc-btn pc-btn--primary pc-btn--large" onClick={onStart}>
        Start drafting
      </button>

      {hasHistory && (
        <button type="button" className="pc-btn pc-btn--ghost" onClick={onViewHistory}>
          View past runs
        </button>
      )}
    </div>
  );
}
