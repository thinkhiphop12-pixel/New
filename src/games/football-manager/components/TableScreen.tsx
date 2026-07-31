'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { getLeague, leagueColor, leagueName } from '@/engine/gameRules';
import { activeLeagueIds, computeTable, nextUserFixture, userLeagueId } from '@/engine/seasonProgression';
import { computeMarkets, scoreGrid, seasonOutrights, toOdds, type SeasonOutrights } from '@/engine/odds';
import { Crest } from './Crest';

export default function TableScreen({ state }: { state: GameState }) {
  const [tab, setTab] = useState<'table' | 'odds'>('table');
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
      <div className="fm-pills" style={{ alignSelf: 'center', marginBottom: 8 }}>
        <button className={`fm-pill${tab === 'table' ? ' active' : ''}`} onClick={() => setTab('table')}>Table</button>
        <button className={`fm-pill${tab === 'odds' ? ' active' : ''}`} onClick={() => setTab('odds')}>Odds</button>
      </div>
      {tab === 'odds' ? (
        <OddsTab state={state} />
      ) : (
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
      )}
    </>
  );
}

/**
 * The Odds tab (gap 75): calibrated match odds for the user's next fixture
 * (cheap — one Dixon-Coles scoreline grid, computed live on every render),
 * plus season outrights via a button-triggered Monte Carlo run rather than
 * something computed automatically. Measured directly: even the reduced
 * 12-run default takes several real seconds (it re-simulates every remaining
 * fixture in the league via the full match engine, not a shortcut model) —
 * far too slow to run on every render or league-switch, so it's opt-in with
 * its own loading state instead.
 */
function OddsTab({ state }: { state: GameState }) {
  const [outrights, setOutrights] = useState<SeasonOutrights | null>(null);
  const [loading, setLoading] = useState(false);

  const fixture = nextUserFixture(state);
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const opponentId = fixture ? (fixture.homeId === state.userClubId ? fixture.awayId : fixture.homeId) : null;
  const opponent = opponentId ? state.clubs.find((c) => c.id === opponentId) : null;

  const runOutrights = () => {
    setLoading(true);
    // Not a real async op (the engine is synchronous) — the timeout just lets
    // the loading state paint before the run blocks the main thread.
    setTimeout(() => {
      setOutrights(seasonOutrights(state));
      setLoading(false);
    }, 30);
  };

  if (!fixture) {
    return <p className="fm-hint">No upcoming fixture to price up.</p>;
  }

  const sg = scoreGrid(state, fixture.homeId, fixture.awayId);
  const markets = computeMarkets(sg);
  const homeName = fixture.homeId === state.userClubId ? userClub?.name : opponent?.name;
  const awayName = fixture.awayId === state.userClubId ? userClub?.name : opponent?.name;

  return (
    <div className="fm-panel" style={{ padding: 12 }}>
      <p className="fm-label fm-label--sm" style={{ marginTop: 0 }}>{homeName} v {awayName}</p>
      <div className="fm-odds-grid">
        <div className="fm-odds-cell"><span>Home</span><b>{toOddsLabel(markets.homeWin)}</b></div>
        <div className="fm-odds-cell"><span>Draw</span><b>{toOddsLabel(markets.draw)}</b></div>
        <div className="fm-odds-cell"><span>Away</span><b>{toOddsLabel(markets.awayWin)}</b></div>
        <div className="fm-odds-cell"><span>BTTS Yes</span><b>{toOddsLabel(markets.bttsYes)}</b></div>
        <div className="fm-odds-cell"><span>Over 2.5</span><b>{toOddsLabel(markets.over25)}</b></div>
        <div className="fm-odds-cell"><span>Under 2.5</span><b>{toOddsLabel(markets.under25)}</b></div>
      </div>

      <p className="fm-label fm-label--sm">Season Outrights ({userClub?.name})</p>
      {outrights ? (
        <div className="fm-odds-grid">
          <div className="fm-odds-cell"><span>Title</span><b>{(outrights.title * 100).toFixed(0)}%</b></div>
          <div className="fm-odds-cell"><span>Top 4</span><b>{(outrights.topFour * 100).toFixed(0)}%</b></div>
          <div className="fm-odds-cell"><span>Relegation</span><b>{(outrights.relegation * 100).toFixed(0)}%</b></div>
        </div>
      ) : (
        <button className="fm-btn fm-btn--secondary" onClick={runOutrights} disabled={loading}>
          {loading ? 'Simulating…' : 'Simulate season outrights'}
        </button>
      )}
    </div>
  );
}

function toOddsLabel(p: number): string {
  return toOdds(p);
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
