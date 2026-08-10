import type { GameState } from '@/engine/types';
import { getAssistant } from '@/engine/assistant';
import { cooldownWeeksLeft } from '@/engine/boardRequests';

/**
 * Which beats of the opening a save has already been through.
 *
 * Per save slot, in localStorage, for the same reason the old one-shot
 * checklist was: a career is the unit a player experiences onboarding in,
 * and a second career on the same device should not silently skip the
 * introduction because the first one saw it. Kept out of `GameState`
 * deliberately — this is device-local UI history, and GameState is
 * serialised and compressed into every save.
 *
 * Storage can throw (private browsing, quota). Every read fails closed to
 * "already seen": a player who cannot persist the flag is better served by
 * an onboarding they can summon from the assistant button than by one that
 * reintroduces itself on every visit.
 */

export type OnboardingBeat = 'welcome' | 'intro';

function key(beat: OnboardingBeat, slot: number): string {
  return `gaffa-onboarding-${beat}-${slot}`;
}

export function hasSeen(beat: OnboardingBeat, slot: number): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(key(beat, slot)) === 'true';
  } catch {
    return true;
  }
}

export function markSeen(beat: OnboardingBeat, slot: number): void {
  try {
    localStorage.setItem(key(beat, slot), 'true');
  } catch {
    // Not being able to remember is not worth interrupting the player over.
  }
}

/** Wipe the flags for a slot, so a fresh career in it starts from the top. */
export function resetOnboarding(slot: number): void {
  try {
    localStorage.removeItem(key('welcome', slot));
    localStorage.removeItem(key('intro', slot));
    // The pre-existing "How to play" flag, so an upgraded save that already
    // dismissed the old checklist still gets the new introduction.
    localStorage.removeItem(`gaffa-onboarding-seen-${slot}`);
  } catch {
    // ignore
  }
}

/** Has the board turned down an assistant, with the refusal still standing? */
export function assistantRefused(state: GameState): boolean {
  return !getAssistant(state) && cooldownWeeksLeft(state, 'staff', 'assistant') > 0;
}

/**
 * What the opening should show next, or `null` when it is finished with.
 *
 * `welcome` is the appointment and the one job that follows it. `intro` is
 * the payoff, and fires the moment an assistant is actually in post — or,
 * if the chairman refused, once that refusal is on the record, so the tour
 * is never locked behind a decision the player does not control.
 */
export function nextOnboardingBeat(state: GameState, slot: number): 'welcome' | 'hired' | 'refused' | null {
  if (!hasSeen('welcome', slot)) return 'welcome';
  if (hasSeen('intro', slot)) return null;
  if (getAssistant(state)) return 'hired';
  if (assistantRefused(state)) return 'refused';
  return null;
}
