'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { getLeague, leagueColor, leagueName } from '@/engine/gameRules';
import { activeLeagueIds, computeTable, leagueFixtures, userLeagueId } from '@/engine/seasonProgression';
import { Crest } from './Crest';

/** Last `count` league results for a club, oldest first — the "form" strip
 *  (mock: five W/D/L chips per row). Derived from played fixtures rather
 *  than stored anywhere, since the engine doesn't track a running form
 *  string per club. */
function clubForm(state: GameState, leagueId: string, clubId: number, count = 5): ('W' | 'D' | 'L')[] {
  const played = leagueFixtures(state, leagueId)
    .filter((f) => f.played && (f.homeId === clubId || f.awayId === clubId))
    .sort((a, b) => a.round - b.round);
  return played.slice(-count).map((f) => {
    const isHome = f.homeId === clubId;
    const gf = isHome ? f.homeGoals : f.awayGoals;
    const ga = isHome ? f.awayGoals : f.homeGoals;
    return gf > ga ? 'W' : gf < ga ? 'L' : 'D';
  });
}

/**
 * The league table.
 *
 * There used to be a second tab here holding bookmaker odds — 1X2, BTTS,
 * over/under, and a Monte Carlo season-outrights button that re-simulated
 * every remaining fixture through the real match engine and blocked the
 * main thread for seconds to do it. Nothing in the game read any of it and
 * nothing acted on it: it priced a match the player was about to manage
 * anyway, in a game with no betting. It has been removed along with
 * engine/odds.ts.
 */
export default function TableScreen({ state }: { state: GameState }) {
  const [leagueId, setLeagueId] = useState<string>(userLeagueId(state));
  const leagueIds = activeLeagueIds(state);
  const active = leagueIds.includes(leagueId) ? leagueId : leagueIds[0] ?? leagueId;
  const lg = getLeague(active);
  const table = computeTable(state, active);
  const club = (id: number) => state.clubs.find((c) => c.id === id);
  const clubName = (id: number) => club(id)?.name ?? '—';

  // Zone boundaries come straight off the league definition, so a five-tier
  // pyramid and a two-tier one both render correctly without special cases.
  const n = table.length;
  const autoUp = lg.autoPromotion;
  const playoffEnd = autoUp + lg.playoffSpots;
  // The lowest safe place plays the inter-league relegation play-off
  // (Bundesliga Relegationsspiele, Ligue 1 barrage) where the league has one.
  const relFrom = n - lg.relegation;
  const playoffDown = lg.interPlayoff ? relFrom : 0;

  return (
    <>
      <div className="fm-division-toggle" style={{ alignSelf: 'center' }}>
        {leagueIds.map((id) => {
          // Per-league identity colour (gap 78/Phase 14) — a separate axis
          // from --brand: this reflects the LEAGUE's own country identity,
          // not the managed club's colour, so it stays fixed regardless of
          // which club the player is running.
          const { color, text } = leagueColor(id);
          const isActive = active === id;
          return (
            <button
              key={id}
              className={isActive ? 'active' : ''}
              onClick={() => setLeagueId(id)}
              style={isActive ? { background: color, color: text } : undefined}
            >
              {leagueName(id)}
            </button>
          );
        })}
      </div>
      <div className="fm-panel" style={{ padding: '8px 6px', overflowX: 'auto' }}>
        <table className="fm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Club</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th className="fm-table__form-th">Form</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => {
              const pos = i + 1;
              const promo = pos <= autoUp || (pos > autoUp && pos <= playoffEnd);
              const releg = pos > relFrom || pos === playoffDown;
              const me = row.clubId === state.userClubId;
              const c = club(row.clubId);
              return (
                <tr key={row.clubId} className={`${me ? 'me ' : ''}${promo ? 'promo' : ''}${releg ? 'releg' : ''}`}>
                  <td>{pos}</td>
                  <td className="fm-table__club">
                    <span className="fm-table__club-inner">
                      {c && <Crest name={c.name} code={c.code} color={c.color} size={16} />}
                      <span className="fm-table__club-name">{clubName(row.clubId)}</span>
                    </span>
                  </td>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>
                    <span className="fm-form-row">
                      {clubForm(state, active, row.clubId).map((r, fi) => (
                        <span key={fi} className={`fm-form-dot fm-form-dot--${r.toLowerCase()}`}>{r}</span>
                      ))}
                    </span>
                  </td>
                  <td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                  <td className="pts">{row.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="fm-hint">{describeLeague(active, n)}</p>
    </>
  );
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
}

/** Plain-English summary of this league's promotion, relegation and UEFA spots. */
function describeLeague(leagueId: string, clubCount: number): string {
  const lg = getLeague(leagueId);
  const parts: string[] = [];
  if (lg.autoPromotion === 1) parts.push('The champions go up automatically');
  else if (lg.autoPromotion > 1) parts.push(`Top ${lg.autoPromotion} are promoted automatically`);
  if (lg.playoffSpots >= 4) {
    parts.push(
      `${ordinal(lg.autoPromotion + 1)}–${ordinal(lg.autoPromotion + lg.playoffSpots)} contest the promotion play-offs`
    );
  }
  const euro = lg.championsLeague + lg.clPlayoff;
  if (euro > 0) parts.push(`top ${euro} qualify for the Continental Champions Cup`);
  if (lg.relegation === 1) parts.push('the bottom club is relegated');
  else if (lg.relegation > 1) parts.push(`bottom ${lg.relegation} are relegated`);
  if (lg.interPlayoff) parts.push(`${ordinal(clubCount - lg.relegation)} plays a relegation play-off`);
  if (!parts.length) return `${lg.name}. Win the title.`;
  const text = parts.join(', ');
  return `${lg.name} — ${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}
