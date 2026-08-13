'use client';

import type { GameState } from '@/engine/types';
import { getAssistant } from '@/engine/assistant';
import { sfx } from '@/lib/sound';
import { Icon } from '../Icon';
import type { ScreenId } from '../hubNav';
import { hasUrgentTip } from './tips';

/**
 * The summon button for the Assistant Manager — mounted on the Hub and Day
 * Summary only (never during a match). Shows his initial once hired, a plain
 * staff icon before then, and a small badge when there's something urgent.
 *
 * It used to be a floating action button fixed to the bottom-right of the
 * viewport, and that is why this is now an ordinary inline button. Both
 * screens it appears on are full-width lists, so a fixed button sat directly
 * on top of the right-hand column: the squad list keeps its rating chips
 * there and the Day Summary its row chevrons. It hid one row's contents at
 * any scroll position, and — worse — a tap aimed at that rating or chevron
 * opened the assistant instead, because the button was the topmost element
 * at that point.
 *
 * So it goes where each screen already has chrome that covers nothing: the
 * action dock on the Hub, the header on Day Summary. The caller places it;
 * this component only draws it.
 */
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
  const urgent = hasUrgentTip(state, route);

  return (
    <button
      type="button"
      className="fm-assistant-fab"
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
        <Icon name="staff" size={18} />
      )}
      {urgent && <span className="fm-assistant-fab__badge" aria-hidden="true" />}
    </button>
  );
}
