'use client';

import type { GameState, Knockout } from '@/engine/types';
import { isClubAlive, roundName, tieWinner } from '@/engine/cups';

function Bracket({ state, k }: { state: GameState; k: Knockout }) {
  const clubName = (id: number) => state.clubs.find((c) => c.id === id)?.name ?? '—';
  const winner = k.winnerId ? clubName(k.winnerId) : null;
  const alive = isClubAlive(k, state.userClubId);
  const inComp =
    alive || k.byes.includes(state.userClubId) ||
    k.rounds.some((r) => r.some((t) => t.homeId === state.userClubId || t.awayId === state.userClubId));

  return (
    <div className="fm-panel">
      <p className="fm-label" style={{ marginTop: 0 }}>
        {k.name}
      </p>
      {winner ? (
        <p className="fm-cup-status">🏆 Winners: {winner}</p>
      ) : (
        <p className="fm-cup-status">
          {!inComp
            ? 'Did not qualify.'
            : alive
              ? `${roundName(k, k.round)} in week ${k.weeks[k.round] ?? '—'}.`
              : 'Knocked out.'}
        </p>
      )}
      {[...k.rounds].map((ties, i) => {
        // Only show the user's tie plus a compact list for played rounds.
        const played = ties.some((t) => t.played);
        if (!played && i !== k.round) return null;
        return (
          <div key={i} style={{ marginBottom: 10 }}>
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
    </div>
  );
}

export default function CupScreen({ state }: { state: GameState }) {
  return (
    <>
      <Bracket state={state} k={state.cup} />
      <Bracket state={state} k={state.continental} />
      <p className="fm-hint">Cup rounds play midweek. Top 8 in Division 1 qualify for Europe.</p>
    </>
  );
}
