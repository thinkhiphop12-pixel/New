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

/** Market value formula — must stay in sync with scripts/build-gamedata.mjs. */
export function marketValue(rating: number, age: number): number {
  const base = 50_000 * Math.pow(1.135, rating - 50);
  const ageMult = age <= 23 ? 1.35 : age <= 28 ? 1.1 : age <= 31 ? 0.8 : 0.5;
  const v = base * ageMult;
  const step = v > 20e6 ? 1e6 : v > 2e6 ? 250e3 : 50e3;
  return Math.max(100_000, Math.round(v / step) * step);
}
