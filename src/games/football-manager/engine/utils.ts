/** Sample from a Poisson distribution (Knuth). Lambda capped for sanity. */
export function poisson(lambda: number, rand: () => number = Math.random): number {
  const l = Math.exp(-Math.min(lambda, 6));
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > l);
  return k - 1;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function pickRandom<T>(arr: T[], rand: () => number = Math.random): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** Pick an index weighted by the given weights. */
export function weightedIndex(weights: number[], rand: () => number = Math.random): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export function formatMoney(v: number): string {
  if (Math.abs(v) >= 1_000_000) {
    const m = v / 1_000_000;
    return `£${m >= 10 ? Math.round(m) : Math.round(m * 10) / 10}M`;
  }
  if (Math.abs(v) >= 1_000) return `£${Math.round(v / 1_000)}K`;
  return `£${v}`;
}

/** Weekly wage for a player — must stay in sync with scripts/build-gamedata.mjs. */
export function weeklyWage(value: number, rating: number): number {
  return Math.max(500, Math.round((value * 0.0005 + rating * 15) / 100) * 100);
}

/** Market value formula — must stay in sync with scripts/build-gamedata.mjs. */
export function marketValue(rating: number, age: number): number {
  const base = 50_000 * Math.pow(1.135, rating - 50);
  const ageMult = age <= 23 ? 1.35 : age <= 28 ? 1.1 : age <= 31 ? 0.8 : 0.5;
  const v = base * ageMult;
  const step = v > 20e6 ? 1e6 : v > 2e6 ? 250e3 : 50e3;
  return Math.max(100_000, Math.round(v / step) * step);
}

/* --- Contract windows -----------------------------------------------------
 * Real contracts always lapse at a transfer-window boundary — 31 January or
 * 30 June — never some random midweek date. Summer endings are far more common
 * than January ones because most deals are signed for whole seasons.
 * A season labelled `seasonYear` runs Jul(seasonYear-1) → Jun(seasonYear), so
 * "N seasons left" lands on 30 Jun of `seasonYear + N`.
 */

/** Build a window boundary date as an ISO `YYYY-MM-DD` string. */
export function contractWindowDate(year: number, summer: boolean): string {
  return summer ? `${year}-06-30` : `${year}-01-31`;
}

/** Contract expiry for a deal with `years` seasons left, run from `seasonYear`. */
export function contractEndFor(seasonYear: number, years: number, rand: () => number = Math.random): string {
  const summer = rand() < 0.78;
  const target = seasonYear + Math.max(0, Math.round(years));
  // A January window inside the target season lands in the calendar year after
  // the summer one it replaces would have been reached from.
  return contractWindowDate(summer ? target : target + 1, summer);
}

/** Set `contractYears` and keep the window-snapped `contractEnd` in step. */
export function setContractYears(
  p: { contractYears: number; contractEnd: string },
  seasonYear: number,
  years: number,
  rand: () => number = Math.random
): void {
  p.contractYears = years;
  p.contractEnd = contractEndFor(seasonYear, years, rand);
}

/** Personal retirement age: 35–43 outfield, 35–47 for keepers, skewed young so
 *  the evergreen 43/47 careers stay rare (mirrors their `playerRetireAge`). */
export function rollRetireAge(isGK: boolean, rand: () => number = Math.random): number {
  const span = isGK ? 12 : 8;
  return 35 + Math.round(Math.pow(rand(), 1.5) * span);
}
