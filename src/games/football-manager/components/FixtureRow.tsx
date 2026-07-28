'use client';

import type { GameState, Fixture } from '@/engine/types';
import { clubPosition, lastResults } from '@/engine/seasonProgression';
import { Crest } from './Crest';
import styles from './FixtureRow.module.css';

const FORM_CLASS: Record<'W' | 'D' | 'L', string> = {
  W: 'formWin',
  D: 'formDraw',
  L: 'formLoss',
};

/** One fixture line: H/A indicator, crest, name, opponent position and form. */
export default function FixtureRow({
  state,
  fixture,
  variant = 'list',
}: {
  state: GameState;
  fixture: Fixture;
  variant?: 'hub' | 'list';
}) {
  const homeClub = state.clubs.find((c) => c.id === fixture.homeId);
  const awayClub = state.clubs.find((c) => c.id === fixture.awayId);
  if (!homeClub || !awayClub) return null;

  const userIsHome = fixture.homeId === state.userClubId;
  const isUserFixture = fixture.homeId === state.userClubId || fixture.awayId === state.userClubId;

  // hub: user's club always leads, regardless of home/away.
  // list: home team always leads, as scheduled.
  const leadClub = variant === 'hub' && isUserFixture ? (userIsHome ? homeClub : awayClub) : homeClub;
  const otherClub = leadClub === homeClub ? awayClub : homeClub;
  const leadIsHome = leadClub === homeClub;

  const opponentPosition = clubPosition(state, otherClub.id);
  const form = lastResults(state, leadClub.id, 3);

  return (
    <div className={styles.row}>
      <span className={styles.venue} aria-label={leadIsHome ? 'Home' : 'Away'}>
        {leadIsHome ? 'H' : 'A'}
      </span>
      <Crest name={leadClub.name} code={leadClub.code} color={leadClub.color} size={26} />
      <span className={styles.name}>{leadClub.name}</span>
      {variant === 'hub' && isUserFixture && leadClub.id === state.userClubId && (
        <span className={styles.youTag}>You</span>
      )}
      <span className={styles.posChip} title={`${otherClub.name} position`}>
        {opponentPosition > 0 ? opponentPosition : '-'}
      </span>
      <span className={styles.form}>
        {form.map((r, i) => (
          <span key={i} className={`${styles.formGlyph} ${styles[FORM_CLASS[r]]}`}>
            {r}
          </span>
        ))}
      </span>
    </div>
  );
}
