/**
 * The continental competition (Phase 9) — a real 24-club bracket with seeded,
 * country-protected draws and two-legged ties, replacing the flat "top 8,
 * single-match knockout" that stood in for it since Phase 4.
 *
 * Deliberately still a pure knockout, not the reference's Swiss-model league
 * phase — see the Continental type doc comment in engine/types.ts for why.
 * Kept fully separate from engine/cups.ts's domestic-cup knockout rather than
 * generalizing that model to carry legs: the domestic cup is genuinely
 * single-match in real football, and touching its consumers (CupScreen,
 * every existing smoke assertion) for a competition that doesn't need legs
 * would be a much larger, riskier change for no gameplay benefit there.
 *
 * Simplification, disclosed: a tie level on aggregate after the second leg
 * goes straight to a penalty shootout, skipping extra time. Real continental
 * competitions play extra time first — but `simulateTickMatch`'s `decisive`
 * flag (which drives extra time) is built around a single match needing a
 * winner, and leg 2 can't be told upfront whether it will need one, since
 * that depends on the aggregate the match itself produces. Bolting real extra
 * time onto an already-completed leg-2 match is a bigger, separate change;
 * going straight to penalties is the honest interim behaviour, not a silent
 * gap.
 */
import type {
  Club, Continental, ContinentalTie, CupTie, GameState, MatchReport,
} from './types';
import { leagueCountry } from './negotiation';
import { simulateTickMatch } from './tickEngine/sim';
import { runShootout } from './shootout';
import { aiMatchSetup } from './teamManagement';
import { buildXI } from './tickEngine/xgModel';
import { getFormation } from './gameRules';

/** Playoff round (16 clubs), Round of 16, quarter-final, semi-final, final. */
export const EURO_ROUND_NAMES = ['Playoff Round', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

function clubCountry(clubs: Club[], id: number): string | null {
  const club = clubs.find((c) => c.id === id);
  return club ? leagueCountry(club.leagueId) : null;
}

/**
 * Seeded pairing: best seed plays worst seed, second-best plays
 * second-worst, and so on. Then a single local swap pass nudges apart any
 * pair that would otherwise put two clubs from the same country against a
 * third pair's club from a country neither of them share — the same
 * one-pass fix the reference uses rather than a full re-draw, which keeps
 * the draw close to "pure seeding" instead of engineering it.
 */
export function seededPairs(ids: number[], seedRank: Record<number, number>, clubs: Club[]): [number, number][] {
  const sorted = [...ids].sort((a, b) => (seedRank[a] ?? 999) - (seedRank[b] ?? 999));
  const half = Math.floor(sorted.length / 2);
  const pairs: [number, number][] = [];
  for (let i = 0; i < half; i++) pairs.push([sorted[i], sorted[sorted.length - 1 - i]]);
  for (let i = 0; i < pairs.length - 1; i++) {
    const [a1, b1] = pairs[i];
    const [a2, b2] = pairs[i + 1];
    const cA1 = clubCountry(clubs, a1);
    const cB1 = clubCountry(clubs, b1);
    const cB2 = clubCountry(clubs, b2);
    if (cA1 && cA1 === cB1 && cA1 !== cB2) {
      pairs[i] = [a1, b2];
      pairs[i + 1] = [a2, b1];
    }
  }
  return pairs;
}

let tieSeq = 0;
function makeTie(homeId: number, awayId: number, twoLegged: boolean): ContinentalTie {
  return { id: `euti_${++tieSeq}`, homeId, awayId, twoLegged, legs: [] };
}

/**
 * Set up a fresh continental campaign. `entrants` must be seed-ordered best
 * first (`continentalEntrants` already ranks by squad rating) — the top 8 go
 * straight to the Round of 16, the rest (up to 16) fight through a two-legged
 * playoff round.
 */
export function createContinental(name: string, weeks: number[], entrants: number[], clubs: Club[]): Continental {
  const seeded = entrants.slice(0, 24);
  const seedRank: Record<number, number> = {};
  seeded.forEach((id, i) => { seedRank[id] = i + 1; });
  const direct = seeded.slice(0, 8);
  const playoffField = seeded.slice(8, 24);

  const ties: ContinentalTie[][] =
    playoffField.length >= 2
      ? [seededPairs(playoffField, seedRank, clubs).map(([h, a]) => makeTie(h, a, true))]
      : [[]];

  return {
    name,
    weeks,
    ties,
    seedRank,
    directQualifiers: direct,
    round: 0,
    winnerId: playoffField.length < 2 && direct.length === 1 ? direct[0] : null,
  };
}

/** Aggregate score across however many legs have been played, oriented to
 *  the tie's original home/away (leg 2's venue is reversed). */
export function tieAggregate(t: ContinentalTie): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const leg of t.legs) {
    const firstOrientation = leg.homeId === t.homeId;
    home += firstOrientation ? leg.homeGoals : leg.awayGoals;
    away += firstOrientation ? leg.awayGoals : leg.homeGoals;
  }
  return { home, away };
}

export function tieComplete(t: ContinentalTie): boolean {
  const legsNeeded = t.twoLegged ? 2 : 1;
  return t.legs.length >= legsNeeded && t.legs[t.legs.length - 1].played;
}

export function continentalTieWinner(t: ContinentalTie): number {
  if (!tieComplete(t)) return 0;
  const { home, away } = tieAggregate(t);
  if (home > away) return t.homeId;
  if (away > home) return t.awayId;
  const decider = t.legs[t.legs.length - 1];
  return decider.pensWinnerId ?? t.homeId;
}

/** True when there is a leg due to be played at or before `week`. Mirrors
 *  domestic cup's knockoutRoundDue, but a two-legged round has to fire twice —
 *  once for leg 1 at weeks[round], once for leg 2 the week after. */
export function continentalRoundDue(c: Continental, week: number): boolean {
  if (c.winnerId !== null || c.round >= c.weeks.length) return false;
  const ties = c.ties[c.round];
  if (!ties || !ties.length || ties.every(tieComplete)) return false;
  const leg1Played = ties[0].legs.length >= 1;
  const dueWeek = ties[0].twoLegged && leg1Played ? c.weeks[c.round] + 1 : c.weeks[c.round];
  return dueWeek <= week;
}

export function isContinentalClubAlive(c: Continental, clubId: number): boolean {
  if (c.winnerId !== null) return c.winnerId === clubId;
  if (c.round === 0 && c.directQualifiers.includes(clubId)) return true;
  const current = c.ties[c.round];
  return current ? current.some((t) => t.homeId === clubId || t.awayId === clubId) : false;
}

export function userContinentalTie(c: Continental, clubId: number): ContinentalTie | null {
  const current = c.ties[c.round];
  return current?.find((t) => t.homeId === clubId || t.awayId === clubId) ?? null;
}

/**
 * Round 0 is the playoff round only when there was a playoff field (16-24
 * entrants); with fewer entrants (a small custom league set) round 0 IS the
 * Round of 16, so the name list shifts by one.
 */
export function continentalRoundName(c: Continental, roundIndex: number): string {
  const hadPlayoff = (c.ties[0]?.length ?? 0) > 0;
  const offset = hadPlayoff ? 0 : 1;
  return EURO_ROUND_NAMES[roundIndex + offset] ?? `Round ${roundIndex + 1}`;
}

function xiAndTactics(state: GameState, clubId: number, opponentId: number) {
  const setup = aiMatchSetup(state, clubId, opponentId);
  const xi = buildXI(state, setup.lineup, getFormation(setup.formation.id)).map((slot) => slot.p);
  return { xi, tactics: setup.tactics };
}

/** Resolve a tie level on aggregate after its last leg: straight to penalties. */
function resolveLevelTie(state: GameState, t: ContinentalTie, lastLeg: CupTie): void {
  const home = xiAndTactics(state, t.homeId, t.awayId);
  const away = xiAndTactics(state, t.awayId, t.homeId);
  const result = runShootout(home.xi, away.xi, home.tactics, away.tactics, t.homeId, t.awayId);
  lastLeg.pensWinnerId = result.winnerId;
  lastLeg.penScore = { home: result.homeScore, away: result.awayScore };
}

/**
 * Play whatever leg is next due for every tie in the current round. A
 * two-legged tie takes two calls (this call plays leg 1 or leg 2, whichever
 * hasn't happened); a one-legged tie (the final) resolves in one call.
 * Advances `c.round` and draws the next round once every tie here is
 * complete. Idempotent — calling it again once the round is fully played
 * does nothing.
 */
export function playContinentalRound(state: GameState, c: Continental): MatchReport[] {
  const ties = c.ties[c.round];
  if (!ties || !ties.length || ties.every(tieComplete)) return [];

  const reports: MatchReport[] = [];
  for (const t of ties) {
    if (tieComplete(t)) continue;
    const playingLeg2 = t.twoLegged && t.legs.length === 1;
    const homeId = playingLeg2 ? t.awayId : t.homeId; // leg 2 reverses venue
    const awayId = playingLeg2 ? t.homeId : t.awayId;
    const isFinalLeg = !t.twoLegged || playingLeg2;

    const rep = simulateTickMatch(state, homeId, awayId, { headless: true }).report;
    const leg: CupTie = {
      homeId, awayId, played: true,
      homeGoals: rep.homeGoals, awayGoals: rep.awayGoals,
    };
    t.legs.push(leg);
    reports.push(rep);

    if (isFinalLeg) {
      const { home, away } = tieAggregate(t);
      if (home === away) resolveLevelTie(state, t, leg);
    }
  }

  if (ties.every(tieComplete)) {
    const winners = ties.map(continentalTieWinner);
    const advancing = c.round === 0 ? [...winners, ...c.directQualifiers] : winners;
    if (advancing.length === 1) {
      c.winnerId = advancing[0];
    } else {
      const nextTwoLegged = advancing.length > 2; // every round but the final is two-legged
      const pairs = seededPairs(advancing, c.seedRank, state.clubs);
      c.ties.push(pairs.map(([h, a]) => makeTie(h, a, nextTwoLegged)));
      c.round++;
    }
  }
  return reports;
}

export function continentalRunName(c: Continental, clubId: number): string | null {
  if (c.winnerId === clubId) return 'Winners';
  for (let i = c.ties.length - 1; i >= 0; i--) {
    const tie = c.ties[i].find((t) => t.homeId === clubId || t.awayId === clubId);
    if (tie) return continentalRoundName(c, i);
  }
  if (c.directQualifiers.includes(clubId)) return continentalRoundName(c, 1);
  return null;
}
