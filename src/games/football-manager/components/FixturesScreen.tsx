'use client';

import type { GameState } from '@/engine/types';
import { leagueFixtures, nextUserFixture, userLeagueId } from '@/engine/seasonProgression';
import { Crest } from './Crest';

export default function FixturesScreen({ state }: { state: GameState }) {
  const club = (id: number) => state.clubs.find((c) => c.id === id);
  const clubName = (id: number) => club(id)?.name ?? '—';

  const next = nextUserFixture(state);
  const nextHome = next ? club(next.homeId) : null;
  const nextAway = next ? club(next.awayId) : null;

  // Played results (most recent first) involving the user's club.
  const results = leagueFixtures(state, userLeagueId(state))
    .filter((f) => f.played && (f.homeId === state.userClubId || f.awayId === state.userClubId))
    .sort((a, b) => b.round - a.round);

  return (
    <div className="fm-matchday">
      {/* Next-match banner */}
      {next && (
        <div className="fm-next-banner">
          <div className="fm-next-banner__label">Next match · Week {next.round}</div>
          <div className="fm-next-banner__teams">
            <div className="fm-next-banner__team">
              {nextHome && (
                <Crest name={nextHome.name} code={nextHome.code} color={nextHome.color} size={46} />
              )}
              <span className="fm-next-banner__name">{clubName(next.homeId)}</span>
            </div>
            <div className="fm-next-banner__vs">VS</div>
            <div className="fm-next-banner__team">
              {nextAway && (
                <Crest name={nextAway.name} code={nextAway.code} color={nextAway.color} size={46} />
              )}
              <span className="fm-next-banner__name">{clubName(next.awayId)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Results list */}
      <div className="fm-results-card">
        {results.length === 0 && <p className="fm-hint">No results yet this season.</p>}
        {results.map((f) => {
          const isHome = f.homeId === state.userClubId;
          const gf = isHome ? f.homeGoals : f.awayGoals;
          const ga = isHome ? f.awayGoals : f.homeGoals;
          const outcome = gf > ga ? 'win' : gf < ga ? 'loss' : 'draw';
          return (
            <div key={f.round} className="fm-result-row">
              <div className="fm-result-row__comp">W{f.round}</div>
              <div className="fm-result-row__home">{clubName(f.homeId)}</div>
              <div className={`fm-result-row__score fm-result-row__score--${outcome}`}>
                {f.homeGoals} – {f.awayGoals}
              </div>
              <div className="fm-result-row__away">{clubName(f.awayId)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
