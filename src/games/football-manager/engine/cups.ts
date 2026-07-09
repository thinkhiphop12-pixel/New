import type { CupTie, GameState, Knockout, MatchReport } from './types';
import { simulateMatch } from './matchSimulation';

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeTies(clubIds: number[]): CupTie[] {
  const ties: CupTie[] = [];
  for (let i = 0; i + 1 < clubIds.length; i += 2) {
    ties.push({ homeId: clubIds[i], awayId: clubIds[i + 1], played: false, homeGoals: 0, awayGoals: 0 });
  }
  return ties;
}

/**
 * Create a knockout competition. If the entrant count isn't a power of two,
 * `byeCount` clubs (randomly drawn) skip straight into round 2.
 */
export function createKnockout(name: string, weeks: number[], clubIds: number[], byeCount = 0): Knockout {
  const pool = shuffled(clubIds);
  const byes = pool.slice(0, byeCount);
  return {
    name,
    weeks,
    rounds: [makeTies(pool.slice(byeCount))],
    byes,
    round: 0,
    winnerId: null,
  };
}

export function tieWinner(t: CupTie): number {
  if (!t.played) return 0;
  if (t.homeGoals > t.awayGoals) return t.homeId;
  if (t.awayGoals > t.homeGoals) return t.awayId;
  return t.pensWinnerId ?? t.homeId;
}

/** True when the competition has a round scheduled at or before this week. */
export function knockoutRoundDue(k: Knockout, week: number): boolean {
  return k.winnerId === null && k.round < k.weeks.length && k.weeks[k.round] <= week;
}

export function isClubAlive(k: Knockout, clubId: number): boolean {
  if (k.winnerId !== null) return k.winnerId === clubId;
  if (k.byes.includes(clubId) && k.round === 0) return true;
  const current = k.rounds[k.round];
  return current ? current.some((t) => t.homeId === clubId || t.awayId === clubId) : false;
}

export function userTieThisRound(k: Knockout, clubId: number): CupTie | null {
  const current = k.rounds[k.round];
  return current?.find((t) => t.homeId === clubId || t.awayId === clubId) ?? null;
}

/** Human name for a round, based on how many clubs are still in it. */
export function roundName(k: Knockout, roundIndex: number): string {
  const roundsLeft = k.weeks.length - roundIndex;
  if (roundsLeft === 1) return 'Final';
  if (roundsLeft === 2) return 'Semi-final';
  if (roundsLeft === 3) return 'Quarter-final';
  if (roundsLeft === 4) return 'Round of 16';
  if (roundsLeft === 5) return 'Round of 32';
  return 'First Round';
}

/**
 * Play the current round in place (mutates `k`). Returns simulated reports so
 * the caller can harvest player stats.
 */
export function playKnockoutRound(state: GameState, k: Knockout): MatchReport[] {
  const ties = k.rounds[k.round];
  if (!ties) return [];
  const reports: MatchReport[] = [];
  for (const tie of ties) {
    if (tie.played) continue;
    const rep = simulateMatch(state, tie.homeId, tie.awayId);
    tie.homeGoals = rep.homeGoals;
    tie.awayGoals = rep.awayGoals;
    tie.played = true;
    if (tie.homeGoals === tie.awayGoals) {
      tie.pensWinnerId = Math.random() < 0.5 ? tie.homeId : tie.awayId;
    }
    reports.push(rep);
  }
  const winners = ties.map(tieWinner);
  const advancing = k.round === 0 ? [...winners, ...k.byes] : winners;
  if (advancing.length === 1) {
    k.winnerId = advancing[0];
  } else {
    k.rounds.push(makeTies(shuffled(advancing)));
  }
  k.round++;
  return reports;
}

/** How far a club got, e.g. "Winners" or "Semi-final". Null if it never entered. */
export function clubRunName(k: Knockout, clubId: number): string | null {
  if (k.winnerId === clubId) return 'Winners';
  for (let i = k.rounds.length - 1; i >= 0; i--) {
    const tie = k.rounds[i].find((t) => t.homeId === clubId || t.awayId === clubId);
    if (tie) return roundName(k, i);
  }
  if (k.byes.includes(clubId)) return roundName(k, 1);
  return null;
}
