'use client';

import { useEffect, useState } from 'react';

/**
 * A module-level record of "this screen has edits the player hasn't applied
 * yet", so the parts of the app that move time forward can see it.
 *
 * Deliberately not React context and deliberately not `GameState`, for the
 * same reasons ToastQueue isn't either: it is transient UI status, it is
 * written by a deeply-nested screen and read by the app shell, and it must
 * never end up serialised into a save file.
 *
 * The one thing this exists to prevent: pressing Next Event with a half-set
 * formation on screen, and having the match kick off against the old one
 * with no warning. The shell asks first, and the answer is the screen's own
 * save or discard — which is why the handlers travel with the flag.
 */

export interface PendingChanges {
  /** What is unsaved, in the player's words: "tactics", "training plan". */
  label: string;
  /** How many edits are outstanding, for the bar's own counter. */
  count: number;
  save: () => void;
  discard: () => void;
}

let current: PendingChanges | null = null;
let listeners: ((p: PendingChanges | null) => void)[] = [];

export function setPendingChanges(next: PendingChanges | null): void {
  current = next;
  for (const l of listeners) l(next);
}

export function getPendingChanges(): PendingChanges | null {
  return current;
}

/** Clear the flag only if it is still the one this screen published — a
 *  screen unmounting after another has already claimed it must not wipe the
 *  newer one. */
export function clearPendingChanges(owned: PendingChanges | null): void {
  if (current === owned) setPendingChanges(null);
}

export function usePendingChanges(): PendingChanges | null {
  const [pending, setPending] = useState<PendingChanges | null>(current);
  useEffect(() => {
    const l = (p: PendingChanges | null) => setPending(p);
    listeners.push(l);
    // Sync once on subscribe: a screen may have published before we mounted.
    setPending(current);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  return pending;
}
