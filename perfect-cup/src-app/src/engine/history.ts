import type { Run } from './types';

/** Distinct from the standalone prototype's 'perfectCupRuns' key to avoid collisions. */
const STORAGE_KEY = 'perfectCup8Runs';
const MAX_RUNS = 50;

export function loadRuns(): Run[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRun(run: Run): Run[] {
  const runs = [run, ...loadRuns()].slice(0, MAX_RUNS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  return runs;
}

export function clearRuns(): void {
  localStorage.removeItem(STORAGE_KEY);
}
