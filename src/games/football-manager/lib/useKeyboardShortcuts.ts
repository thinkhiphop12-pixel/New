import { useEffect } from 'react';

/** Registers keydown handlers keyed by `KeyboardEvent.key` (space normalized
 *  to the literal "Space"), ignoring keystrokes while an input/textarea/
 *  contentEditable element has focus. `deps` controls when the listener is
 *  rebuilt, same as a normal `useEffect` dependency array. */
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
