'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { sfx } from '@/lib/sound';
import type { TourStep } from './tourSteps';

/**
 * Coach-marks: the assistant manager standing next to a real control and
 * pointing at it.
 *
 * The game already had a "How to play" modal — seven cards of prose in the
 * middle of a dimmed screen, describing controls the player could not see
 * while reading about them. Feedback was that the game is hard to use and
 * needs "tutorial with arrows etc", which is exactly the gap: text *about*
 * an interface is not the same as being shown where a thing is.
 *
 * So this anchors to the live DOM. Each step names a `data-tour` attribute;
 * we measure that element, cut a hole in the dim layer over it, and float a
 * callout beside it with an arrow pointing back at the hole. Nothing is
 * duplicated or re-drawn — the player is looking at the actual button.
 *
 * Three things this has to survive, all of which the naive version gets
 * wrong:
 *
 *  - **The target may not exist yet.** Tours run across screens, and a step
 *    can fire while its screen is still mounting. Missing targets are
 *    retried on a frame loop for a short grace period, then skipped rather
 *    than stranding the tour on a blank overlay.
 *  - **The target may be off-screen.** Steps scroll their target into view
 *    first and re-measure after the scroll settles.
 *  - **The page can move underneath it.** Resize, scroll and layout shifts
 *    all re-measure, so the spotlight cannot drift off its control.
 */

/** How long to keep looking for a target element before giving up on it. */
const TARGET_GRACE_MS = 1200;
/** Breathing room between the hole and the element inside it. */
const PAD = 8;

type Rect = { top: number; left: number; width: number; height: number };

function readRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** Where the callout sits relative to the hole, given the room available. */
function placeCallout(
  rect: Rect | null,
  vw: number,
  vh: number,
  size: { w: number; h: number },
): { top: number; left: number; side: 'top' | 'bottom' | 'left' | 'right' | 'center' } {
  // No target (an intro step, or a target that never appeared): centre it.
  if (!rect) {
    return { top: Math.max(12, vh / 2 - size.h / 2), left: Math.max(12, vw / 2 - size.w / 2), side: 'center' };
  }
  const gap = 14;
  const below = vh - (rect.top + rect.height);
  const above = rect.top;
  const right = vw - (rect.left + rect.width);

  const clampLeft = (x: number) => Math.min(Math.max(12, x), Math.max(12, vw - size.w - 12));
  const clampTop = (y: number) => Math.min(Math.max(12, y), Math.max(12, vh - size.h - 12));

  // Prefer below, then above — a callout stacked vertically keeps the full
  // width of the control visible, which matters most for wide targets like
  // the action dock or a filter row.
  if (below >= size.h + gap + PAD) {
    return { top: rect.top + rect.height + gap + PAD, left: clampLeft(rect.left + rect.width / 2 - size.w / 2), side: 'top' };
  }
  if (above >= size.h + gap + PAD) {
    return { top: rect.top - size.h - gap - PAD, left: clampLeft(rect.left + rect.width / 2 - size.w / 2), side: 'bottom' };
  }
  // Then sideways, for tall targets like the section rail.
  if (right >= size.w + gap + PAD) {
    return { top: clampTop(rect.top + rect.height / 2 - size.h / 2), left: rect.left + rect.width + gap + PAD, side: 'left' };
  }
  if (rect.left >= size.w + gap + PAD) {
    return { top: clampTop(rect.top + rect.height / 2 - size.h / 2), left: rect.left - size.w - gap - PAD, side: 'right' };
  }
  // Nothing fits beside it — sit under it and let the dim layer do the work.
  return { top: clampTop(vh - size.h - 16), left: clampLeft(vw / 2 - size.w / 2), side: 'center' };
}

export default function CoachMarks({
  steps,
  stepIndex,
  title,
  speaker,
  onStep,
  onFinish,
  finishLabel = 'Got it',
}: {
  steps: TourStep[];
  stepIndex: number;
  /** Tour name, shown small above the step text. */
  title: string;
  /** Who is talking — the assistant's name once one is hired. */
  speaker?: string;
  onStep: (next: number) => void;
  onFinish: () => void;
  finishLabel?: string;
}) {
  const step = steps[stepIndex];
  const [rect, setRect] = useState<Rect | null>(null);
  // `searching` keeps the overlay from flashing a centred callout for one
  // frame while a just-routed screen is still mounting its target.
  const [searching, setSearching] = useState(true);
  const calloutRef = useRef<HTMLDivElement>(null);
  const [calloutSize, setCalloutSize] = useState({ w: 320, h: 190 });
  const [vp, setVp] = useState({ w: 1024, h: 768 });

  // Measure the target, retrying while the screen it lives on mounts.
  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    let raf = 0;
    const started = performance.now();
    setSearching(true);
    setRect(null);

    const look = () => {
      if (cancelled) return;
      if (!step.target) {
        setSearching(false);
        return;
      }
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        // Bring it into view before measuring — a step whose target is below
        // the fold would otherwise spotlight empty space.
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
        setRect(readRect(el));
        setSearching(false);
        return;
      }
      if (performance.now() - started > TARGET_GRACE_MS) {
        // Never block the tour on a control that isn't there — a cup tab
        // after elimination, a button gated behind state the player hasn't
        // reached. The step still shows, just without a spotlight.
        setSearching(false);
        return;
      }
      raf = requestAnimationFrame(look);
    };
    raf = requestAnimationFrame(look);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [step, stepIndex]);

  // Keep the hole glued to its control while the page moves under it.
  const remeasure = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    if (!step?.target) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) setRect(readRect(el));
  }, [step]);

  useLayoutEffect(() => {
    remeasure();
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [remeasure]);

  // The callout's own size feeds the placement maths, so measure it after it
  // renders and re-place if the copy makes it taller than the last step's.
  useLayoutEffect(() => {
    const el = calloutRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCalloutSize((prev) =>
      Math.abs(prev.w - r.width) > 1 || Math.abs(prev.h - r.height) > 1 ? { w: r.width, h: r.height } : prev,
    );
  }, [stepIndex, rect, searching]);

  const last = stepIndex === steps.length - 1;
  const next = useCallback(() => {
    if (last) { sfx.click(); onFinish(); return; }
    sfx.click();
    onStep(stepIndex + 1);
  }, [last, onFinish, onStep, stepIndex]);
  const back = useCallback(() => {
    if (stepIndex === 0) return;
    sfx.click();
    onStep(stepIndex - 1);
  }, [onStep, stepIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onFinish(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [next, back, onFinish]);

  if (!step) return null;

  const hole = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  const pos = placeCallout(hole, vp.w, vp.h, calloutSize);

  return (
    <div className="fm-tour" role="dialog" aria-modal="true" aria-label={`${title}: step ${stepIndex + 1} of ${steps.length}`}>
      {/* The dim layer. A box-shadow spread far larger than the viewport is
          what actually paints the dimming: the element itself is just the
          hole, so the control inside stays at full brightness and is not
          covered by anything that could intercept a click. */}
      {hole ? (
        <div
          className="fm-tour__hole"
          style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
        />
      ) : (
        <div className="fm-tour__scrim" />
      )}

      {/* The arrow. Drawn as its own rotated element pinned to the callout's
          edge, pointing back at the hole it came from. */}
      <div
        ref={calloutRef}
        className={`fm-tour__callout fm-tour__callout--${pos.side}`}
        style={{ top: pos.top, left: pos.left }}
      >
        {pos.side !== 'center' && <span className="fm-tour__arrow" aria-hidden="true" />}

        <div className="fm-tour__head">
          <span className="fm-tour__who">
            <Icon name="staff" size={13} />
            {speaker ?? title}
          </span>
          <span className="fm-tour__count">{stepIndex + 1}/{steps.length}</span>
        </div>

        <p className="fm-tour__title">{step.title}</p>
        <p className="fm-tour__body">{step.body}</p>

        <div className="fm-tour__actions">
          <button type="button" className="fm-btn fm-btn--ghost fm-btn--small" onClick={onFinish}>
            Skip
          </button>
          <span className="fm-tour__spacer" />
          <button
            type="button"
            className="fm-btn fm-btn--ghost fm-btn--small"
            onClick={back}
            disabled={stepIndex === 0}
          >
            Back
          </button>
          <button type="button" className="fm-btn fm-btn--primary fm-btn--small" onClick={next}>
            {last ? finishLabel : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
