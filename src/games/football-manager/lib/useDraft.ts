'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { setPendingChanges, clearPendingChanges, type PendingChanges } from './pendingChanges';

/**
 * Turns a screen that writes straight through to game state into one with a
 * Save button, without rewriting the screen.
 *
 * Every configuration screen in this game applied edits the instant you made
 * them and said nothing about it — you changed a formation and the only
 * evidence was that the pitch looked different. The feedback that the game
 * "has no notice of confirmation of things" is exactly that, so these
 * screens now edit a draft and commit it on a press.
 *
 * The trick that keeps the change small: a screen written as
 * `({ state, onChange })` only has to rename its own props —
 *
 *     function TacticsScreen({ state: committed, onChange: onCommit }) {
 *       const { draft: state, edit: onChange, ... } = useDraft(committed, onCommit, 'tactics');
 *
 * — and every existing call site inside it goes on working, now against the
 * draft.
 *
 * Three hazards the naive version has, all handled here:
 *
 *  - **The world moves while you are editing.** Advancing a day rewrites
 *    `committed` under the draft. Rather than silently discarding the edits
 *    (or silently overwriting the new day with a stale snapshot), the draft
 *    publishes itself to `pendingChanges` so the action dock can ask first,
 *    and rebases on any external change it did not cause.
 *  - **Walking away.** Navigating to another screen unmounts this one.
 *    Edits are committed on the way out rather than dropped: the player made
 *    them deliberately, and losing them silently would be worse than saving
 *    them. The bar says so, and `discard` is right there.
 *  - **An un-memoised `onCommit`.** The commit handler these screens are
 *    given is a plain function defined in the parent's body, so it is a new
 *    value on every parent render — and the parent re-renders on a debounced
 *    save landing, among other things. Anything that closes over it must not
 *    end up in an effect's dependency list, or the "commit on unmount"
 *    cleanup fires on an ordinary re-render and applies the draft the moment
 *    it is touched. Everything published or scheduled below therefore reads
 *    through refs and keeps a stable identity for the whole mount.
 */
export interface Draft<T> {
  /** The working copy to render and edit. */
  draft: T;
  /** Apply an edit to the draft. Same signature as the old `onChange`. */
  edit: (next: T) => void;
  /** Whether anything is waiting to be applied. */
  dirty: boolean;
  /** How many edits are outstanding, for the save bar's counter. */
  count: number;
  /** Commit the draft to real game state. */
  save: () => void;
  /** Throw the draft away and go back to what is actually saved. */
  discard: () => void;
}

export function useDraft<T>(
  committed: T,
  onCommit: (next: T) => void,
  /** What is being edited, in the player's words: "tactics", "training plan". */
  label: string,
): Draft<T> {
  const [draft, setDraft] = useState<T>(committed);
  const [count, setCount] = useState(0);

  // The last `committed` value we know about, so an incoming change can be
  // told apart from the one our own save just caused.
  const seen = useRef(committed);
  // Live values for the stable callbacks below, which are created once and
  // must not close over a stale render.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const countRef = useRef(count);
  countRef.current = count;
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  // Stable for the whole mount — see the third hazard above.
  const save = useCallback(() => {
    if (countRef.current === 0) return;
    const next = draftRef.current;
    seen.current = next;
    setCount(0);
    commitRef.current(next);
  }, []);

  const discard = useCallback(() => {
    setDraft(seen.current);
    setCount(0);
  }, []);

  const edit = useCallback((next: T) => {
    setDraft(next);
    setCount((n) => n + 1);
  }, []);

  // Rebase on anything that changed the world from outside this screen — a
  // day advancing, the assistant handling a job. Our own commits set `seen`
  // first, so they never look external.
  useEffect(() => {
    if (committed === seen.current) return;
    seen.current = committed;
    setDraft(committed);
    setCount(0);
  }, [committed]);

  // Publish/retract the flag the action dock reads. `save`/`discard` are
  // stable, so this only re-runs when the count actually changes.
  useEffect(() => {
    if (count === 0) {
      setPendingChanges(null);
      return;
    }
    const mine: PendingChanges = { label, count, save, discard };
    setPendingChanges(mine);
    return () => clearPendingChanges(mine);
  }, [count, label, save, discard]);

  // On the way out, commit rather than drop. Empty deps: this cleanup must
  // run on unmount and on nothing else.
  useEffect(() => () => { save(); }, [save]);

  return { draft, edit, dirty: count > 0, count, save, discard };
}
