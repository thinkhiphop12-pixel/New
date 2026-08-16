'use client';

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
 */
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
  const assistant = getAssistant(state);
  if (!assistant) return null;

  // What he leads with here. Anything urgent still wins — a broken lineup
  // is more use than a description of the screen you're looking at — but on
  // a quiet screen he explains the screen, which is the whole point of him
  // being on it. `tips.ts` pushes the explainer last, since the panel reads
  // that list as a menu; inline, it is the answer to "where am I".
  const topics = assistantTopics(state, route);
  const topic = topics.find((t) => t.urgent) ?? topics.find((t) => t.id === 'screen') ?? topics[0];
  if (!topic) return null;

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
    </div>
  );
}
