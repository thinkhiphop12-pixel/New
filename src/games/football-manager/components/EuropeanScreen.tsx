'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { computeTable, userLeagueId } from '@/engine/seasonProgression';
import { getLeague } from '@/engine/gameRules';
import {
  continentalRoundName, continentalTieWinner, isContinentalClubAlive, tieAggregate, tieComplete,
  userContinentalTie,
} from '@/engine/europeanCup';
import { StatTile } from './visuals';
import { Icon } from './Icon';
import { Crest } from './Crest';

type EuroTab = 'standings' | 'fixtures' | 'stats';

/** Ties expected in a future (not-yet-drawn) round — halves each round from
 *  the last known one, same estimate CupScreen uses for its bracket. The
 *  continental competition is a real (re-seeded) knockout, not a group
 *  stage — see engine/types.ts's Continental doc comment — so "standings"
 *  here means bracket progress, shown with the same `.fm-bracket` columns
 *  as the domestic cup rather than a fabricated points table. */
function placeholderCount(lastKnownCount: number, roundsAhead: number): number {
  return Math.max(1, Math.round(lastKnownCount / 2 ** roundsAhead));
}

export default function EuropeanScreen({ state }: { state: GameState }) {
  const [tab, setTab] = useState<EuroTab>('standings');
  const c = state.continental;
  const clubName = (id: number) => state.clubs.find((cl) => cl.id === id)?.name ?? '—';

  const enteredThisSeason =
    c.directQualifiers.includes(state.userClubId) ||
    c.ties.some((r) => r.some((t) => t.homeId === state.userClubId || t.awayId === state.userClubId));
  const alive = isContinentalClubAlive(c, state.userClubId);
  const wonIt = c.winnerId === state.userClubId;

  // If the user never entered this season's continental knockout, show whether
  // their current league position would qualify next time — their own league's
  // Champions League allocation.
  const myLeague = getLeague(userLeagueId(state));
  const euroSpots = myLeague.championsLeague + myLeague.clPlayoff;
  const d1Table = computeTable(state, myLeague.id);
  const d1Rank = d1Table.findIndex((r) => r.clubId === state.userClubId) + 1;
  const onCourseToQualify = euroSpots > 0 && d1Rank > 0 && d1Rank <= euroSpots;

  const userTies = c.ties.flatMap((ties, i) =>
    ties.filter((t) => t.homeId === state.userClubId || t.awayId === state.userClubId).map((t) => ({ t, round: i }))
  );

  // Stats are per LEG played, not per tie — a two-legged tie is two matches.
  let legsPlayed = 0, wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
  for (const { t } of userTies) {
    for (const leg of t.legs) {
      if (!leg.played) continue;
      legsPlayed++;
      const isHome = leg.homeId === state.userClubId;
      const myGoals = isHome ? leg.homeGoals : leg.awayGoals;
      const oppGoals = isHome ? leg.awayGoals : leg.homeGoals;
      gf += myGoals;
      ga += oppGoals;
      if (myGoals > oppGoals) wins++;
      else if (myGoals === oppGoals) draws++;
      else losses++;
    }
  }

  const currentTie = userContinentalTie(c, state.userClubId);

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          {c.name || 'Continental Champions Cup'}
        </p>
        {wonIt ? (
          <p className="fm-cup-status" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="trophy" size={14} /> Winners: {clubName(c.winnerId!)}</p>
        ) : !enteredThisSeason ? (
          <p className="fm-cup-status">
            Did not qualify this season.{' '}
            {onCourseToQualify
              ? `Currently ${d1Rank}${ord(d1Rank)} in the ${myLeague.name} — on course to qualify.`
              : euroSpots > 0
                ? `Finish top ${euroSpots} in the ${myLeague.name} to qualify next season.`
                : `The ${myLeague.name} has no Champions League place — promotion first.`}
          </p>
        ) : alive ? (
          <p className="fm-cup-status">
            {continentalRoundName(c, c.round)} — {c.weeks[c.round] != null ? `week ${c.weeks[c.round]}` : 'draw pending'}.
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
            The top 8 seeds go straight to the Round of 16; the rest fight through a two-legged
            playoff round for the other 8 places. Every round from the playoff to the semi-final
            is two-legged; the final is a single match.
          </p>
          {enteredThisSeason ? (
            <div className="fm-bracket">
              {Array.from({ length: c.weeks.length }, (_, i) => {
                const ties = c.ties[i];
                const lastKnown = c.ties.length - 1;
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
                            <span className="fm-bracket__side-score">
                              {played ? `${agg.home}${t.legs[t.legs.length - 1].pensWinnerId === t.homeId ? ' p' : ''}` : ''}
                            </span>
                          </div>
                          <div className={`fm-bracket__side${w === t.awayId ? ' winner' : ''}`}>
                            <span className="fm-bracket__side-name">{clubName(t.awayId)}</span>
                            <span className="fm-bracket__side-score">
                              {played ? `${agg.away}${t.legs[t.legs.length - 1].pensWinnerId === t.awayId ? ' p' : ''}` : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="fm-hint">No bracket to show — not entered this season.</p>
          )}
          {c.round === 0 && c.directQualifiers.length > 0 && (
            <p className="fm-hint" style={{ textAlign: 'left' }}>
              Byes to the Round of 16 (top seeds): {c.directQualifiers.map(clubName).join(', ')}
            </p>
          )}
        </div>
      )}

      {tab === 'fixtures' && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>
            {currentTie ? continentalRoundName(c, c.round) : 'Upcoming'}
          </p>
          {currentTie ? (
            <>
              {(() => {
                // Leg 2 (if this tie has played exactly one leg) reverses venue.
                const homeId = currentTie.legs.length === 1 ? currentTie.awayId : currentTie.homeId;
                const awayId = currentTie.legs.length === 1 ? currentTie.homeId : currentTie.awayId;
                const home = state.clubs.find((cl) => cl.id === homeId);
                const away = state.clubs.find((cl) => cl.id === awayId);
                return (
                  <div className="fm-card__fixture">
                    <div className="fm-card__team">
                      <Crest name={clubName(homeId)} code={home?.code ?? ''} color={home?.color ?? 'var(--panel-3)'} size={32} />
                      <span className="fm-card__team-name fm-card__team-name--home">{clubName(homeId)}</span>
                      <span className="fm-card__team-label">HOME</span>
                    </div>
                    <div className="fm-card__vs">VS</div>
                    <div className="fm-card__team">
                      <Crest name={clubName(awayId)} code={away?.code ?? ''} color={away?.color ?? 'var(--panel-3)'} size={32} />
                      <span className="fm-card__team-name fm-card__team-name--away">{clubName(awayId)}</span>
                      <span className="fm-card__team-label">AWAY</span>
                    </div>
                  </div>
                );
              })()}
              {currentTie.twoLegged && currentTie.legs.length === 1 && (
                <p className="fm-hint" style={{ textAlign: 'left' }}>
                  2nd leg — venue reverses from the 1st.
                </p>
              )}
            </>
          ) : (
            <p className="fm-hint">No tie currently scheduled.</p>
          )}
          <p className="fm-label">Remaining rounds</p>
          {c.weeks.slice(c.round).length === 0 ? (
            <p className="fm-hint">No rounds left this season.</p>
          ) : (
            <ul className="fm-news">
              {c.weeks.slice(c.round).map((wk, i) => (
                <li key={i}>
                  {continentalRoundName(c, c.round + i)} — week {wk}
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
            <StatTile icon={<Icon name="goal" />} value={legsPlayed} label="Played" />
            <StatTile icon={<Icon name="check" />} value={wins} label="Wins" />
            <StatTile icon={<Icon name="dash" />} value={draws} label="Draws" />
            <StatTile icon={<Icon name="cross" />} value={losses} label="Losses" />
            <StatTile icon={<Icon name="net" />} value={`${gf}-${ga}`} label="Goals for-against" />
            <StatTile icon={<Icon name="trend" />} value={gf - ga >= 0 ? `+${gf - ga}` : gf - ga} label="Goal difference" />
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
