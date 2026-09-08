'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { getAssistant } from '@/engine/assistant';
import type { ScreenId } from '../hubNav';
import CoachPortrait from './CoachPortrait';
import { Icon } from '../Icon';
import { assistantTopics } from './tips';

/**
 * The assistant's opening line, inline on the screen it's about.
 *
 * He already knows what's wrong — `assistantTopics` computes it per screen —
 * but until now you had to know he existed, find the floating button and open
 * a panel to hear any of it. That's fine for the manager who has played
 * before and useless for the one who hasn't, which is exactly the person the
 * line is written for.
 *
 * So the first topic he'd raise is shown where the problem is, as one
 * sentence with his face on it. It is deliberately *not* the panel: no chips,
 * no tasks, no trust meter. One thing to read, and a way through to the thing
 * it's about. The panel is still there behind the floating button for
 * everything else he can do.
 *
 * Renders nothing when there's nothing worth saying, which includes having no
 * assistant hired — a permanent "hire an assistant" nag on three screens is
 * how you teach people to stop reading the assistant.
 *
 * The explainer half of that is dismissable, and stays dismissed. Measured on
 * a 414x896 phone, this card is 98-136px on every screen, and the header,
 * sub-nav and bottom rail take another ~170px: 270px of chrome before any
 * content, 47-77% of the viewport depending on the screen. That is a fair
 * price the first time you open Training and a permanent tax the fiftieth,
 * when the sentence is one you have read twenty times and Karl is still a
 * button away on every screen. So "where am I" can be closed per screen and
 * remembered; anything urgent ignores the dismissal and shows anyway, because
 * a broken lineup is news rather than explanation.
 */

const DISMISS_KEY = 'gaffa.assistline.dismissed';

function dismissedRoutes(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function rememberDismissed(route: string): void {
  try {
    const next = [...new Set([...dismissedRoutes(), route])];
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode, quota). Closing the card for
    // this session but not the next is a much smaller problem than an error.
  }
}
export default function AssistantLine({
  state,
  route,
  onRoute,
}: {
  state: GameState;
  route: ScreenId;
  /** Optional: without it the line is read-only and shows no jump button. */
  onRoute?: (id: ScreenId) => void;
}) {
  // Read once on mount rather than on every render: the list only changes
  // through this component, and `closed` already tracks that.
  const [dismissed, setDismissed] = useState(dismissedRoutes);
  const assistant = getAssistant(state);
  if (!assistant) return null;

  // What he leads with here: something urgent, or his read on the situation
  // in front of you. Never the `screen` topic.
  //
  // That topic is `screenExplainer` — a description of the screen you are
  // looking at — and the screens carrying it mostly open with the same
  // explanation in their own words. On Training his line read "your squad
  // trains twice a week and you pick what they work on", directly above a
  // paragraph reading "your squad trains twice a week and you decide what
  // each session works on": the same sentence twice, 136px apart. The
  // screen's own copy is the better of the two — it sits with the controls it
  // describes and can point at Fitness next door.
  //
  // So inline he speaks only when he has something the screen does not.
  // "What is this screen?" is still a menu item in his panel, one tap from
  // the button he has on every screen, for the manager who wants it.
  const topics = assistantTopics(state, route);
  const topic = topics.find((t) => t.urgent) ?? topics.find((t) => t.id === 'here');
  if (!topic) return null;
  // An urgent line is news and always shows. Everything else is explanation,
  // and explanation you have closed on this screen stays closed.
  if (!topic.urgent && dismissed.includes(route)) return null;

  const mood = topic.urgent ? 'concerned' : topic.good ? 'happy' : 'neutral';
  // Somewhere else to go only makes sense if it isn't here already.
  const jump = onRoute && topic.route && topic.route !== route ? topic.route : null;

  return (
    <div className={`fm-assistline${topic.urgent ? ' is-urgent' : ''}${topic.good ? ' is-good' : ''}`}>
      <CoachPortrait coachId={assistant.id} mood={mood} size={44} />
      <div className="fm-assistline__body">
        <p className="fm-assistline__who">
          {assistant.name}
          {topic.urgent && (
            <span className="fm-assistline__flag">
              <Icon name="warning" size={11} /> Needs you
            </span>
          )}
        </p>
        <p className="fm-assistline__quote">&ldquo;{topic.line}&rdquo;</p>
      </div>
      <div className="fm-assistline__actions">
        {jump && (
          <button
            type="button"
            className="fm-btn fm-btn--secondary fm-btn--small"
            onClick={() => onRoute!(jump)}
          >
            Show me
          </button>
        )}
        {/* Everything he knows is one tap from wherever you are. The event
            is caught by FootballManagerGame, which owns the panel — the
            alternative was threading an opener through HubScreen and every
            screen component that renders this line. */}
        <button
          type="button"
          className="fm-btn fm-btn--ghost fm-btn--small"
          onClick={() => window.dispatchEvent(new Event('gaffa:open-assistant'))}
        >
          Ask {assistant.name.split(' ')[0]}
        </button>
      </div>
      {!topic.urgent && (
        <button
          type="button"
          className="fm-assistline__close"
          aria-label={`Stop showing this on ${route}`}
          title={`Stop showing this on ${route}`}
          onClick={() => {
            rememberDismissed(route);
            setDismissed((d) => [...d, route]);
          }}
        >
          <Icon name="cross" size={13} />
        </button>
      )}
    </div>
  );
}
