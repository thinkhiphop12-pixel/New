'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Screens are swapped in-place (no page navigation), so the browser keeps
 * whatever scroll position the previous screen was left at — a user who
 * scrolled down the club list would land mid-page on the hub, with the nav
 * scrolled out of view. Reset whenever `dep` changes.
 *
 * Which element actually scrolls depends on the layout: in landscape the
 * shell is fixed and `.fm-main` is the scroller; in portrait/desktop the page
 * itself scrolls. Resetting both means no mode detection is needed —
 * whichever one isn't the scroller is a no-op.
 */
export function useScrollReset(pane: RefObject<HTMLElement | null>, dep: unknown) {
  useEffect(() => {
    pane.current?.scrollTo({ top: 0 });
    window.scrollTo(0, 0);
  }, [pane, dep]);
}
