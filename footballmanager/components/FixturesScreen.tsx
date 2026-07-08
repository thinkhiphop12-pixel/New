'use client';

import type { GameState } from '@/engine/types';
import { divisionFixtures, userDivision } from '@/engine/seasonProgression';

export default function FixturesScreen({ state }: { state: GameState }) {
  const div = userDivision(state);
  const fixtures = divisionFixtures(state, div).filter(
    (f) => f.homeId === state.userClubId || f.awayId === state.userClubId
  );
  const clubName = (id: number) => state.clubs.find((c) => c.id === id)?.name ?? '—';

  return (
    <ul className="fm-fixture-list">
      {fixtures.map((f) => {
        const isHome = f.homeId === state.userClubId;
        const gf = isHome ? f.homeGoals : f.awayGoals;
        const ga = isHome ? f.awayGoals : f.homeGoals;
        const outcome = !f.played ? '' : gf > ga ? 'win' : gf < ga ? 'loss' : 'draw';
        const isNext = !f.played && f.round === state.week;
        return (
          <li key={f.round} className={`fm-fixture ${outcome}${isNext ? ' next' : ''}`}>
            <span className="fm-fixture__round">W{f.round}</span>
            <span className="fm-fixture__home">{clubName(f.homeId)}</span>
            <span className="fm-fixture__score">{f.played ? `${f.homeGoals} – ${f.awayGoals}` : isNext ? 'NEXT' : '—'}</span>
            <span className="fm-fixture__away">{clubName(f.awayId)}</span>
          </li>
        );
      })}
    </ul>
  );
}
