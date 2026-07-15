import type { GameState, InboxCategory } from './types';

/** Log a full inbox article (headline + body + optional player card) alongside the news ticker. */
export function pushInbox(
  s: GameState,
  item: { category: InboxCategory; title: string; body: string; playerId?: number }
): void {
  s.inbox.unshift({ id: s.nextInboxId++, week: s.week, seasonYear: s.seasonYear, read: false, ...item });
  s.inbox = s.inbox.slice(0, 40);
}

export function markInboxRead(state: GameState, id: number): GameState {
  const s: GameState = structuredClone(state);
  const item = s.inbox.find((i) => i.id === id);
  if (item) item.read = true;
  return s;
}

export function markAllInboxRead(state: GameState): GameState {
  const s: GameState = structuredClone(state);
  for (const item of s.inbox) item.read = true;
  return s;
}
