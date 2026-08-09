import type { GameState, MatchReport, Player } from './types';

/**
 * Season-long discipline: bookings accumulate, and enough of them keep a
 * player out of the next match.
 *
 * The tick engine has always shown cards (engine/tickEngine/sim.ts
 * `checkFoul`), but it counted them inside `PlayerCounts` purely to weight
 * that match's ratings and then dropped them at full time — a player could
 * collect a booking in all thirty-eight league games and never miss one. This
 * module is the missing half: it reads the card events off a finished report,
 * banks them on the player, and turns the totals into bans.
 *
 * Only the tick engine emits card events. The lightweight AI-vs-AI simulation
 * (engine/matchSimulation.ts) does not, so in practice discipline is tracked
 * for matches that were actually played out — the user's. That is a real
 * limitation, not a rounding error: it is recorded here rather than papered
 * over with invented bookings for clubs whose matches were never simulated.
 */

/** Yellows per ban. Every multiple of this earns another one-match suspension. */
export const YELLOW_BAN_STEP = 5;

/** A sending-off costs at least this many matches. */
export const RED_BAN_MIN = 1;

/** …and at most this many, for the worst of them. */
export const RED_BAN_MAX = 3;

/** A second yellow is the cheapest way to get sent off — always a single match. */
export const SECOND_YELLOW_BAN = 1;

export function isSuspended(p: Player): boolean {
  return (p.suspendedMatches ?? 0) > 0;
}

/** "Suspended (2 matches)" — the reason string the squad and warning UIs show. */
export function suspensionLabel(p: Player): string {
  const n = p.suspendedMatches ?? 0;
  if (n <= 0) return '';
  return `Suspended — ${n} match${n === 1 ? '' : 'es'} left`;
}

/** How close a player is to a ban, for the "one booking away" warnings. */
export function yellowsUntilBan(p: Player): number {
  const y = p.yellowCards ?? 0;
  return YELLOW_BAN_STEP - (y % YELLOW_BAN_STEP);
}

/**
 * Bank one finished match's cards onto the players who earned them, and turn
 * the new totals into suspensions. Mutates `s` in place, matching the rest of
 * `applyReportStats`'s house style.
 *
 * Returns the bans this report created, so the caller can tell the player
 * about them (the inbox line) rather than having a man quietly become
 * unpickable between screens.
 */
export function applyDiscipline(
  s: GameState,
  report: MatchReport
): { playerId: number; matches: number; reason: 'red' | 'second-yellow' | 'yellows' }[] {
  const bans: { playerId: number; matches: number; reason: 'red' | 'second-yellow' | 'yellows' }[] = [];

  for (const e of report.events) {
    if (e.type !== 'card' || e.playerId === undefined) continue;
    const p = s.players[e.playerId];
    if (!p) continue;

    if (e.card === 'red') {
      p.redCards = (p.redCards ?? 0) + 1;
      // A second booking is still a booking — count it, so the yellow tally
      // stays honest and can itself tip the player over a ban threshold.
      if (e.secondYellow) p.yellowCards = (p.yellowCards ?? 0) + 1;
      const matches = e.secondYellow
        ? SECOND_YELLOW_BAN
        : RED_BAN_MIN + Math.floor(Math.random() * (RED_BAN_MAX - RED_BAN_MIN + 1));
      p.suspendedMatches = (p.suspendedMatches ?? 0) + matches;
      bans.push({ playerId: p.id, matches, reason: e.secondYellow ? 'second-yellow' : 'red' });
      continue;
    }

    if (e.card === 'yellow') {
      const before = p.yellowCards ?? 0;
      const after = before + 1;
      p.yellowCards = after;
      // Crossing a multiple of the step is what earns the ban — so the 5th,
      // 10th and 15th bookings each cost a match, and nothing in between.
      if (Math.floor(after / YELLOW_BAN_STEP) > Math.floor(before / YELLOW_BAN_STEP)) {
        p.suspendedMatches = (p.suspendedMatches ?? 0) + 1;
        bans.push({ playerId: p.id, matches: 1, reason: 'yellows' });
      }
    }
  }

  return bans;
}

/**
 * Serve one match of everyone's suspension at the club that has just played.
 *
 * Called with the clubs involved in a finished match, *after* the ban from
 * that same match has been applied — a man sent off today serves his ban from
 * the next match, not this one, so the count must not tick down on the game he
 * was actually shown the card in. `applyDiscipline` runs first and the players
 * it banned are excluded here via `justBanned`.
 */
export function serveSuspensions(s: GameState, clubIds: number[], justBanned: Set<number>): void {
  for (const clubId of clubIds) {
    const club = s.clubs.find((c) => c.id === clubId);
    if (!club) continue;
    for (const id of club.playerIds) {
      const p = s.players[id];
      if (!p || justBanned.has(id)) continue;
      if ((p.suspendedMatches ?? 0) > 0) p.suspendedMatches = (p.suspendedMatches ?? 0) - 1;
    }
  }
}

/** Wipe the season's disciplinary record. Bans do not carry over a rollover. */
export function resetDiscipline(s: GameState): void {
  for (const p of Object.values(s.players)) {
    if (!p) continue;
    p.yellowCards = 0;
    p.redCards = 0;
    p.suspendedMatches = 0;
  }
}
