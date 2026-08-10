'use client';

import { useMemo } from 'react';

/** Reuses the .fm-goal-flash / fm-goal-fade / fm-goal-pop keyframes that
 *  shipped in Phase 14 but had nothing wired to them yet, plus a CSS-only
 *  confetti burst (app/globals.css .fm-confetti). Mounted only while the
 *  user's side has just scored. */
export default function GoalCelebration({ scorer }: { scorer?: string }) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.6}s`,
        hue: Math.floor(Math.random() * 360),
      })),
    []
  );

  return (
    <div className="fm-goal-flash" style={{ '--goal-color': 'var(--green)' } as React.CSSProperties}>
      {confetti.map((c, i) => (
        <span
          key={i}
          className="fm-confetti"
          style={{ left: c.left, animationDelay: c.delay, background: `hsl(${c.hue} 90% 60%)` }}
        />
      ))}
      <div className="fm-goal-flash__text">
        GOAL!
        {scorer && <div style={{ fontSize: '0.4em', marginTop: 4 }}>{scorer}</div>}
      </div>
    </div>
  );
}
