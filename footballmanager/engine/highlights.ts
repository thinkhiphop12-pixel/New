import type { MatchEvent, MatchReport } from './types';

/**
 * Fraction of 'chance' events worth keeping in the highlights reel, based on
 * how tight the final scoreline is. Blowouts get a lean reel; tight games
 * keep almost every near-miss since each one still felt like it mattered.
 */
function chanceKeepRate(report: MatchReport): number {
  const diff = Math.abs(report.homeGoals - report.awayGoals);
  if (diff >= 3) return 0.3;
  if (diff === 2) return 0.6;
  return 0.9;
}

/**
 * Context-aware highlight reel: goals, cards and injuries always survive;
 * near-miss 'chance' events are thinned out using an evenly-spaced sampler
 * (deterministic given the report, so the reel doesn't jitter on rerender).
 */
export function computeHighlights(report: MatchReport): MatchEvent[] {
  const rate = chanceKeepRate(report);
  let chanceIdx = 0;
  return report.events.filter((e) => {
    if (e.type !== 'chance') return true;
    chanceIdx++;
    return Math.floor(chanceIdx * rate) > Math.floor((chanceIdx - 1) * rate);
  });
}
