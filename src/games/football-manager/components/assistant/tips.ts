import type { GameState } from '@/engine/types';
import { getSquad, isLineupValid } from '@/engine/teamManagement';
import { getAssistant } from '@/engine/assistant';
import type { ScreenId } from '../hubNav';

export interface AssistantTip {
  text: string;
  route?: ScreenId;
  urgent?: boolean;
}

/** One explainer line per Hub screen — what the assistant would say if you
 *  asked him "what is this screen for" while looking at it. */
const SCREEN_EXPLAINERS: Record<ScreenId, string> = {
  overview: "This is Home — your next match, what needs you, and how the squad's doing, all in one glance.",
  calendar: 'The calendar. Sim forward day by day, or jump straight to a date if nothing needs your eye before then.',
  fixtures: 'Your full season run-in — who you play, when, and where.',
  table: "The league table. Keep an eye on where you'd finish if the season ended today.",
  cups: 'Cup progress — who you drew, and when the next round kicks off.',
  european: "European progress, if you're in it this season.",
  'team-hub': 'The Team group — squad, tactics, training, schedule. Everything about how the team plays.',
  squad: 'Your full squad. Set roles, check fitness and form, and manage who plays where.',
  tactics: 'Formation, mentality, and instructions. This is where the lineup for the next match gets set.',
  training: "How hard the squad's training and what it's doing to fitness and sharpness.",
  schedule: "This week's training plan, day by day.",
  'market-hub': 'The Market group — transfers, scouting, incoming interest in your players.',
  transfers: 'Buy, sell, and negotiate. Offers awaiting your reply live here too.',
  scouting: 'Scout reports on players worth watching.',
  jobs: "Other clubs' vacancies, if you're weighing a move.",
  'club-hub': 'The Club group — finances, facilities, staff, and the board.',
  inbox: 'Every message the club sends you — news, requests, and things worth a look.',
  club: 'Club identity and reputation — the read-only stuff about who you are.',
  facilities: 'Training ground and academy investment.',
  staff: 'Your coaching staff — including hiring an Assistant Manager, if you haven’t already.',
  academy: 'Youth intake — trialists worth signing, and the ones to let go.',
  finances: "The club's money: balance, wage bill, and where it's going.",
  board: "What the board expects of you this season, and how confident they are in you.",
};

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

  tips.push({ text: SCREEN_EXPLAINERS[route] });

  return tips;
}
