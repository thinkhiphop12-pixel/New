import type { GameState, MatchEvent, MatchReport, Player, Tactics, FormationDef } from './types';
import { BASE_GOALS, HOME_ADVANTAGE, MORALE_START, getFormation } from './gameRules';
import { aiMatchSetup, lineupStrength } from './teamManagement';
import { scorerTraitMult } from './traits';
import { poisson, weightedIndex } from './utils';

interface SideSetup {
  clubId: number;
  lineup: (number | null)[];
  formation: FormationDef;
  tactics: Tactics;
  morale: number;
  chemistry: number;
}

function userSetup(state: GameState): SideSetup {
  return {
    clubId: state.userClubId,
    lineup: state.lineup,
    formation: getFormation(state.formationId),
    tactics: state.tactics,
    morale: state.morale,
    chemistry: state.chemistry,
  };
}

function setupFor(state: GameState, clubId: number, opponentId: number): SideSetup {
  if (clubId === state.userClubId) return userSetup(state);
  return { clubId, ...aiMatchSetup(state, clubId, opponentId), morale: MORALE_START, chemistry: 50 };
}

/** Expected goals for the attacking side given both strengths. */
function expectedGoals(attack: number, defense: number, tactics: Tactics, home: boolean): number {
  const ratio = attack / defense;
  let lambda = BASE_GOALS * Math.pow(ratio, 3.4);
  if (home) lambda *= HOME_ADVANTAGE;
  if (tactics.pressing === 'high') lambda *= 1.08;
  if (tactics.pressing === 'low') lambda *= 0.94;
  if (tactics.tempo === 'fast') lambda *= 1.05;
  if (tactics.tempo === 'slow') lambda *= 0.95;
  return Math.min(lambda, 5.5);
}

/** Concession multiplier from your own setup (high press / fast tempo = exposed). */
function concedeMult(tactics: Tactics): number {
  let m = 1;
  if (tactics.pressing === 'high') m *= 1.06;
  if (tactics.pressing === 'low') m *= 0.92;
  if (tactics.tempo === 'fast') m *= 1.04;
  if (tactics.tempo === 'slow') m *= 0.96;
  return m;
}

function pickScorer(state: GameState, side: SideSetup): Player | null {
  const candidates = side.lineup
    .filter((id): id is number => id !== null)
    .map((id) => state.players[id])
    .filter(Boolean);
  if (!candidates.length) return null;
  const weights = candidates.map((p) => {
    const posW = p.pos === 'FWD' ? 5 : p.pos === 'MID' ? 2.2 : p.pos === 'DEF' ? 0.5 : 0.05;
    return posW * Math.max(p.sho, 20) * scorerTraitMult(p);
  });
  return candidates[weightedIndex(weights)];
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
  const home = setupFor(state, homeId, awayId);
  const away = setupFor(state, awayId, homeId);

  const hs = lineupStrength(state, home.lineup, home.formation, home.tactics, home.morale, home.chemistry);
  const as = lineupStrength(state, away.lineup, away.formation, away.tactics, away.morale, away.chemistry);

  const homeXG = expectedGoals(hs.attack, as.defense, home.tactics, true) * concedeMult(away.tactics);
  const awayXG = expectedGoals(as.attack, hs.defense, away.tactics, false) * concedeMult(home.tactics);

  const homeGoals = poisson(homeXG);
  const awayGoals = poisson(awayXG);

  const clubName = (id: number) => state.clubs.find((c) => c.id === id)?.name ?? '???';

  const events: MatchEvent[] = [{ minute: 1, type: 'info', clubId: 0, text: 'Kick-off!' }];

  const addGoals = (side: SideSetup, count: number) => {
    for (let i = 0; i < count; i++) {
      const minute = 2 + Math.floor(Math.random() * 89);
      const scorer = pickScorer(state, side);
      events.push({
        minute,
        type: 'goal',
        clubId: side.clubId,
        playerId: scorer?.id,
        text: `GOAL! ${scorer?.name ?? 'Unknown'} scores for ${clubName(side.clubId)}!`,
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
        text: `${pickScorer(state, side)?.name ?? 'A player'} ${CHANCE_TEXT[Math.floor(Math.random() * CHANCE_TEXT.length)]}`,
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
    homeLineup: home.lineup.filter((id): id is number => id !== null),
    awayLineup: away.lineup.filter((id): id is number => id !== null),
  };
}
