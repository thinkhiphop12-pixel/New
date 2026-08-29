import { useEffect } from 'react';

/** Registers keydown handlers keyed by `KeyboardEvent.key` (space normalized
 *  to the literal "Space"), ignoring keystrokes while an input/textarea/
 *  contentEditable element has focus. `deps` controls when the listener is
 *  rebuilt, same as a normal `useEffect` dependency array. */
/** Every full-screen layer the game puts over the hub. A global shortcut
 *  must not fire through one of these: Space on the hub advances the day,
 *  and the training minigame binds Space itself, so playing a rondo was
 *  simulating a day underneath the modal and closing it mid-drill. Anything
 *  that covers the screen belongs on this list. */
const OVERLAY_SELECTOR = [
  '.fm-modal-backdrop',
  '.fm-matchx-modal',
  '.fm-settings-overlay',
  '.fm-assistant-overlay',
  '.fm-contract-overlay',
  '.fm-renewal-overlay',
  '.fm-onboard-step',
  '[role="dialog"]',
].join(',');

/** True while any modal, sheet or overlay is mounted over the game. */
export function isOverlayOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return document.querySelector(OVERLAY_SELECTOR) !== null;
}

export function useKeyboardShortcuts(map: Record<string, (e: KeyboardEvent) => void>, deps: unknown[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const key = e.key === ' ' ? 'Space' : e.key;
      const fn = map[key];
      if (fn) fn(e);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
