'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Roll a number toward its new value instead of snapping to it.
 *
 * This exists because of the finding in UX_AUDIT.md: the sim moves a dozen
 * values every time the clock advances (sharpness, fitness, morale, balance,
 * attributes) and the player sees none of it happen — the numbers are simply
 * different the next time they look. A value that visibly travels, in a
 * colour that says which way it went, converts an invisible system into a
 * felt one, which is the cheapest "this club is alive" signal available.
 *
 * Returns the display value plus the direction of the most recent change so
 * the caller can hang `.fm-num--up` / `.fm-num--down` (app/motion.css) on it.
 *
 * The first render does NOT animate: mounting a screen should show its real
 * numbers immediately, not roll every stat up from zero.
 */

export type CountDirection = 'up' | 'down' | null;

export interface CountUpResult {
  /** The value to render this frame. */
  value: number;
  /** Direction of the latest change, or null if it has not changed yet. */
  direction: CountDirection;
  /** Signed difference of the latest change, for a `+5` / `−4` badge. */
  delta: number;
  /**
   * Increments once per real change. Use it as a React `key` on the element
   * carrying the flash class: a CSS animation only replays when the element
   * is remounted, so two consecutive rises would otherwise flash once and
   * then sit silent on every later change in the same direction.
   */
  changeKey: number;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function useCountUp(
  target: number,
  { duration = 420, decimals = 0 }: { duration?: number; decimals?: number } = {},
): CountUpResult {
  const [value, setValue] = useState(target);
  const [direction, setDirection] = useState<CountDirection>(null);
  const [delta, setDelta] = useState(0);
  const [changeKey, setChangeKey] = useState(0);

  // The value we are animating away from, the value currently painted, and
  // whether we have ever run. `displayRef` has to be tracked separately from
  // `fromRef`: when a roll is interrupted the next one must start from what
  // the player can see, not from the target the last roll never reached.
  const fromRef = useRef(target);
  const displayRef = useRef(target);
  const mountedRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;

    // First commit, or no real change — adopt the value silently.
    if (!mountedRef.current || from === target) {
      mountedRef.current = true;
      fromRef.current = target;
      displayRef.current = target;
      setValue(target);
      return;
    }

    setDirection(target > from ? 'up' : 'down');
    setDelta(target - from);
    setChangeKey((k) => k + 1);

    if (prefersReducedMotion() || duration <= 0) {
      fromRef.current = target;
      displayRef.current = target;
      setValue(target);
      return;
    }

    const start = performance.now();
    const span = target - from;
    const round = (n: number) => {
      const f = 10 ** decimals;
      return Math.round(n * f) / f;
    };

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Matches --ease-out-expo in app/motion.css, so the digits and the
      // colour flash they sit inside settle on the same curve.
      const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
      const next = round(from + span * eased);
      displayRef.current = next;
      setValue(next);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
        // Interrupted mid-roll (the value changed again, or the screen
        // unmounted): the next roll starts from what the player can actually
        // see. Only on a real interruption — a completed roll has already
        // set `fromRef` to the target it landed on.
        fromRef.current = displayRef.current;
      }
    };
  }, [target, duration, decimals]);

  return { value, direction, delta, changeKey };
}
