'use client';

import type { GameState } from '@/engine/types';
import { clubPosition, userDivision } from '@/engine/seasonProgression';
import styles from './ObjectiveCard.module.css';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

/** Board objective, current league position and progress toward the target position. */
export default function ObjectiveCard({ state }: { state: GameState }) {
  const division = userDivision(state);
  const clubCount = state.clubs.filter((c) => c.division === division).length;
  const position = clubPosition(state, state.userClubId);
  const target = state.board.minPosition;
  const onTarget = position > 0 && position <= target;
  const off = Math.max(0, position - target);

  // Progress from worst possible position (clubCount) toward the target (1
  // is best). Clamp so an already-on-target position reads as full.
  const worst = Math.max(clubCount, target, 1);
  const pct =
    worst === target
      ? 100
      : Math.max(0, Math.min(100, ((worst - position) / (worst - target)) * 100));

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.objective}>{state.board.objective}</span>
        <span className={onTarget ? styles.onTarget : styles.offTarget}>
          {onTarget ? 'On target' : `${off} place${off === 1 ? '' : 's'} off target`}
        </span>
      </div>
      <div className={styles.mid}>
        <span className={styles.position}>
          {position > 0 ? position : '-'}
          <sup>{position > 0 ? ordinal(position) : ''}</sup>
        </span>
        <span className={styles.targetLabel}>
          Target: {target}
          {ordinal(target)}
        </span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Progress toward board target"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={onTarget ? styles.fillGood : styles.fillBad} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
