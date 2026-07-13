import type { PlayerCounts } from './types';

/** Event weights for match ratings, ported from the reference sim. */
export const EVENT_WEIGHTS: Record<keyof PlayerCounts, number> = {
  goal: 1,
  assist: 0.6,
  keyPass: 0.15,
  shotOnTarget: 0.1,
  shotOffTarget: -0.05,
  bigChanceMissed: -0.3,
  tackle: 0.08,
  interception: 0.08,
  save: 0.15,
  foulCommitted: -0.1,
  yellowCard: -0.25,
  redCard: -1.5,
};

export function bump(counts: Record<number, PlayerCounts>, playerId: number, key: keyof PlayerCounts, by = 1): void {
  const c = (counts[playerId] ??= {});
  c[key] = (c[key] ?? 0) + by;
}

/**
 * Ratings for everyone who appeared: 6.4 base + weighted events + a small
 * result swing, clamped to 4.5–10. Works live (partial counts) and at FT.
 */
export function ratingsFromCounts(
  counts: Record<number, PlayerCounts>,
  appeared: { home: number[]; away: number[] },
  score: { home: number; away: number }
): Record<number, number> {
  const ratings: Record<number, number> = {};
  const rate = (id: number, gf: number, ga: number) => {
    const result = gf > ga ? 0.4 : gf < ga ? -0.4 : 0;
    let raw = 6.4 + result;
    const c = counts[id];
    if (c) for (const [key, n] of Object.entries(c)) raw += (EVENT_WEIGHTS[key as keyof PlayerCounts] ?? 0) * (n ?? 0);
    ratings[id] = Math.round(Math.min(10, Math.max(4.5, raw)) * 10) / 10;
  };
  for (const id of appeared.home) rate(id, score.home, score.away);
  for (const id of appeared.away) rate(id, score.away, score.home);
  return ratings;
}
