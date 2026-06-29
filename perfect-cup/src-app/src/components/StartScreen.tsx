import { TOTAL_MATCHES, TOTAL_PICKS, TOTAL_REROLLS } from '../engine/types';

interface StartScreenProps {
  squadCount: number;
  hasHistory: boolean;
  onStart: () => void;
  onViewHistory: () => void;
}

export function StartScreen({ squadCount, hasHistory, onStart, onViewHistory }: StartScreenProps) {
  return (
    <div className="pc-screen pc-start">
      <div className="pc-start__badge">BALLKNW · PERFECT CUP</div>
      <h1 className="pc-start__title">8-0-0</h1>
      <p className="pc-start__tagline">
        Draft an XI from {squadCount} historical World Cup squads. Win all {TOTAL_MATCHES}{' '}
        knockout matches with zero draws and zero losses for a perfect run.
      </p>

      <ul className="pc-start__rules">
        <li>
          <strong>Spin</strong> for a random squad, then pick one player from it for your XI.
        </li>
        <li>
          Fill all {TOTAL_PICKS} spots (1 GK · 4 DEF · 4 MID · 2 FWD) using a 4-4-2 formation.
        </li>
        <li>
          Don&apos;t like a squad? <strong>Reroll</strong> for a new one — {TOTAL_REROLLS} rerolls
          per run.
        </li>
        <li>
          Then simulate {TOTAL_MATCHES} knockout matches. Go {TOTAL_MATCHES}-0-0 for a perfect run.
        </li>
      </ul>

      <button type="button" className="pc-btn pc-btn--primary pc-btn--large" onClick={onStart}>
        Start Draft
      </button>

      {hasHistory && (
        <button type="button" className="pc-btn pc-btn--ghost" onClick={onViewHistory}>
          View Past Runs
        </button>
      )}

      <p className="pc-start__hint">Press <kbd>?</kbd> anytime during the draft to spin or reroll.</p>
    </div>
  );
}
