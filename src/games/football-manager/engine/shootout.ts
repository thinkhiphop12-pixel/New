/**
 * Penalty shootout — replaces the `Math.random() < 0.5` coin flip that used
 * to decide drawn knockout ties (gap 27). Pure and deterministic given a
 * seeded RNG isn't plumbed through, so it uses `Math.random()` like the rest
 * of the tick engine.
 *
 * Taker order: reuses `setPieceTaker(..., 'penalty')` for the #1 spot (the
 * side's actual designated penalty taker, same as an open-play penalty) —
 * per the brief, this file does not re-derive a second picker. The rest of
 * the order is filled out by finishing ability (`sho`), best first, which is
 * how a real shootout sheet reads: your best taker first, then descending
 * quality, keeper included only if outfield options run out.
 */
import type { Player, ShootoutKick, ShootoutResult, Tactics } from './types';
import { setPieceTaker } from './setPieces';

/** Conversion probability for one kick: taker's finishing vs keeper's reflexes. */
function conversionRate(taker: Player, gk: Player | null): number {
  const shoot = taker.sho ?? 65;
  const reflex = gk?.gkReflexes ?? 65;
  return 0.73 + (shoot - 65) / 65 * 0.12 - (reflex - 65) / 65 * 0.08;
}

function kickOutcome(taker: Player, gk: Player | null): 'scored' | 'saved' | 'missed' {
  const conv = Math.max(0.35, Math.min(0.95, conversionRate(taker, gk)));
  const r = Math.random();
  if (r < conv) return 'scored';
  if (r < conv + 0.14) return 'saved';
  return 'missed';
}

/**
 * Pick and order five takers from a side's XI: the designated penalty taker
 * first (via `setPieceTaker`), then the rest of the outfield by `sho`
 * descending. Falls back to whoever is on the pitch (including the keeper)
 * if fewer than five outfield players remain — a side reduced by red cards
 * still has to take penalties.
 */
export function pickShootoutTakers(xi: Player[], tac: Tactics): Player[] {
  const designated = setPieceTaker(xi, tac, 'penalty');
  const outfield = xi.filter((p) => p.pos !== 'GK');
  const rest = outfield.filter((p) => p.id !== designated?.id).sort((a, b) => (b.sho ?? 50) - (a.sho ?? 50));
  const ordered = designated ? [designated, ...rest] : rest;
  if (ordered.length >= 5) return ordered.slice(0, 5);
  // Not enough outfield takers — pad with whoever else is on the pitch (GK last resort).
  const extras = xi.filter((p) => !ordered.some((o) => o.id === p.id));
  return [...ordered, ...extras].slice(0, Math.max(1, Math.min(5, xi.length)));
}

/**
 * Run a full shootout: five rounds alternating home/away (with early finish
 * once the result is mathematically decided), then sudden death cycling
 * through each side's taker list until someone is left standing. Always
 * terminates and always returns exactly one winner.
 */
export function runShootout(
  homeXI: Player[],
  awayXI: Player[],
  homeTactics: Tactics,
  awayTactics: Tactics,
  homeId: number,
  awayId: number
): ShootoutResult {
  const homeGK = homeXI.find((p) => p.pos === 'GK') ?? null;
  const awayGK = awayXI.find((p) => p.pos === 'GK') ?? null;
  const homeTakers = pickShootoutTakers(homeXI, homeTactics);
  const awayTakers = pickShootoutTakers(awayXI, awayTactics);

  const kicks: ShootoutKick[] = [];
  let homeScore = 0;
  let awayScore = 0;

  const take = (isHome: boolean, taker: Player, round: number) => {
    const gk = isHome ? awayGK : homeGK;
    const outcome = kickOutcome(taker, gk);
    if (outcome === 'scored') { if (isHome) homeScore++; else awayScore++; }
    kicks.push({ side: isHome ? 'home' : 'away', playerId: taker.id, playerName: taker.name, outcome, round });
  };

  // Regulation five rounds, with early finish once the outcome is settled
  // mathematically (a side can no longer be caught, e.g. 3-0 up with two
  // kicks left for the other side).
  for (let round = 0; round < 5; round++) {
    const hTaker = homeTakers[round % homeTakers.length];
    if (hTaker) take(true, hTaker, round);

    const hLeftAfterThis = 5 - (round + 1);
    const homeUncatchable = homeScore > awayScore + hLeftAfterThis;
    if (homeUncatchable) break;

    const aTaker = awayTakers[round % awayTakers.length];
    if (aTaker) take(false, aTaker, round);

    const awayUncatchable = awayScore > homeScore + hLeftAfterThis;
    if (awayUncatchable) break;
  }

  // Sudden death: cycle each side's taker list until scores differ after an
  // equal number of kicks. Hard safety cap guarantees termination even in
  // the astronomically unlikely case of a very long tie.
  let sd = 0;
  while (homeScore === awayScore && sd < 100) {
    const hTaker = homeTakers[sd % homeTakers.length];
    const aTaker = awayTakers[sd % awayTakers.length];
    if (!hTaker || !aTaker) break;
    take(true, hTaker, 5 + sd);
    take(false, aTaker, 5 + sd);
    sd++;
  }

  const winnerId = homeScore === awayScore
    ? (Math.random() < 0.5 ? homeId : awayId) // safety-valve fallback, practically unreachable
    : homeScore > awayScore ? homeId : awayId;

  return { homeScore, awayScore, winnerId, kicks };
}
