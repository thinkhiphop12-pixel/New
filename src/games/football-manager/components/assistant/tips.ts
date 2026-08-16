import type { GameState } from '@/engine/types';
import { getSquad, isLineupValid } from '@/engine/teamManagement';
import { getAssistant } from '@/engine/assistant';
import { contractMonthsLeft } from '@/engine/negotiation';
import type { ScreenId } from '../hubNav';
import { STEPS } from '../OnboardingOverlay';

/**
 * What the Assistant Manager has to say, as things you can ask him.
 *
 * This was a flat list of tips rendered all at once — every concern the
 * squad had, stacked, each with its own "Take me there" button. Accurate, and
 * about as conversational as a validation summary.
 *
 * Same checks, reshaped: each one is now a *topic* with a question attached,
 * so the panel can show one answer at a time and let the manager pick what to
 * ask about. Order still matters — the first topic is what he opens with, so
 * urgent things lead.
 */

export interface AssistantTopic {
  id: string;
  /** The chip the manager taps. */
  ask: string;
  /** Single character on the chip's key badge. */
  key: string;
  /** What he says back. */
  line: string;
  route?: ScreenId;
  /** Leads, and turns the portrait worried. */
  urgent?: boolean;
  /** Good news — turns the portrait pleased. */
  good?: boolean;
}

/**
 * What each screen is for, in his voice.
 *
 * Every screen in the game gets a line here — the guided tour only covers
 * five of them, so anywhere else "What is this screen?" either fell back to
 * nothing or was missing from the chip list entirely, which is precisely
 * the screen a new manager is most likely to be lost on.
 *
 * The register is fixed: what the screen is for, what you do on it, and
 * what happens if you ignore it. No jargon that isn't explained in the same
 * sentence — a ten-year-old who watches football should be able to read any
 * one of these and know what to press.
 */
const SCREEN_HELP: Record<ScreenId, string> = {
  overview: "Your home page. The next match, anything waiting on a decision, and how the league looks. If you only check one screen a week, check this one.",
  inbox: "Your messages. Anything the club needs you to answer ends up here — contracts running out, players sulking, bids from other clubs.",
  calendar: "Every date that matters — matches, the transfer window, the end of the season. You can skip forward to any day on it.",
  squad: "Your players, and what each one is good at. Tap a name for his full card: how good he is, how happy he is, how long he's signed for.",
  tactics: "Where you pick your eleven and how you want to play. Get this wrong and we can't play at all — the game won't let you start a match a man short.",
  training: "What the lads work on each week. Two sessions: pick what each one drills. Hard weeks make them better but tire them out; easy weeks freshen them up.",
  fitness: "How fresh everybody is. Fitness is what's left in the legs, sharpness is match rhythm. Anyone in the red shouldn't be starting on Saturday.",
  'one-to-one': "Four players a week get extra work one-to-one with a coach. It's free improvement — leaving the slots empty is throwing it away.",
  academy: "The club's own kids. Once a year a handful turn up on trial, I give you my verdict on each, and you decide who we keep.",
  transfers: "Buying and selling. Agree a fee with his club first, then agree wages with him. They almost always say no the first time — go again.",
  scouting: "Send scouts to watch players before you spend money on them. A scouted player's numbers are the real ones; an unscouted player's are a guess.",
  jobs: "Other clubs' vacancies. Worth a look if our board has run out of patience with you — better to jump than be pushed.",
  board: "What the people upstairs expect from you this season, and how happy they are. Fall behind on this and the job stops being yours.",
  staff: "Your backroom. Better coaches mean faster improvement in training; a better physio gets injured players back sooner. The board pays, so ask them first.",
  facilities: "The ground and the training pitches. Upgrades cost money now and pay you back over years — bigger crowds, better young players.",
  finances: "Money in, money out. Wages are the bill that never stops, so watch that one first.",
  table: "The league. Top of it is where the promotions are, bottom of it is where the sackings are.",
  fixtures: "Who we play next, and who we've already played. Handy for spotting a hard run coming up so you can rest people before it.",
  cups: "The cup. One bad afternoon and you're out, which is what makes it worth winning.",
  european: "Europe. Midweek games against clubs from other countries — big money, and a squad stretched thin.",
};

/** What this screen is for. The guided tour's own copy wins where it exists,
 *  so the tour and the assistant can never drift apart on those screens. */
function screenExplainer(route: ScreenId): string | undefined {
  return STEPS.find((s) => s.route === route)?.body ?? SCREEN_HELP[route];
}

function noAssistant(route: ScreenId): AssistantTopic[] {
  const explainer = screenExplainer(route);
  return [
    {
      id: 'vacant',
      ask: 'Who are you?',
      key: 'W',
      line: "Nobody, yet — you haven't hired an assistant. Take one on in Club → Staff and I'll keep an eye on things for you.",
      route: 'staff',
    },
    ...(explainer ? [{ id: 'screen', ask: 'What is this screen?', key: 'S', line: explainer }] : []),
  ];
}

export function assistantTopics(state: GameState, route: ScreenId): AssistantTopic[] {
  if (!getAssistant(state)) return noAssistant(route);

  const topics: AssistantTopic[] = [];
  const squad = getSquad(state, state.userClubId);
  const unhappy = squad.filter((p) => p.unhappy);
  const injured = squad.filter((p) => p.injuryWeeks > 0);
  const expiring = squad.filter((p) => contractMonthsLeft(p, state) <= 12);
  const lineupOk = isLineupValid(state, state.userClubId, state.lineup);
  const unreadInbox = state.inbox.filter((i) => !i.read).length;
  const pendingBids = (state.negotiations ?? []).filter((n) => n.type === 'incoming' && n.awaiting === 'user').length;
  const offerCount = state.incomingOffers.length + pendingBids;

  /* --- Things that are actually wrong, in the order they matter --------- */
  if (!lineupOk) {
    topics.push({
      id: 'lineup',
      ask: 'What now?',
      key: '!',
      line: "Gaffer, the lineup isn't valid — we're a body short. Sort that before we're anywhere near a matchday.",
      route: 'tactics',
      urgent: true,
    });
  }
  if (state.budget < 0) {
    topics.push({
      id: 'money',
      ask: 'How are the finances?',
      key: '£',
      line: "We're in the red, boss. Worth a look before it starts costing us in the market.",
      route: 'finances',
      urgent: true,
    });
  }
  if (state.board.confidence < 30) {
    topics.push({
      id: 'board',
      ask: 'Where do I stand with the board?',
      key: 'B',
      line: "Their patience is wearing thin. I'd go and find out exactly what they want before they decide for you.",
      route: 'board',
      urgent: true,
    });
  }

  /* --- The standing questions ------------------------------------------- */
  // Only call out form once it has actually moved. Every player starts a
  // save on exactly 1.0, so an unguarded best/worst pick names the same man
  // twice — "Saka is flying, Saka has gone quiet".
  const available = squad.filter((p) => p.injuryWeeks === 0);
  const inForm = available.filter((p) => p.form >= 1.06).sort((a, b) => b.form - a.form)[0];
  const outOfForm = available.filter((p) => p.form <= 0.94).sort((a, b) => a.form - b.form)[0];

  const squadLine = (): string => {
    if (injured.length > 2) {
      return `${injured.length} in the treatment room, which is more than I'd like. We're stretched thin.`;
    }
    if (unhappy.length > 0) {
      return `${unhappy.length} of them ${unhappy.length === 1 ? 'is' : 'are'} unhappy about game time. Worth a word before it spreads.`;
    }
    if (inForm && outOfForm) return `${inForm.name} is flying. ${outOfForm.name} has gone quiet — might be worth resting him.`;
    if (inForm) return `${inForm.name} is flying at the minute. I'd build round him while it lasts.`;
    if (outOfForm) return `${outOfForm.name} has gone quiet. A week out might do him more good than another ninety minutes.`;
    return 'Nothing to report — nobody hot, nobody cold. They look fine to me.';
  };

  topics.push({
    id: 'squad',
    ask: "How's the squad?",
    key: 'S',
    line: squadLine(),
    route: unhappy.length > 0 ? 'inbox' : 'squad',
    good: injured.length <= 2 && unhappy.length === 0,
  });

  topics.push({
    id: 'training',
    ask: 'How should we train?',
    key: 'T',
    line: state.morale < 40
      ? "Morale's on the floor. I'd ease the week off and get some enjoyment back into it."
      : "Sharpness before a big one, fitness when the fixtures thin out. Match prep's never wasted the day before a game.",
    route: 'training',
  });

  topics.push({
    id: 'market',
    ask: 'Anything in the market?',
    key: 'M',
    line: offerCount > 0
      ? `${offerCount} offer${offerCount === 1 ? '' : 's'} waiting on a reply from you.`
      : expiring.length > 0
        ? `Quiet. But ${expiring.length} contract${expiring.length === 1 ? ' is' : 's are'} inside twelve months — that's how you lose players for nothing.`
        : "Nothing doing. I'll tell you the moment somebody bites.",
    route: offerCount > 0 ? 'transfers' : expiring.length > 0 ? 'squad' : 'transfers',
    urgent: offerCount > 0,
  });

  if (unreadInbox > 0) {
    topics.push({
      id: 'inbox',
      ask: 'Any messages?',
      key: 'I',
      line: `${unreadInbox} unread in the inbox. Some of it'll keep, some of it won't.`,
      route: 'inbox',
    });
  }

  const explainer = screenExplainer(route);
  if (explainer) {
    topics.push({ id: 'screen', ask: 'What is this screen?', key: '?', line: explainer });
  }

  return topics;
}

/** Whether anything he'd say is urgent — drives the FAB's badge. */
export function hasUrgentTip(state: GameState, route: ScreenId): boolean {
  return assistantTopics(state, route).some((t) => t.urgent);
}
