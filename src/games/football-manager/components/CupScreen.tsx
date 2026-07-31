'use client';

import type { GameState, Knockout } from '@/engine/types';
import { isClubAlive, roundName, tieWinner } from '@/engine/cups';
import {
  continentalRoundName, continentalTieWinner, isContinentalClubAlive, tieAggregate, tieComplete,
} from '@/engine/europeanCup';
import { Icon } from './Icon';

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
        <p className="fm-cup-status" style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="trophy" size={14} /> Winners: {winner}</p>
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

/** Compact continental bracket — the full breakdown lives in EuropeanScreen.
 *  Shows aggregate once a tie is decided, the current leg's score while one
 *  is still outstanding. */
function EuroBracket({ state }: { state: GameState }) {
  const c = state.continental;
  const clubName = (id: number) => state.clubs.find((cl) => cl.id === id)?.name ?? '—';
  const winner = c.winnerId ? clubName(c.winnerId) : null;
  const alive = isContinentalClubAlive(c, state.userClubId);
  const inComp =
    alive || c.directQualifiers.includes(state.userClubId) ||
    c.ties.some((r) => r.some((t) => t.homeId === state.userClubId || t.awayId === state.userClubId));

  return (
    <div className="fm-panel">
      <p className="fm-label" style={{ marginTop: 0 }}>{c.name}</p>
      {winner ? (
        <p className="fm-cup-status" style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="trophy" size={14} /> Winners: {winner}</p>
      ) : (
        <p className="fm-cup-status">
          {!inComp
            ? 'Did not qualify.'
            : alive
              ? `${continentalRoundName(c, c.round)} in week ${c.weeks[c.round] ?? '—'}.`
              : 'Knocked out.'}
        </p>
      )}
      {c.ties.map((ties, i) => {
        const played = ties.some((t) => t.legs.length > 0);
        if (!played && i !== c.round) return null;
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <p className="fm-label">{continentalRoundName(c, i)}</p>
            <ul className="fm-cup-ties">
              {ties.map((t) => {
                const mine = t.homeId === state.userClubId || t.awayId === state.userClubId;
                const done = tieComplete(t);
                const w = done ? continentalTieWinner(t) : 0;
                const agg = tieAggregate(t);
                const legTag = t.twoLegged && !done && t.legs.length === 1 ? ' (1st leg)' : t.twoLegged ? ' agg' : '';
                return (
                  <li key={t.id} className={mine ? 'me' : ''}>
                    <span className={w === t.homeId ? 'w' : ''}>{clubName(t.homeId)}</span>
                    <span className="score">
                      {t.legs.length ? `${agg.home}–${agg.away}${legTag}${t.legs[t.legs.length - 1].pensWinnerId ? ' p' : ''}` : 'vs'}
                    </span>
                    <span className={w === t.awayId ? 'w' : ''}>{clubName(t.awayId)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {c.round === 0 && c.directQualifiers.length > 0 && (
        <p className="fm-hint" style={{ textAlign: 'left' }}>
          Byes to the Round of 16 (top seeds): {c.directQualifiers.map(clubName).join(', ')}
        </p>
      )}
    </div>
  );
}

export default function CupScreen({ state }: { state: GameState }) {
  return (
    <>
      <Bracket state={state} k={state.cup} />
      <EuroBracket state={state} />
      <p className="fm-hint">Cup rounds play midweek. Top seeds bye to the Round of 16; the rest fight through a two-legged playoff.</p>
    </>
  );
}
