'use client';

import { useEffect } from 'react';
import { Icon, type IconName } from '../Icon';
import { sfx } from '@/lib/sound';

/**
 * The first thing a new career shows, and the last thing standing between a
 * player and a game they said was hard to use.
 *
 * There is one instruction on it. Feedback asked for onboarding that opens
 * with "welcome to Gaffa — first you need to hire an assistant manager, then
 * he'll show you around", and that shape is deliberately better than the
 * seven-card overview it replaces: a first-time manager is given one job
 * they can finish in three taps, and the reward for finishing it is a
 * character who then explains everything else. Nothing is memorised up
 * front, because nothing is explained up front.
 *
 * Three moments use this same shell:
 *  - `welcome`  — you have just been appointed; go and hire an assistant.
 *  - `hired`    — he is in post and offering to show you round.
 *  - `refused`  — the board said no, so he cannot introduce himself; the
 *                 tour is offered anyway rather than locking the only
 *                 explanation in the game behind a dice roll.
 */

export type WelcomeStage = 'welcome' | 'hired' | 'refused';

const COPY: Record<
  WelcomeStage,
  { icon: IconName; kicker: string; title: (n: string) => string; body: (n: string, club: string) => string; cta: string; dismiss: string }
> = {
  welcome: {
    icon: 'club',
    kicker: 'Welcome to Gaffa',
    title: (name) => `Welcome, ${name}`,
    body: (_n, club) =>
      `You are the new manager of ${club}. Before anything else, the board expects you to put a backroom team together — and the first appointment is always the same one.\n\nGo and hire an Assistant Manager. He runs the training ground, gives you a read on the youth intake, and tells you what needs doing when you are not sure. Once he is in post he will show you round the rest of the club himself.`,
    cta: 'Take me to Staff',
    dismiss: "I'll find it myself",
  },
  hired: {
    icon: 'staff',
    kicker: 'Assistant Manager appointed',
    title: (name) => `${name} reports for duty`,
    body: (name, club) =>
      `"Good to meet you, boss. ${name} — I've been round ${club} a while, so anything you need, ask.\n\nCome on, I'll walk you round the place. It'll take a minute, and I'll point at things as we go rather than just talking at you."`,
    cta: 'Show me around',
    dismiss: 'Later',
  },
  refused: {
    icon: 'warning',
    kicker: 'No assistant, for now',
    title: () => 'The board said no',
    body: (_n, _club) =>
      "The chairman will not fund an assistant yet — he will hear it again in eight weeks, and a few good results will help.\n\nYou should not have to wait that long to learn the game, so I will show you round in his place. You can replay any of it later from the button in the bottom corner.",
    cta: 'Show me around anyway',
    dismiss: 'Later',
  },
};

export default function WelcomeOverlay({
  stage,
  managerName,
  assistantName,
  clubName,
  onAccept,
  onDismiss,
}: {
  stage: WelcomeStage;
  managerName: string;
  assistantName?: string;
  clubName: string;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const copy = COPY[stage];
  const who = stage === 'hired' ? assistantName ?? 'Your assistant' : managerName;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div className="fm-modal-backdrop" onClick={onDismiss}>
      <div
        className="fm-modal fm-modal-pop fm-welcome"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fm-welcome-title"
      >
        <span className="fm-welcome__kicker">
          <Icon name={copy.icon} size={13} /> {copy.kicker}
        </span>
        <h2 id="fm-welcome-title" className="fm-welcome__title">{copy.title(who)}</h2>
        {copy.body(who, clubName).split('\n\n').map((para, i) => (
          <p key={i} className="fm-welcome__body">{para}</p>
        ))}
        <div className="fm-welcome__actions">
          <button type="button" className="fm-btn fm-btn--ghost fm-btn--small" onClick={onDismiss}>
            {copy.dismiss}
          </button>
          <button
            type="button"
            className="fm-btn fm-btn--primary"
            onClick={() => { sfx.click(); onAccept(); }}
          >
            {copy.cta}
          </button>
        </div>
        {stage === 'welcome' && (
          <p className="fm-welcome__foot">
            Everything here can be explained again later — tap the assistant button in the bottom corner
            on any screen and pick &ldquo;Explain this section&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
