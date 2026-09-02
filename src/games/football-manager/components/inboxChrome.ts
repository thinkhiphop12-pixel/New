import type { InboxCategory } from '@/engine/types';
import type { IconName } from './Icon';

/**
 * The icon, label and tint every message-shaped row in the game wears.
 *
 * This lived twice: once in InboxScreen.tsx and once in DaySummaryScreen.tsx,
 * whose copy carried a comment saying it "mirrors InboxScreen's category
 * chrome" while actually painting every row `var(--red)` regardless of
 * category. A day that stopped on five contract expiries therefore rendered
 * five identical red document tiles — the templated-loop look, and the reason
 * the two lists never read as the same component despite being written to be
 * one. Hoisted here so there is a single definition to disagree with.
 */

/** `matchday` is a DaySummary-only pseudo-category (engine/dailyTick.ts) —
 *  the one stop that is never an inbox item, so it has no InboxCategory. */
export type ChromeCategory = InboxCategory | 'matchday';

export const CATEGORY_ICON: Record<ChromeCategory, IconName> = {
  club: 'stadium',
  transfer: 'transfers',
  injury: 'injury',
  contract: 'document',
  youth: 'sprout',
  board: 'target',
  match: 'trophy',
  press: 'mic',
  matchday: 'stadium',
};

export const CATEGORY_LABEL: Record<ChromeCategory, string> = {
  club: 'Club',
  transfer: 'Transfer',
  injury: 'Injury',
  contract: 'Contract',
  youth: 'Youth',
  board: 'Board',
  match: 'Match',
  press: 'Press',
  matchday: 'Matchday',
};

/** Icon-tile tint per category, drawn only from the existing token set — the
 *  original spec's purple is not part of this game's palette, so board/press
 *  take gold and emerald instead. */
export const CATEGORY_TINT: Record<ChromeCategory, string> = {
  club: 'var(--green)',
  transfer: 'var(--blue)',
  injury: 'var(--red)',
  contract: 'var(--gold)',
  youth: 'var(--green-600)',
  board: 'var(--gold-2)',
  match: 'var(--lime)',
  press: 'var(--emerald)',
  matchday: 'var(--gold)',
};
