/**
 * A stable, per-browser anonymous identifier. Runs are saved against this id so
 * a player can see their own history across sessions without signing in.
 */
const KEY = 'perfectCup.anonymousId';

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// One fallback id per tab, used when localStorage is unavailable, so every
// caller in the session agrees on the same identity (instead of minting a new
// id per call, which would scatter runs under ids that reads never query).
let memoryId: string | null = null;

export function getAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = makeId();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // localStorage blocked (private mode etc.) — use a stable in-memory id.
    if (!memoryId) memoryId = makeId();
    return memoryId;
  }
}
