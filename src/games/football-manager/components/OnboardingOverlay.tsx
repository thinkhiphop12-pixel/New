'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from './Icon';
import type { GameState } from '@/engine/types';
import { getAssistant } from '@/engine/assistant';
import CoachPortrait from './assistant/CoachPortrait';
import type { ScreenId } from './hubNav';

/** Gap 20 (Userbrain): there is no onboarding at all, and the report's
 *  repeated "what do I do?" traces straight back to that — a first-time
 *  player lands on the Hub with no orientation to the screens that matter
 *  (Squad, Tactics, Transfers) or to the control that actually advances the
 *  game. Reachable two ways: automatically once per save on first entering
 *  the Hub, and any time after via the header's "?" button — so it's a
 *  reference a player can come back to, not just a one-shot interruption.
 *  A step-through (one thing at a time, Next/Back) rather than a wall of
 *  four items at once, reusing the existing `.fm-modal` shell. */

/** Exported so the Assistant Manager panel can reuse this same copy as its
 *  per-screen "what is this" line, instead of maintaining a second set of
 *  explainer text that would drift from the tour. */
export const STEPS: { icon: IconName; title: string; body: string; route?: ScreenId }[] = [
  {
    icon: 'squad',
    title: 'Six buttons, that\u2019s it',
    body: 'Home, Squad, Training, Market, Club and League. Every screen in the game is behind one of those six \u2014 nothing is hidden anywhere else.',
  },
  {
    icon: 'tactics',
    title: 'Pick your team',
    body: 'Squad shows you your players. Tactics is where you choose the eleven who start and how you want them to play. Do this before every match.',
    route: 'tactics',
  },
  {
    icon: 'training',
    title: 'Make them better',
    body: 'The squad trains twice a week and you pick what they work on. Work them hard and they improve faster \u2014 and get more tired.',
    route: 'training',
  },
  {
    icon: 'fitness',
    title: 'Don\u2019t run them into the ground',
    body: 'Fitness is what\u2019s left in the legs. Anyone in the red is knackered \u2014 rest him, or he plays badly and picks up an injury.',
    route: 'fitness',
  },
  {
    icon: 'sprout',
    title: 'The kids',
    body: "Once a year a few young lads turn up on trial. I'll tell you what I think of each one \u2014 you decide who's worth a contract.",
    route: 'academy',
  },
  {
    icon: 'target',
    title: 'Keep the suits happy',
    body: "The board set you a target at the start of the season and pay for anything you want to buy. Miss the target for long enough and they'll sack you.",
    route: 'board',
  },
  {
    icon: 'transfers',
    title: 'Buying and selling',
    body: "Agree a fee with his club, then agree wages with him. They say no the first time almost every time \u2014 go again with a bit more. Short of money? A loan costs far less.",
    route: 'transfers',
  },
  {
    icon: 'play',
    title: 'Then press the big button',
    body: "That's how time moves. It jumps straight to the next thing that needs you \u2014 a match, a bid, a decision \u2014 and stops there.",
  },
];

export function onboardingKey(slot: number): string {
  return `gaffa-onboarding-seen-${slot}`;
}

export function hasSeenOnboarding(slot: number): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(onboardingKey(slot)) === 'true';
  } catch {
    return true;
  }
}

export function markOnboardingSeen(slot: number): void {
  try {
    localStorage.setItem(onboardingKey(slot), 'true');
  } catch {
    // Storage can be unavailable (private mode, quota) — not seeing the
    // checklist again isn't worth surfacing an error for.
  }
}

export default function OnboardingOverlay({
  slot,
  state,
  onClose,
  onGoTo,
}: {
  slot: number;
  /** Optional: with it, the tour is delivered by the assistant rather than
   *  by an anonymous "How to play" dialog. */
  state?: GameState;
  onClose: () => void;
  /** Optional: lets a step's "Go there" button jump straight to the Hub
   *  screen it's describing, instead of just dismissing the overlay. */
  onGoTo?: (route: ScreenId) => void;
}) {
  const assistant = state ? getAssistant(state) : undefined;
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
      else if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, STEPS.length - 1));
      else if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    markOnboardingSeen(slot);
    onClose();
  };

  return (
    <div className="fm-modal-backdrop" onClick={dismiss}>
      <div
        className="fm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        style={{ maxWidth: 400, padding: 20 }}
      >
        {/* The tour is somebody showing you round, not a manual. Same
            steps, delivered by the man who is going to be giving you this
            advice all season. */}
        <div className="fm-onboard-who">
          {assistant && <CoachPortrait coachId={assistant.id} mood="happy" size={40} />}
          <h2 id="onboarding-title" className="fm-onboard-who__title">
            {assistant ? `${assistant.name} shows you round` : 'How to play'}
            <span className="fm-onboard-who__step">Step {step + 1} of {STEPS.length}</span>
          </h2>
        </div>

        {/* Step dots double as jump-to-step controls — tapping ahead is fine,
            this is a reference, not a forced sequence. */}
        <div className="fm-onboard-dots" role="tablist" aria-label="Steps">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === step}
              aria-label={s.title}
              className={`fm-onboard-dot${i === step ? ' active' : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <div className="fm-onboard-step">
          <span className="fm-icon-tile" style={{ flexShrink: 0 }}>
            <Icon name={current.icon} size={20} />
          </span>
          <div>
            <span style={{ display: 'block', fontWeight: 800, fontSize: 15 }}>{current.title}</span>
            <span className="fm-hint" style={{ textAlign: 'left', margin: '4px 0 0' }}>{current.body}</span>
          </div>
        </div>

        <div className="fm-actions" style={{ marginBottom: 0, justifyContent: 'space-between' }}>
          <button
            type="button"
            className="fm-btn fm-btn--ghost fm-btn--small"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
          >
            Back
          </button>
          {current.route && onGoTo && (
            <button
              type="button"
              className="fm-btn fm-btn--ghost fm-btn--small"
              onClick={() => {
                markOnboardingSeen(slot);
                onGoTo(current.route!);
                onClose();
              }}
            >
              Show me
            </button>
          )}
          {last ? (
            <button type="button" className="fm-btn fm-btn--primary fm-btn--small" onClick={dismiss}>
              Right, let&rsquo;s go
            </button>
          ) : (
            <button type="button" className="fm-btn fm-btn--primary fm-btn--small" onClick={() => setStep((s) => s + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
