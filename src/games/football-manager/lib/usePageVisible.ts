import { useEffect, useState } from 'react';

/** True while the tab is in the foreground.
 *
 *  `requestAnimationFrame` loops do not need this — browsers already suspend
 *  rAF callbacks in a hidden tab. Timer-driven loops do: `setTimeout` and
 *  `setInterval` are only throttled to roughly one second in a background
 *  tab, they are not stopped. Anything that advances *game state* on a timer
 *  will therefore keep running while nobody is watching, which is the thing
 *  this hook exists to prevent. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  return visible;
}

/** Imperative form, for loops that live outside the React tree (the hold-to-
 *  continue loop is a plain async `while`, not an effect). Calls `onHide` the
 *  moment the tab goes to the background; returns an unsubscribe. */
export function onPageHidden(onHide: () => void): () => void {
  const handler = () => {
    if (document.hidden) onHide();
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
