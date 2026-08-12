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

  const topic = assistantTopics(state, route)[0];
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
      {jump && (
        <button
          type="button"
          className="fm-btn fm-btn--secondary fm-btn--small"
          onClick={() => onRoute!(jump)}
        >
          Show me
        </button>
      )}
    </div>
  );
}
