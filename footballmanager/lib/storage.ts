import type { GameState } from '@/engine/types';

/**
 * Save games live in the browser (one active career per browser). The
 * structure is a plain JSON GameState, so a future Supabase-backed sync can
 * store the exact same blob keyed by anonymous id.
 */
const SAVE_KEY = 'fmlite.save.v1';

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked — the session keeps working, it just won't persist.
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.version !== 1 || !parsed.userClubId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

export function hasSave(): boolean {
  return loadGame() !== null;
}
