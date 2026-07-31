'use client';

import type { GameState } from '@/engine/types';
import { leagueFixtures, userLeagueId } from '@/engine/seasonProgression';
import { Crest } from './Crest';

export default function FixturesScreen({ state }: { state: GameState }) {
  const fixtures = leagueFixtures(state, userLeagueId(state)).filter(
    (f) => f.homeId === state.userClubId || f.awayId === state.userClubId
  );
  const club = (id: number) => state.clubs.find((c) => c.id === id);
  const clubName = (id: number) => club(id)?.name ?? '—';

  return (
    <ul className="fm-fixture-list">
      {fixtures.map((f) => {
        const isHome = f.homeId === state.userClubId;
        const gf = isHome ? f.homeGoals : f.awayGoals;
        const ga = isHome ? f.awayGoals : f.homeGoals;
        const outcome = !f.played ? '' : gf > ga ? 'win' : gf < ga ? 'loss' : 'draw';
        const isNext = !f.played && f.round === state.week;
        const home = club(f.homeId);
        const away = club(f.awayId);
        return (
          <li key={f.round} className={`fm-fixture ${outcome}${isNext ? ' next' : ''}`}>
            <span className="fm-fixture__round">W{f.round}</span>
            <span className="fm-fixture__home">
              <span className="fm-fixture__team-name">{clubName(f.homeId)}</span>
              {home && <Crest name={home.name} code={home.code} color={home.color} size={16} />}
            </span>
            <span className="fm-fixture__score">{f.played ? `${f.homeGoals} – ${f.awayGoals}` : isNext ? 'NEXT' : '—'}</span>
            <span className="fm-fixture__away">
              {away && <Crest name={away.name} code={away.code} color={away.color} size={16} />}
              <span className="fm-fixture__team-name">{clubName(f.awayId)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
