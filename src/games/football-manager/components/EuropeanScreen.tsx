'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { computeTable } from '@/engine/seasonProgression';
import { isClubAlive, roundName, tieWinner, userTieThisRound } from '@/engine/cups';
import { StatTile } from './visuals';

type EuroTab = 'standings' | 'fixtures' | 'stats';

export default function EuropeanScreen({ state }: { state: GameState }) {
  const [tab, setTab] = useState<EuroTab>('standings');
  const k = state.continental;
  const clubName = (id: number) => state.clubs.find((c) => c.id === id)?.name ?? '—';

  const enteredThisSeason =
    k.byes.includes(state.userClubId) ||
    k.rounds.some((r) => r.some((t) => t.homeId === state.userClubId || t.awayId === state.userClubId));
  const alive = isClubAlive(k, state.userClubId);
  const wonIt = k.winnerId === state.userClubId;

  // If the user never entered this season's continental knockout, show whether
  // their current league position would qualify next time (top 8 of Division 1).
  const d1Table = computeTable(state, 1);
  const d1Rank = d1Table.findIndex((r) => r.clubId === state.userClubId) + 1;
  const onCourseToQualify = d1Rank > 0 && d1Rank <= 8;

  const userTies = k.rounds.flatMap((ties, i) =>
    ties.filter((t) => t.homeId === state.userClubId || t.awayId === state.userClubId).map((t) => ({ t, round: i }))
  );

  const played = userTies.filter((x) => x.t.played);
  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
  for (const { t } of played) {
    const isHome = t.homeId === state.userClubId;
    const myGoals = isHome ? t.homeGoals : t.awayGoals;
    const oppGoals = isHome ? t.awayGoals : t.homeGoals;
    gf += myGoals;
    ga += oppGoals;
    const winner = tieWinner(t);
    if (winner === state.userClubId) wins++;
    else if (t.homeGoals === t.awayGoals && !t.pensWinnerId) draws++;
    else losses++;
  }

  const currentTie = userTieThisRound(k, state.userClubId);

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          {k.name || 'Continental Champions Cup'}
        </p>
        {wonIt ? (
          <p className="fm-cup-status">🏆 Winners: {clubName(k.winnerId!)}</p>
        ) : !enteredThisSeason ? (
          <p className="fm-cup-status">
            Did not qualify this season.{' '}
            {onCourseToQualify
              ? `Currently ${d1Rank}${ord(d1Rank)} in Division 1 — on course to qualify.`
              : 'Finish top 8 in Division 1 to qualify next season.'}
          </p>
        ) : alive ? (
          <p className="fm-cup-status">
            {roundName(k, k.round)} — {k.weeks[k.round] != null ? `week ${k.weeks[k.round]}` : 'draw pending'}.
          </p>
        ) : (
          <p className="fm-cup-status">Knocked out this season.</p>
        )}
      </div>

      <div className="fm-division-toggle" style={{ alignSelf: 'center' }}>
        <button className={tab === 'standings' ? 'active' : ''} onClick={() => setTab('standings')}>
          Standings
        </button>
        <button className={tab === 'fixtures' ? 'active' : ''} onClick={() => setTab('fixtures')}>
          Fixtures
        </button>
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>
          Statistics
        </button>
      </div>

      {tab === 'standings' && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>
            Knockout progress
          </p>
          <p className="fm-hint" style={{ textAlign: 'left' }}>
            The Continental Champions Cup is a straight knockout (Quarter-final → Semi-final →
            Final) — there is no group stage.
          </p>
          {k.rounds.map((ties, i) => {
            const played = ties.some((t) => t.played);
            if (!played && i !== k.round) return null;
            return (
              <div key={i} style={{ marginTop: 10 }}>
                <p className="fm-label">{roundName(k, i)}</p>
                <ul className="fm-cup-ties">
                  {ties.map((t, j) => {
                    const mine = t.homeId === state.userClubId || t.awayId === state.userClubId;
                    const w = tieWinner(t);
                    return (
                      <li key={j} className={mine ? 'me' : ''}>
                        <span className={w === t.homeId ? 'w' : ''}>{clubName(t.homeId)}</span>
                        <span className="score">
                          {t.played ? `${t.homeGoals}–${t.awayGoals}${t.pensWinnerId ? ' p' : ''}` : 'vs'}
                        </span>
                        <span className={w === t.awayId ? 'w' : ''}>{clubName(t.awayId)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {k.round === 0 && k.byes.length > 0 && (
            <p className="fm-hint" style={{ textAlign: 'left' }}>
              Byes into round two: {k.byes.map(clubName).join(', ')}
            </p>
          )}
          {!enteredThisSeason && <p className="fm-hint">No bracket to show — not entered this season.</p>}
        </div>
      )}

      {tab === 'fixtures' && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>
            Upcoming
          </p>
          {currentTie ? (
            <ul className="fm-cup-ties">
              <li className="me">
                <span className={currentTie.homeId === state.userClubId ? '' : ''}>{clubName(currentTie.homeId)}</span>
                <span className="score">vs</span>
                <span>{clubName(currentTie.awayId)}</span>
              </li>
            </ul>
          ) : (
            <p className="fm-hint">No tie currently scheduled.</p>
          )}
          <p className="fm-label">Remaining rounds</p>
          {k.weeks.slice(k.round).length === 0 ? (
            <p className="fm-hint">No rounds left this season.</p>
          ) : (
            <ul className="fm-news">
              {k.weeks.slice(k.round).map((wk, i) => (
                <li key={i}>
                  {roundName(k, k.round + i)} — week {wk}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>
            {clubName(state.userClubId)} in Europe this season
          </p>
          <div className="fm-attr-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <StatTile icon="⚽" value={played.length} label="Played" />
            <StatTile icon="✅" value={wins} label="Wins" />
            <StatTile icon="➖" value={draws} label="Draws" />
            <StatTile icon="❌" value={losses} label="Losses" />
            <StatTile icon="🥅" value={`${gf}-${ga}`} label="Goals for-against" />
            <StatTile icon="📈" value={gf - ga >= 0 ? `+${gf - ga}` : gf - ga} label="Goal difference" />
          </div>
          {!enteredThisSeason && <p className="fm-hint">No European matches played this season.</p>}
        </div>
      )}
    </>
  );
}

function ord(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}
