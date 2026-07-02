import type { GameState, MatchEvent, MatchReport, Tactics, FormationDef } from './types';
import { BASE_GOALS, HOME_ADVANTAGE, MORALE_START, getFormation } from './gameRules';
import { aiMatchSetup, lineupStrength } from './teamManagement';
import { poisson, weightedIndex } from './utils';

interface SideSetup {
  clubId: number;
  lineup: (number | null)[];
  formation: FormationDef;
  tactics: Tactics;
  morale: number;
}

function userSetup(state: GameState): SideSetup {
  return {
    clubId: state.userClubId,
    lineup: state.lineup,
    formation: getFormation(state.formationId),
    tactics: state.tactics,
    morale: state.morale,
  };
}

function setupFor(state: GameState, clubId: number): SideSetup {
  if (clubId === state.userClubId) return userSetup(state);
  return { clubId, ...aiMatchSetup(state, clubId), morale: MORALE_START };
}

/** Expected goals for the attacking side given both strengths. */
function expectedGoals(attack: number, defense: number, pressing: Tactics['pressing'], home: boolean): number {
  const ratio = attack / defense;
  let lambda = BASE_GOALS * Math.pow(ratio, 3.4);
  if (home) lambda *= HOME_ADVANTAGE;
  if (pressing === 'high') lambda *= 1.08;
  if (pressing === 'low') lambda *= 0.94;
  return Math.min(lambda, 5.5);
}

/** Concession multiplier from your own pressing (high press = exposed at the back). */
function pressingConcede(pressing: Tactics['pressing']): number {
  return pressing === 'high' ? 1.06 : pressing === 'low' ? 0.92 : 1;
}

function scorerName(state: GameState, side: SideSetup): string {
  const candidates = side.lineup
    .map((id, i) => ({ id, slot: side.formation.slots[i] }))
    .filter((x): x is { id: number; slot: (typeof side.formation.slots)[0] } => x.id !== null)
    .map((x) => state.players[x.id])
    .filter(Boolean);
  if (!candidates.length) return 'Unknown';
  const weights = candidates.map((p) => {
    const posW = p.pos === 'FWD' ? 5 : p.pos === 'MID' ? 2.2 : p.pos === 'DEF' ? 0.5 : 0.05;
    return posW * Math.max(p.sho, 20);
  });
  return candidates[weightedIndex(weights)].name;
}

const CHANCE_TEXT = [
  'rattles the crossbar from distance!',
  'forces a fingertip save from the keeper.',
  'drags a shot just wide of the far post.',
  'sees a header cleared off the line!',
  'curls one inches over the bar.',
];

/** Simulate one match. Does NOT mutate state — apply results via seasonProgression. */
export function simulateMatch(state: GameState, homeId: number, awayId: number): MatchReport {
  const home = setupFor(state, homeId);
  const away = setupFor(state, awayId);

  const hs = lineupStrength(state, home.lineup, home.formation, home.tactics, home.morale);
  const as = lineupStrength(state, away.lineup, away.formation, away.tactics, away.morale);

  const homeXG = expectedGoals(hs.attack, as.defense, home.tactics.pressing, true) * pressingConcede(away.tactics.pressing);
  const awayXG = expectedGoals(as.attack, hs.defense, away.tactics.pressing, false) * pressingConcede(home.tactics.pressing);

  const homeGoals = poisson(homeXG);
  const awayGoals = poisson(awayXG);

  const clubName = (id: number) => state.clubs.find((c) => c.id === id)?.name ?? '???';

  const events: MatchEvent[] = [{ minute: 1, type: 'info', clubId: 0, text: 'Kick-off!' }];

  const addGoals = (side: SideSetup, count: number) => {
    for (let i = 0; i < count; i++) {
      const minute = 2 + Math.floor(Math.random() * 89);
      events.push({
        minute,
        type: 'goal',
        clubId: side.clubId,
        text: `GOAL! ${scorerName(state, side)} scores for ${clubName(side.clubId)}!`,
      });
    }
  };
  addGoals(home, homeGoals);
  addGoals(away, awayGoals);

  // Near-miss chances proportional to xG, plus a card or two for flavour.
  for (const side of [home, away]) {
    const xg = side === home ? homeXG : awayXG;
    const chances = poisson(Math.max(xg * 1.1, 0.6));
    for (let i = 0; i < chances; i++) {
      events.push({
        minute: 2 + Math.floor(Math.random() * 89),
        type: 'chance',
        clubId: side.clubId,
        text: `${scorerName(state, side)} ${CHANCE_TEXT[Math.floor(Math.random() * CHANCE_TEXT.length)]}`,
      });
    }
    if (Math.random() < 0.55) {
      events.push({
        minute: 20 + Math.floor(Math.random() * 70),
        type: 'card',
        clubId: side.clubId,
        text: `Yellow card for ${clubName(side.clubId)} after a late challenge.`,
      });
    }
  }

  events.push({ minute: 90, type: 'info', clubId: 0, text: 'Full time.' });
  events.sort((a, b) => a.minute - b.minute);

  return {
    homeId,
    awayId,
    homeGoals,
    awayGoals,
    homeXG: Math.round(homeXG * 100) / 100,
    awayXG: Math.round(awayXG * 100) / 100,
    events,
  };
}
