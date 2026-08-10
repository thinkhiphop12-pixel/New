'use client';

import { useEffect } from 'react';
import { Icon, type IconName } from './Icon';
import type { ScreenId } from './hubNav';
import { ORIENTATION_TOUR, SECTION_TOURS } from './tour/tourSteps';

/**
 * The guide index — the header's "?" and the assistant's "Show me around".
 *
 * This used to *be* the tutorial: seven cards of prose in a dialog, stepped
 * through with Next/Back, describing controls the player could not see while
 * reading about them. That is the shape of a manual, not a tutorial, and the
 * feedback it drew was exactly what you would expect — that the game is hard
 * to use and needs arrows pointing at things.
 *
 * So the explaining moved to the coach-marks (components/tour/), which
 * spotlight the real control, and this became the way in to them: a menu of
 * every walkthrough, none of it one-shot, so a player who is stuck on one
 * screen can be shown that screen rather than re-reading all six sections.
 */

/** Which icon fronts each section tour in the list. Keyed by tour id so a
 *  tour without an entry still lists (with a neutral icon) rather than
 *  failing to render. */
const TOUR_ICON: Record<string, IconName> = {
  overview: 'home',
  squad: 'squad',
  tactics: 'tactics',
  training: 'training',
  'one-to-one': 'person',
  academy: 'sprout',
  transfers: 'transfers',
  scouting: 'binoculars',
  staff: 'staff',
  board: 'target',
  finances: 'finances',
  inbox: 'inbox',
  calendar: 'calendar',
  table: 'table',
};

/* Kept for saves written before the guide was rebuilt: the old one-shot
 * checklist wrote this key, and `resetOnboarding` still clears it. */
export function onboardingKey(slot: number): string {
  return `gaffa-onboarding-seen-${slot}`;
}

export default function OnboardingOverlay({
  currentRoute,
  onStartTour,
  onClose,
}: {
  /** The screen the player is on, so its own walkthrough sorts to the top. */
  currentRoute: ScreenId;
  onStartTour: (tourId: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The tour for wherever they are standing goes first — a player opening
  // the guide is usually stuck on the screen in front of them, not shopping
  // for a section.
  const here = SECTION_TOURS.find((t) => t.screen === currentRoute);
  const rest = SECTION_TOURS.filter((t) => t !== here);

  const start = (id: string) => {
    onStartTour(id);
    onClose();
  };

  return (
    <div className="fm-modal-backdrop" onClick={onClose}>
      <div
        className="fm-modal fm-modal-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        style={{ maxWidth: 420, padding: 20 }}
      >
        <div className="fm-modal__header">
          <h2 id="onboarding-title" style={{ margin: 0, fontSize: 17 }}>How to play</h2>
          <button className="fm-settings-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <p className="fm-hint" style={{ textAlign: 'left', margin: '0 0 14px' }}>
          Every walkthrough points at the real controls on the screen it describes. Pick one — you can
          stop at any time, and come back as often as you like.
        </p>

        <button type="button" className="fm-btn fm-btn--primary fm-btn--full" onClick={() => start(ORIENTATION_TOUR.id)}>
          <Icon name="play" size={14} /> Show me around the whole game
        </button>

        {here && (
          <>
            <p className="fm-label" style={{ margin: '16px 0 6px' }}>The screen you are on</p>
            <button type="button" className="fm-menurow" onClick={() => start(here.id)}>
              <span className="fm-icon-tile fm-icon-tile--sm">
                <Icon name={TOUR_ICON[here.id] ?? 'info'} size={15} />
              </span>
              <span className="fm-menurow__main">
                <span className="fm-menurow__label">{here.label}</span>
                <span className="fm-menurow__value">{here.steps.length} steps</span>
              </span>
            </button>
          </>
        )}

        <p className="fm-label" style={{ margin: '16px 0 6px' }}>Every section</p>
        <div className="fm-guide-list">
          {rest.map((t) => (
            <button key={t.id} type="button" className="fm-menurow" onClick={() => start(t.id)}>
              <span className="fm-icon-tile fm-icon-tile--sm">
                <Icon name={TOUR_ICON[t.id] ?? 'info'} size={15} />
              </span>
              <span className="fm-menurow__main">
                <span className="fm-menurow__label">{t.label}</span>
                <span className="fm-menurow__value">{t.steps.length} steps</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
