/**
 * A stable, per-browser anonymous identifier. Runs are saved against this id so
 * a player can see their own history across sessions without signing in.
 */
const KEY = 'perfectCup.anonymousId';

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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
    // localStorage blocked (private mode etc.) — fall back to an ephemeral id.
    return makeId();
  }
}
