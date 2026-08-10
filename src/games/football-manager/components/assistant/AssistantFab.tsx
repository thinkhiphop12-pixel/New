'use client';

import type { GameState } from '@/engine/types';
import { getAssistant } from '@/engine/assistant';
import { sfx } from '@/lib/sound';
import { Icon } from '../Icon';
import type { ScreenId } from '../hubNav';
import { assistantTips } from './tips';

/** Floating summon button for the Assistant Manager — mounted on the Hub
 *  and Day Summary only (never during a match). Shows his initial once
 *  hired, a plain staff icon before then, and a small badge when there's
 *  something urgent to flag. */
export default function AssistantFab({
  state,
  route,
  onOpen,
}: {
  state: GameState;
  route: ScreenId;
  onOpen: () => void;
}) {
  const assistant = getAssistant(state);
  const urgent = assistantTips(state, route).some((t) => t.urgent);

  return (
    <button
      type="button"
      className="fm-assistant-fab"
      data-tour="assistant-fab"
      onClick={() => {
        sfx.click();
        onOpen();
      }}
      aria-label={assistant ? `Talk to ${assistant.name}` : 'Assistant Manager'}
      title={assistant ? assistant.name : 'Hire an Assistant Manager'}
    >
      {assistant ? (
        <span className="fm-assistant-fab__initial">{assistant.name.charAt(0).toUpperCase()}</span>
      ) : (
        <Icon name="staff" size={22} />
      )}
      {urgent && <span className="fm-assistant-fab__badge" aria-hidden="true" />}
    </button>
  );
}
