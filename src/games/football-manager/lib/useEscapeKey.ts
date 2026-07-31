import { useEffect } from 'react';

/**
 * Calls `onEscape` while `active` is true and the user presses Escape.
 *
 * Overlays in this game (the pocket "More" menu, the modals) previously had no
 * keyboard dismissal at all — the only way out was the one button that closed
 * them. Anything that can be opened should be closable the standard way.
 */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, onEscape]);
}
