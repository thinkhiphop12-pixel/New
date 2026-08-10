import type { GameState } from '@/engine/types';
import { getSquad, isLineupValid } from '@/engine/teamManagement';
import { getAssistant } from '@/engine/assistant';
import type { ScreenId } from '../hubNav';
import { STEPS } from '../OnboardingOverlay';

export interface AssistantTip {
  text: string;
  route?: ScreenId;
  urgent?: boolean;
}

/** What's this screen for — reuses the guided tour's own copy (keyed by the
 *  route each step points at) instead of a second, separately-maintained
 *  set of explainer lines. Screens the tour doesn't stop at get no line. */
function screenExplainer(route: ScreenId): string | undefined {
  return STEPS.find((s) => s.route === route)?.body;
}

function fallback(): AssistantTip[] {
  return [
    {
      text: "Hire an Assistant Manager in Club → Staff and I'll keep an eye on things for you.",
      route: 'staff',
    },
  ];
}

/** Contextual "what now?" tips for the summonable Assistant Manager panel —
 *  reuses the exact checks Dashboard.tsx's "Needs your attention" module
 *  computes, in the same order, plus one explainer line for whatever screen
 *  the manager is currently looking at. */
export function assistantTips(state: GameState, route: ScreenId): AssistantTip[] {
  if (!getAssistant(state)) return fallback();

  const tips: AssistantTip[] = [];
  const squad = getSquad(state, state.userClubId);
  const unhappy = squad.filter((p) => p.unhappy);
  const lineupOk = isLineupValid(state, state.userClubId, state.lineup);
  const unreadInbox = state.inbox.filter((i) => !i.read).length;
  const pendingBids = (state.negotiations ?? []).filter((n) => n.type === 'incoming' && n.awaiting === 'user').length;
  const offerCount = state.incomingOffers.length + pendingBids;

  if (!lineupOk) {
    tips.push({ text: "Gaffer, the lineup's not valid — sort it before matchday.", route: 'tactics', urgent: true });
  }
  if (state.budget < 0) {
    tips.push({ text: "We're in the red, boss. Worth a look at the finances before it gets worse.", route: 'finances', urgent: true });
  }
  if (state.morale < 40) {
    tips.push({ text: 'Squad morale is low — might be worth easing off training this week.', route: 'training' });
  }
  if (state.board.confidence < 30) {
    tips.push({ text: "The board's patience is wearing thin. Worth checking what they expect.", route: 'board' });
  }
  if (unhappy.length > 0) {
    tips.push({
      text: `${unhappy.length} player${unhappy.length === 1 ? "'s" : 's are'} unhappy about game time — want me to have a word?`,
      route: 'inbox',
    });
  }
  if (offerCount > 0) {
    tips.push({ text: `${offerCount} transfer offer${offerCount === 1 ? '' : 's'} waiting on a reply.`, route: 'transfers' });
  }
  if (unreadInbox > 0) {
    tips.push({ text: `${unreadInbox} unread message${unreadInbox === 1 ? '' : 's'} in the inbox.`, route: 'inbox' });
  }

  const explainer = screenExplainer(route);
  if (explainer) tips.push({ text: explainer });

  return tips;
}
