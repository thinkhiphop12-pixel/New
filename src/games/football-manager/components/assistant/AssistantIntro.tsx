'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/engine/types';
import { getAssistant } from '@/engine/assistant';
import CoachPortrait from './CoachPortrait';

/**
 * The first thing a new manager meets: his assistant, saying hello.
 *
 * Before this, a new career opened on a modal headed "How to play" — six
 * slides of interface description, shown to everybody, from nobody. The
 * player who has managed a save before had to dismiss it, and the ten-year
 * old it was written for had no reason to read it, because nothing in the
 * game had yet asked him a question.
 *
 * So the tutorial gets a person and a door. He introduces himself by name
 * (he is on the staff from day one — engine/facilities.ts), asks the one
 * question that decides what happens next, and the answer routes: *yes*
 * goes straight into the game, *no* opens the guided tour. Either way he is
 * still there afterwards behind his button on every screen, which is the
 * thing the old modal never established.
 */
export default function AssistantIntro({
  state,
  onTour,
  onSkip,
}: {
  state: GameState;
  /** Player has not played before — run the guided tour. */
  onTour: () => void;
  /** Player knows the game — straight in. */
  onSkip: () => void;
}) {
  const assistant = getAssistant(state);
  const name = assistant?.name ?? 'Your assistant';
  const club = state.clubs.find((c) => c.id === state.userClubId);

  const line =
    `Morning, gaffer. I'm ${name}, your assistant — I'll be here all season, ` +
    `and there's a button with my face on it on every screen if you get stuck. ` +
    `Before we start: have you played a football manager game before?`;

  /* The line types itself out, the same beat the assistant panel uses, so
     the first thing that happens in a new save is somebody talking rather
     than a wall of text appearing. Skipped entirely under reduced motion. */
  const [typed, setTyped] = useState('');
  const timer = useRef<number | null>(null);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setTyped(line); return; }
    let i = 0;
    const step = () => {
      i += 1;
      setTyped(line.slice(0, i));
      if (i < line.length) timer.current = window.setTimeout(step, 14);
    };
    timer.current = window.setTimeout(step, 14);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [line]);

  const done = typed.length >= line.length;

  return (
    <div className="fm-modal-backdrop">
      <div
        className="fm-modal fm-intro"
        role="dialog"
        aria-modal="true"
        aria-label={`${name}, assistant manager`}
      >
        <div className="fm-intro__who">
          <CoachPortrait coachId={assistant?.id ?? 1} clubColor={club?.color} mood="happy" size={64} />
          <div>
            <p className="fm-intro__name">{name}</p>
            <p className="fm-intro__role">Assistant manager{club ? ` · ${club.name}` : ''}</p>
          </div>
        </div>

        <p className="fm-intro__quote" aria-live="polite">
          &ldquo;{typed}
          {!done && <i className="fm-bubble__caret" aria-hidden="true" />}
          {done && '”'}
        </p>

        {/* Both answers are real answers, not "skip" and "continue" — the
            question was asked in plain words and so are the buttons. */}
        <div className="fm-intro__answers">
          <button type="button" className="fm-btn fm-btn--primary" onClick={onTour}>
            No — show me how it works
          </button>
          <button type="button" className="fm-btn fm-btn--ghost" onClick={onSkip}>
            Yes — I know the basics
          </button>
        </div>
        <p className="fm-intro__foot">
          You can ask for the tour any time from my button in the corner.
        </p>
      </div>
    </div>
  );
}
