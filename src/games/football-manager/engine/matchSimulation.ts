import type { GameState, MatchReport } from './types';
import { simulateTickMatch } from './tickEngine/sim';

/**
 * Simulate one full match with the tick engine (headless: no replay timeline).
 * Used for every AI fixture and auto-simmed user matches. Does NOT mutate
 * state — apply results via seasonProgression.
 */
export function simulateMatch(state: GameState, homeId: number, awayId: number): MatchReport {
  return simulateTickMatch(state, homeId, awayId, { headless: true }).report;
}

/**
 * Match ratings (per player id) for everyone involved. Tick-engine reports
 * carry event-weighted ratings; older stored reports fall back to the legacy
 * deterministic formula so existing saves keep working.
 */
export function matchRatings(report: MatchReport): Record<number, number> {
  if (report.ratings) return report.ratings;
  const ratings: Record<number, number> = {};
  const goalsBy: Record<number, number> = {};
  for (const e of report.events) {
    if (e.type === 'goal' && e.playerId !== undefined) goalsBy[e.playerId] = (goalsBy[e.playerId] ?? 0) + 1;
  }
  const score = (id: number, isHome: boolean) => {
    const gf = isHome ? report.homeGoals : report.awayGoals;
    const ga = isHome ? report.awayGoals : report.homeGoals;
    const result = gf > ga ? 0.5 : gf < ga ? -0.5 : 0;
    const noise = (((id * 2654435761 + gf * 97 + ga * 31) >>> 0) % 100) / 100 - 0.5; // ±0.5, deterministic
    const raw = 6.6 + result + (goalsBy[id] ?? 0) * 1.1 + noise;
    return Math.round(Math.min(10, Math.max(5.5, raw)) * 10) / 10;
  };
  for (const id of report.homeLineup) ratings[id] = score(id, true);
  for (const id of report.awayLineup) ratings[id] = score(id, false);
  return ratings;
}
