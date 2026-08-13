import { flushSync } from 'react-dom';

/**
 * Run a React state update inside a View Transition.
 *
 * Why `flushSync`: `startViewTransition` snapshots the DOM, calls the
 * callback, then snapshots again and animates between the two. React
 * normally batches state updates and commits them *after* the callback has
 * returned — so without a synchronous flush the browser captures the same
 * frame twice and the transition is a no-op. `flushSync` is safe here
 * specifically because the callback runs outside React's event handling,
 * which is the one place React documents it for.
 *
 * Falls back to a plain update — never a missing one — when the API is
 * absent (Firefox at time of writing) or the player asked for reduced
 * motion. Feature detection is on `document`, not a UA string.
 */

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function supportsViewTransitions(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof (document as ViewTransitionDocument).startViewTransition === 'function'
  );
}

export function withViewTransition(update: () => void): void {
  if (!supportsViewTransitions() || prefersReducedMotion()) {
    update();
    return;
  }

  const doc = document as ViewTransitionDocument;
  try {
    doc.startViewTransition!(() => {
      flushSync(update);
    });
  } catch {
    // A transition can be rejected while another is still running. The
    // state change matters more than the animation, so fall through to a
    // plain update rather than dropping the player's click.
    update();
  }
}
