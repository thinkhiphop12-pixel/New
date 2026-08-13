'use client';

import { useMemo, type CSSProperties } from 'react';

/**
 * The goal set piece.
 *
 * Staged rather than instant — strobe, slammed wordmark, scorer slab, minute
 * chip — because a goal is the emotional peak of the game and the previous
 * version (one word, one pop, a fixed green) spent none of that. Colour comes
 * from the scoring club so it reads as *your* goal; confetti is drawn from
 * the club's own palette with a small share of white for contrast against a
 * dark kit colour.
 *
 * Mounted only while the user's side has just scored, and unmounted by a
 * timer in MatchScreen — nothing here schedules its own teardown.
 */
export default function GoalCelebration({
  scorer,
  minute,
  clubColor = 'var(--green)',
}: {
  scorer?: string;
  /** Match minute, shown as "63'" under the scorer. */
  minute?: number;
  /** The scoring club's colour, used for the wash, the wordmark gradient and
   *  the confetti. Falls back to the theme green when the club has none. */
  clubColor?: string;
}) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.7}s`,
        // Every third piece is white so the burst stays visible when the club
        // colour is dark navy or maroon against an already-dark pitch.
        color: i % 3 === 0 ? '#ffffff' : clubColor,
        // Varying the width stops the burst reading as a uniform grid.
        width: 5 + Math.round(Math.random() * 5),
      })),
    [clubColor],
  );

  return (
    <div className="fm-goal2" style={{ '--goal-color': clubColor } as CSSProperties} role="status" aria-live="polite">
      <div className="fm-goal2__flash" aria-hidden="true" />
      <div className="fm-goal2__wash" aria-hidden="true" />
      {confetti.map((c, i) => (
        <span
          key={i}
          className="fm-confetti"
          aria-hidden="true"
          style={{ left: c.left, animationDelay: c.delay, background: c.color, width: c.width }}
        />
      ))}
      <div className="fm-goal2__inner">
        <span className="fm-goal2__word">GOAL</span>
        {scorer && <span className="fm-goal2__scorer">{scorer}</span>}
        {minute != null && <span className="fm-goal2__minute">{minute}&rsquo;</span>}
      </div>
    </div>
  );
}
