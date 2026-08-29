'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from './Icon';
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
    title: 'Six sections',
    body: 'Home, Squad, Training, Market, Club and League — every screen in the game lives under one of these six.',
  },
  {
    icon: 'tactics',
    title: 'Squad & Tactics',
    body: 'Pick your lineup and set the formation, identity and mentality here before kickoff.',
    route: 'tactics',
  },
  {
    icon: 'training',
    title: 'Team training',
    body: 'Two sessions a week — pick what each one drills. One-to-one gives four players guaranteed individual progress.',
    route: 'training',
  },
  {
    icon: 'sprout',
    title: 'Academy',
    body: 'Every pre-season a handful of trialists report in. Your assistant gives a verdict and a predicted ceiling — sign the ones worth keeping.',
    route: 'academy',
  },
  {
    icon: 'target',
    title: 'The board',
    body: "Staff hires and facility upgrades need the board's sign-off first — ask, and they'll fund what they trust you with.",
    route: 'board',
  },
  {
    icon: 'transfers',
    title: 'Transfers',
    body: 'Sign, loan or sell players. Realistic targets for your budget sort to the top.',
    route: 'transfers',
  },
  {
    icon: 'play',
    title: 'Next event',
    body: 'This is how time moves — it skips straight to the next thing that needs you, including matchday.',
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
  onClose,
  onGoTo,
}: {
  slot: number;
  onClose: () => void;
  /** Optional: lets a step's "Go there" button jump straight to the Hub
   *  screen it's describing, instead of just dismissing the overlay. */
  onGoTo?: (route: ScreenId) => void;
}) {
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
        <div className="fm-modal__header">
          <h2 id="onboarding-title" style={{ margin: 0, fontSize: 17 }}>How to play</h2>
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
              Go there
            </button>
          )}
          {last ? (
            <button type="button" className="fm-btn fm-btn--primary fm-btn--small" onClick={dismiss}>
              Got it
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
