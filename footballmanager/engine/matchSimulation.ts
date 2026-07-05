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
  // Use dual formation if available, otherwise fall back to single formation
  const formationId = state.dualFormation?.inPossessionId || state.formationId;
  return {
    clubId: state.userClubId,
    lineup: state.lineup,
    formation: getFormation(formationId),
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

/** Half-time team talks: small, risky nudges to the second half. */
export type TeamTalk = 'calm' | 'encourage' | 'hairdryer';

const TALK_MODS: Record<TeamTalk, { att: number; concede: number }> = {
  calm: { att: 0.98, concede: 0.93 },
  encourage: { att: 1.04, concede: 1 },
  hairdryer: { att: 1.08, concede: 1.05 },
};

export interface HalfOptions {
  /** Override the user's lineup (half-time substitutions). */
  userLineup?: (number | null)[];
  /** Half-time team talk (applies to the user's side, half 2 only). */
  talk?: TeamTalk;
}

function buildReport(
  state: GameState,
  home: SideSetup,
  away: SideSetup,
  homeXG: number,
  awayXG: number,
  minMinute: number,
  maxMinute: number,
  closing: string
): MatchReport {
  const homeGoals = poisson(homeXG);
  const awayGoals = poisson(awayXG);
  const clubName = (id: number) => state.clubs.find((c) => c.id === id)?.name ?? '???';
  const span = maxMinute - minMinute;
  const events: MatchEvent[] = [];

  const addGoals = (side: SideSetup, count: number) => {
    for (let i = 0; i < count; i++) {
      const minute = minMinute + Math.floor(Math.random() * span);
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
    const chances = poisson(Math.max(xg * 1.1, 0.3));
    for (let i = 0; i < chances; i++) {
      events.push({
        minute: minMinute + Math.floor(Math.random() * span),
        type: 'chance',
        clubId: side.clubId,
        text: `${pickScorer(state, side)?.name ?? 'A player'} ${CHANCE_TEXT[Math.floor(Math.random() * CHANCE_TEXT.length)]}`,
      });
    }
    if (Math.random() < 0.3) {
      events.push({
        minute: minMinute + Math.floor(Math.random() * span),
        type: 'card',
        clubId: side.clubId,
        text: `Yellow card for ${clubName(side.clubId)} after a late challenge.`,
      });
    }
  }

  events.push({ minute: maxMinute + 1, type: 'info', clubId: 0, text: closing });
  events.sort((a, b) => a.minute - b.minute);

  return {
    homeId: home.clubId,
    awayId: away.clubId,
    homeGoals,
    awayGoals,
    homeXG: Math.round(homeXG * 100) / 100,
    awayXG: Math.round(awayXG * 100) / 100,
    events,
    homeLineup: home.lineup.filter((id): id is number => id !== null),
    awayLineup: away.lineup.filter((id): id is number => id !== null),
  };
}

function computeXG(state: GameState, home: SideSetup, away: SideSetup): { homeXG: number; awayXG: number } {
  const hs = lineupStrength(state, home.lineup, home.formation, home.tactics, home.morale, home.chemistry);
  const as = lineupStrength(state, away.lineup, away.formation, away.tactics, away.morale, away.chemistry);
  return {
    homeXG: expectedGoals(hs.attack, as.defense, home.tactics, true) * concedeMult(away.tactics),
    awayXG: expectedGoals(as.attack, hs.defense, away.tactics, false) * concedeMult(home.tactics),
  };
}

/** Simulate one match. Does NOT mutate state — apply results via seasonProgression. */
export function simulateMatch(state: GameState, homeId: number, awayId: number): MatchReport {
  const home = setupFor(state, homeId, awayId);
  const away = setupFor(state, awayId, homeId);
  const { homeXG, awayXG } = computeXG(state, home, away);
  const report = buildReport(state, home, away, homeXG, awayXG, 2, 89, 'Full time.');
  report.events.unshift({ minute: 1, type: 'info', clubId: 0, text: 'Kick-off!' });
  return report;
}

/**
 * Simulate one half of the user's match (interactive matchday: half-time
 * substitutions and team talks change the second half).
 */
export function simulateHalf(
  state: GameState,
  homeId: number,
  awayId: number,
  half: 1 | 2,
  opts: HalfOptions = {}
): MatchReport {
  const home = setupFor(state, homeId, awayId);
  const away = setupFor(state, awayId, homeId);
  const userSide = home.clubId === state.userClubId ? home : away.clubId === state.userClubId ? away : null;
  if (userSide && opts.userLineup) userSide.lineup = opts.userLineup;
  let { homeXG, awayXG } = computeXG(state, home, away);
  homeXG /= 2;
  awayXG /= 2;
  if (half === 2 && userSide && opts.talk) {
    const mod = TALK_MODS[opts.talk];
    if (userSide === home) {
      homeXG *= mod.att;
      awayXG *= mod.concede;
    } else {
      awayXG *= mod.att;
      homeXG *= mod.concede;
    }
  }
  const report =
    half === 1
      ? buildReport(state, home, away, homeXG, awayXG, 2, 44, 'Half time.')
      : buildReport(state, home, away, homeXG, awayXG, 46, 89, 'Full time.');
  if (half === 1) report.events.unshift({ minute: 1, type: 'info', clubId: 0, text: 'Kick-off!' });
  return report;
}

/** Combine two half-reports into one full-match report. */
export function mergeReports(h1: MatchReport, h2: MatchReport): MatchReport {
  const union = (a: number[], b: number[]) => [...new Set([...a, ...b])];
  return {
    homeId: h1.homeId,
    awayId: h1.awayId,
    homeGoals: h1.homeGoals + h2.homeGoals,
    awayGoals: h1.awayGoals + h2.awayGoals,
    homeXG: Math.round((h1.homeXG + h2.homeXG) * 100) / 100,
    awayXG: Math.round((h1.awayXG + h2.awayXG) * 100) / 100,
    events: [...h1.events, ...h2.events].sort((a, b) => a.minute - b.minute),
    homeLineup: union(h1.homeLineup, h2.homeLineup),
    awayLineup: union(h1.awayLineup, h2.awayLineup),
  };
}

/**
 * Match ratings (6.0–10.0) for everyone involved. Deterministic given the
 * report, so the UI and the season-stats pass agree without storing them.
 */
export function matchRatings(report: MatchReport): Record<number, number> {
  const ratings: Record<number, number> = {};
  const goalsBy: Record<number, number> = {};
  for (const e of report.events) {
    if (e.type === 'goal' && e.playerId !== undefined) goalsBy[e.playerId] = (goalsBy[e.playerId] ?? 0) + 1;
  }
  const score = (id: number, isHome: boolean) => {
    const gf = isHome ? report.homeGoals : report.awayGoals;
    const ga = isHome ? report.awayGoals : report.homeGoals;
    const result = gf > ga ? 0.5 : gf < ga ? -0.5 : 0;
    const noise = (((id * 2654435761 + gf * 97 + ga * 31) >>> 0) % 100) / 100 - 0.5; // ±0.5, deterministic
    const raw = 6.6 + result + (goalsBy[id] ?? 0) * 1.1 + noise;
    return Math.round(Math.min(10, Math.max(5.5, raw)) * 10) / 10;
  };
  for (const id of report.homeLineup) ratings[id] = score(id, true);
  for (const id of report.awayLineup) ratings[id] = score(id, false);
  return ratings;
}
