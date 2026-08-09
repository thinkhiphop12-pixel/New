'use client';

import { useEffect } from 'react';
import { Icon, type IconName } from './Icon';

/** Gap 20 (Userbrain): there is no onboarding at all, and the report's
 *  repeated "what do I do?" traces straight back to that — a first-time
 *  player lands on the Hub with no orientation to the screens that matter
 *  (Squad, Tactics, Transfers) or to the control that actually advances the
 *  game. This is a single dismissible checklist, not a guided tour: it
 *  points at the four things a new manager needs to find and gets out of
 *  the way, reusing the existing `.fm-modal` shell rather than a new
 *  overlay framework. */

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'squad',
    title: 'Squad',
    body: 'Check your players and pick a lineup — every match needs 11 fit starters.',
  },
  {
    icon: 'tactics',
    title: 'Tactics',
    body: 'Set your formation, team identity and mentality here before kickoff.',
  },
  {
    icon: 'transfers',
    title: 'Transfers',
    body: 'Sign, loan or sell players. Realistic targets for your budget sort to the top.',
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

function markOnboardingSeen(slot: number): void {
  try {
    localStorage.setItem(onboardingKey(slot), 'true');
  } catch {
    // Storage can be unavailable (private mode, quota) — not seeing the
    // checklist again isn't worth surfacing an error for.
  }
}

export default function OnboardingOverlay({ slot, onClose }: { slot: number; onClose: () => void }) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
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
        style={{ maxWidth: 440, padding: 20 }}
      >
        <div className="fm-modal__header">
          <h2 id="onboarding-title" style={{ margin: 0, fontSize: 17 }}>Welcome to the dugout</h2>
        </div>
        <p className="fm-hint" style={{ textAlign: 'left', margin: '0 0 14px' }}>
          Four things worth knowing before your first match:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {STEPS.map((s) => (
            <div key={s.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span className="fm-icon-tile fm-icon-tile--sm" style={{ flexShrink: 0 }}>
                <Icon name={s.icon} size={15} />
              </span>
              <span>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 13 }}>{s.title}</span>
                <span className="fm-hint" style={{ textAlign: 'left', margin: 0 }}>{s.body}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="fm-actions" style={{ marginBottom: 0 }}>
          <button type="button" className="fm-btn fm-btn--primary fm-btn--small" onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
