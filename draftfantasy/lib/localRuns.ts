import type { Run } from '@/engine/types';

/**
 * Local cache of full Run objects. Used as an offline-first fallback so the game
 * still records history when Supabase is unreachable or not yet provisioned.
 */
const STORAGE_KEY = 'perfectCup8Runs';
const MAX_RUNS = 100;

export function loadLocalRuns(): Run[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalRun(run: Run): Run[] {
  const runs = [run, ...loadLocalRuns().filter((r) => r.id !== run.id)].slice(0, MAX_RUNS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch {
    // storage full or blocked — non-fatal
  }
  return runs;
}

export function clearLocalRuns(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
