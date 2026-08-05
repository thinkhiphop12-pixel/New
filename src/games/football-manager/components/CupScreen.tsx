'use client';

import type { GameState, Knockout } from '@/engine/types';
import { isClubAlive, roundName, tieWinner } from '@/engine/cups';
import {
  continentalRoundName, continentalTieWinner, isContinentalClubAlive, tieAggregate, tieComplete,
} from '@/engine/europeanCup';
import { Icon } from './Icon';

/** Ties expected in a future (not-yet-drawn) round — halves each round from
 *  the last known round, same as a standard single-elimination bracket.
 *  The live draw is redrawn round-by-round (not a fixed tree), so this is a
 *  visual estimate for the "TBD" placeholder column, not real pairing data. */
function placeholderCount(lastKnownCount: number, roundsAhead: number): number {
  return Math.max(1, Math.round(lastKnownCount / 2 ** roundsAhead));
}

function DomesticBracket({ state, k }: { state: GameState; k: Knockout }) {
  const clubName = (id: number) => state.clubs.find((c) => c.id === id)?.name ?? '—';
  const winner = k.winnerId ? clubName(k.winnerId) : null;
  const alive = isClubAlive(k, state.userClubId);
  const inComp =
    alive || k.byes.includes(state.userClubId) ||
    k.rounds.some((r) => r.some((t) => t.homeId === state.userClubId || t.awayId === state.userClubId));

  const totalRounds = k.weeks.length;
  const lastKnown = k.rounds.length - 1;

  return (
    <div className="fm-panel">
      <p className="fm-label" style={{ marginTop: 0 }}>{k.name}</p>
      {winner ? (
        <p className="fm-cup-status" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="trophy" size={14} /> Winners: {winner}</p>
      ) : (
        <p className="fm-cup-status">
          {!inComp
            ? 'Did not qualify.'
            : alive
              ? `${roundName(k, k.round)} in week ${k.weeks[k.round] ?? '—'}.`
              : 'Knocked out.'}
        </p>
      )}

      <div className="fm-bracket">
        {Array.from({ length: totalRounds }, (_, i) => {
          const ties = k.rounds[i];
          const rows = ties && ties.length
            ? ties
            : Array.from({ length: placeholderCount(k.rounds[lastKnown]?.length ?? 1, i - lastKnown) }, () => null);
          return (
            <div className="fm-bracket__round" key={i}>
              <p className="fm-bracket__round-label">{roundName(k, i)}</p>
              {rows.map((t, j) => {
                if (!t) {
                  return (
                    <div className="fm-bracket__tie" key={j}>
                      <div className="fm-bracket__side"><span className="fm-bracket__side-name">TBD</span></div>
                      <div className="fm-bracket__side"><span className="fm-bracket__side-name">TBD</span></div>
                    </div>
                  );
                }
                const mine = t.homeId === state.userClubId || t.awayId === state.userClubId;
                const w = tieWinner(t);
                return (
                  <div className={`fm-bracket__tie${mine ? ' me' : ''}`} key={j}>
                    <div className={`fm-bracket__side${w === t.homeId ? ' winner' : ''}`}>
                      <span className="fm-bracket__side-name">{clubName(t.homeId)}</span>
                      <span className="fm-bracket__side-score">{t.played ? t.homeGoals : ''}</span>
                    </div>
                    <div className={`fm-bracket__side${w === t.awayId ? ' winner' : ''}`}>
                      <span className="fm-bracket__side-name">{clubName(t.awayId)}</span>
                      <span className="fm-bracket__side-score">
                        {t.played ? `${t.awayGoals}${t.pensWinnerId ? ' p' : ''}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {k.round === 0 && k.byes.length > 0 && (
        <p className="fm-hint" style={{ textAlign: 'left' }}>
          Byes into round two: {k.byes.map(clubName).join(', ')}
        </p>
      )}
    </div>
  );
}

/** Continental bracket — same round-as-column treatment as the domestic cup,
 *  but each column shows aggregate once a two-legged tie is decided, and
 *  the outstanding leg's score while one is still to play. */
function EuroBracket({ state }: { state: GameState }) {
  const c = state.continental;
  const clubName = (id: number) => state.clubs.find((cl) => cl.id === id)?.name ?? '—';
  const winner = c.winnerId ? clubName(c.winnerId) : null;
  const alive = isContinentalClubAlive(c, state.userClubId);
  const inComp =
    alive || c.directQualifiers.includes(state.userClubId) ||
    c.ties.some((r) => r.some((t) => t.homeId === state.userClubId || t.awayId === state.userClubId));

  const totalRounds = c.weeks.length;
  const lastKnown = c.ties.length - 1;

  return (
    <div className="fm-panel">
      <p className="fm-label" style={{ marginTop: 0 }}>{c.name}</p>
      {winner ? (
        <p className="fm-cup-status" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="trophy" size={14} /> Winners: {winner}</p>
      ) : (
        <p className="fm-cup-status">
          {!inComp
            ? 'Did not qualify.'
            : alive
              ? `${continentalRoundName(c, c.round)} in week ${c.weeks[c.round] ?? '—'}.`
              : 'Knocked out.'}
        </p>
      )}

      <div className="fm-bracket">
        {Array.from({ length: totalRounds }, (_, i) => {
          const ties = c.ties[i];
          const rows = ties && ties.length
            ? ties
            : Array.from({ length: placeholderCount(c.ties[lastKnown]?.length ?? 1, i - lastKnown) }, () => null);
          return (
            <div className="fm-bracket__round" key={i}>
              <p className="fm-bracket__round-label">{continentalRoundName(c, i)}</p>
              {rows.map((t, j) => {
                if (!t) {
                  return (
                    <div className="fm-bracket__tie" key={j}>
                      <div className="fm-bracket__side"><span className="fm-bracket__side-name">TBD</span></div>
                      <div className="fm-bracket__side"><span className="fm-bracket__side-name">TBD</span></div>
                    </div>
                  );
                }
                const mine = t.homeId === state.userClubId || t.awayId === state.userClubId;
                const done = tieComplete(t);
                const w = done ? continentalTieWinner(t) : 0;
                const agg = tieAggregate(t);
                const played = t.legs.length > 0;
                return (
                  <div className={`fm-bracket__tie${mine ? ' me' : ''}`} key={t.id}>
                    <div className={`fm-bracket__side${w === t.homeId ? ' winner' : ''}`}>
                      <span className="fm-bracket__side-name">{clubName(t.homeId)}</span>
                      <span className="fm-bracket__side-score">{played ? agg.home : ''}</span>
                    </div>
                    <div className={`fm-bracket__side${w === t.awayId ? ' winner' : ''}`}>
                      <span className="fm-bracket__side-name">{clubName(t.awayId)}</span>
                      <span className="fm-bracket__side-score">
                        {played ? `${agg.away}${t.legs[t.legs.length - 1].pensWinnerId ? ' p' : ''}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

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
      <DomesticBracket state={state} k={state.cup} />
      <EuroBracket state={state} />
      <p className="fm-hint">Cup rounds play midweek. Top seeds bye to the Round of 16; the rest fight through a two-legged playoff.</p>
    </>
  );
}
