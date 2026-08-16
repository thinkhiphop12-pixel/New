import type { GameState, InboxActionKind, InboxCategory } from './types';

/** Log a full inbox article (headline + body + optional player card) alongside the news ticker. */
export function pushInbox(
  s: GameState,
  item: { category: InboxCategory; title: string; body: string; playerId?: number; kind?: InboxActionKind }
): void {
  s.inbox.unshift({ id: s.nextInboxId++, week: s.week, seasonYear: s.seasonYear, read: false, ...item });
  s.inbox = s.inbox.slice(0, 40);
}

/**
 * Drop the outstanding action items of one kind for one player, in place.
 *
 * An action item is a request for a decision, so it should not outlive the
 * decision. "X's contract expires in the summer" stayed in the inbox — and
 * therefore in Needs Your Attention, and in the unread badge — after the
 * contract had been renewed, which is what made delegating a pile of
 * renewals to the assistant look like it had done nothing: eight items in,
 * eight items still there, all of them now describing something that was no
 * longer true.
 *
 * Called wherever the underlying question gets settled, by whichever route.
 */
export function clearInboxAction(s: GameState, playerId: number, kind: InboxActionKind): void {
  s.inbox = s.inbox.filter((i) => !(i.kind === kind && i.playerId === playerId));
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
