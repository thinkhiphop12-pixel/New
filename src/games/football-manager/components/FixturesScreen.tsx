'use client';

import type { GameState } from '@/engine/types';
import { leagueFixtures, userLeagueId } from '@/engine/seasonProgression';
import { Crest } from './Crest';

/**
 * Fixtures tab: next-match banner up top, results list below (mock:
 * "Gaffa - Hub & Matchday.dc.html#fixtures" — tab row, next-match banner,
 * result list). The banner here is informational only — venue and
 * opposition, nothing actionable — since the actionable version (press
 * conference, lineup warning) already lives on Matchday → Overview
 * (PortalHub.tsx); see PROGRESS.md for why both exist rather than one
 * absorbing the other.
 */
export default function FixturesScreen({ state }: { state: GameState }) {
  const leagueId = userLeagueId(state);
  const fixtures = leagueFixtures(state, leagueId).filter(
    (f) => f.homeId === state.userClubId || f.awayId === state.userClubId
  );
  const club = (id: number) => state.clubs.find((c) => c.id === id);
  const clubName = (id: number) => club(id)?.name ?? '—';

  const next = fixtures.find((f) => !f.played && f.round === state.week) ?? fixtures.find((f) => !f.played) ?? null;
  const results = fixtures.filter((f) => f.played).slice().reverse();

  return (
    <>
      {next && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>
            Next match · Week {next.round}
          </p>
          <div className="fm-card__fixture">
            <div className="fm-card__team">
              <Crest name={clubName(next.homeId)} code={club(next.homeId)?.code ?? ''} color={club(next.homeId)?.color ?? 'var(--panel-3)'} size={32} />
              <span className="fm-card__team-name fm-card__team-name--home">{clubName(next.homeId)}</span>
              <span className="fm-card__team-label">HOME</span>
            </div>
            <div className="fm-card__vs">VS</div>
            <div className="fm-card__team">
              <Crest name={clubName(next.awayId)} code={club(next.awayId)?.code ?? ''} color={club(next.awayId)?.color ?? 'var(--panel-3)'} size={32} />
              <span className="fm-card__team-name fm-card__team-name--away">{clubName(next.awayId)}</span>
              <span className="fm-card__team-label">AWAY</span>
            </div>
          </div>
        </div>
      )}

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Results</p>
        {results.length > 0 ? (
          <ul className="fm-fixture-list">
            {results.map((f) => {
              const isHome = f.homeId === state.userClubId;
              const gf = isHome ? f.homeGoals : f.awayGoals;
              const ga = isHome ? f.awayGoals : f.homeGoals;
              const outcome = gf > ga ? 'win' : gf < ga ? 'loss' : 'draw';
              const home = club(f.homeId);
              const away = club(f.awayId);
              return (
                <li key={f.round} className={`fm-fixture ${outcome}`}>
                  <span className="fm-fixture__round">W{f.round}</span>
                  <span className="fm-fixture__home">
                    <span className="fm-fixture__team-name">{clubName(f.homeId)}</span>
                    {home && <Crest name={home.name} code={home.code} color={home.color} size={16} />}
                  </span>
                  <span className="fm-fixture__score">{f.homeGoals} – {f.awayGoals}</span>
                  <span className="fm-fixture__away">
                    {away && <Crest name={away.name} code={away.code} color={away.color} size={16} />}
                    <span className="fm-fixture__team-name">{clubName(f.awayId)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="fm-hint">No results yet.</p>
        )}
      </div>
    </>
  );
}
