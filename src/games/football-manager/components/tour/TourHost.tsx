'use client';

import { useEffect, useState } from 'react';
import type { ScreenId } from '../hubNav';
import CoachMarks from './CoachMarks';
import { tourById } from './tourSteps';

/**
 * Runs one tour: puts the player on the screen it describes, then hands over
 * to CoachMarks for the stepping.
 *
 * Routing is the only reason this exists as a wrapper. A tour is defined
 * against a screen, and "Explain this section" can be pressed from anywhere
 * (the assistant panel floats over every screen), so the first thing a tour
 * has to do is make sure its subject is actually on screen. CoachMarks then
 * finds the targets, which is why it tolerates a target that isn't in the
 * DOM yet — this route change and that search happen in the same tick.
 */
export default function TourHost({
  tourId,
  route,
  speaker,
  onRoute,
  onClose,
}: {
  tourId: string;
  /** The hub screen currently open, so we only route when we must. */
  route: ScreenId;
  /** The assistant's name, if one is in post. */
  speaker?: string;
  onRoute: (id: ScreenId) => void;
  onClose: (tourId: string) => void;
}) {
  const tour = tourById(tourId);
  const [step, setStep] = useState(0);

  // Restart at the top whenever a different tour is opened.
  useEffect(() => { setStep(0); }, [tourId]);

  // Get the player in front of the thing being explained.
  useEffect(() => {
    if (tour && tour.screen !== route) onRoute(tour.screen);
    // Only on tour change: re-running this when `route` changes would fight
    // a player who deliberately navigates away mid-tour, yanking them back
    // on every step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  if (!tour) return null;

  return (
    <CoachMarks
      steps={tour.steps}
      stepIndex={Math.min(step, tour.steps.length - 1)}
      title={tour.label}
      speaker={speaker}
      onStep={setStep}
      onFinish={() => onClose(tour.id)}
    />
  );
}
