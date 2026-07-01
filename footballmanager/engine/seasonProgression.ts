import type { Club, Fixture, GameData, GameState, MatchReport, SeasonSummary, TableRow } from './types';
import {
  MORALE_DRAW, MORALE_LOSS, MORALE_MAX, MORALE_MIN, MORALE_START, MORALE_WIN,
  PROMOTION_SPOTS, SEASON_ROUNDS, STARTING_BUDGET, getFormation, prizeMoney,
} from './gameRules';
import { simulateMatch } from './matchSimulation';
import { autoPickLineup, getSquad, isLineupValid } from './teamManagement';
import { clamp, marketValue } from './utils';
import { generateWeeklyOffers } from './transferMarket';

/** Double round-robin fixtures via the circle method. 20 clubs → 38 rounds. */
export function generateFixtures(clubIds: number[]): Fixture[] {
  const ids = [...clubIds];
  const n = ids.length;
  const half = n - 1;
  const fixtures: Fixture[] = [];
  const arr = ids.slice(1);
  for (let round = 0; round < half; round++) {
    const pairings: [number, number][] = [];
    const others = [ids[0], ...arr];
    for (let i = 0; i < n / 2; i++) {
      const a = others[i];
      const b = others[n - 1 - i];
      // Alternate home/away by round so nobody plays 19 straight home games.
      pairings.push(round % 2 === 0 ? [a, b] : [b, a]);
    }
    for (const [homeId, awayId] of pairings) {
      fixtures.push({ round: round + 1, homeId, awayId, played: false, homeGoals: 0, awayGoals: 0 });
      fixtures.push({
        round: round + 1 + half,
        homeId: awayId,
        awayId: homeId,
        played: false,
        homeGoals: 0,
        awayGoals: 0,
      });
    }
    arr.unshift(arr.pop()!);
  }
  return fixtures.sort((a, b) => a.round - b.round);
}

export function newGame(data: GameData, userClubId: number, seasonYear = 2026): GameState {
  const clubs: Club[] = data.clubs.map((c) => ({ ...c, playerIds: [...c.playerIds] }));
  const players: GameState['players'] = {};
  for (const p of data.players) players[p.id] = { ...p, form: 1, injuryWeeks: 0 };

  const userClub = clubs.find((c) => c.id === userClubId)!;
  const state: GameState = {
    version: 1,
    userClubId,
    seasonYear,
    week: 1,
    budget: STARTING_BUDGET[userClub.division],
    morale: MORALE_START,
    formationId: '4-3-3',
    lineup: [],
    tactics: { style: 'balanced', pressing: 'mid' },
    players,
    clubs,
    fixtures: {
      d1: generateFixtures(clubs.filter((c) => c.division === 1).map((c) => c.id)),
      d2: generateFixtures(clubs.filter((c) => c.division === 2).map((c) => c.id)),
    },
    incomingOffers: [],
    history: [],
    news: [`Welcome to ${userClub.name}! The board expects a solid season.`],
  };
  state.lineup = autoPickLineup(state, userClubId, getFormation(state.formationId));
  return state;
}

export function computeTable(state: GameState, division: 1 | 2): TableRow[] {
  const clubs = state.clubs.filter((c) => c.division === division);
  const rows = new Map<number, TableRow>(
    clubs.map((c) => [c.id, { clubId: c.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 }])
  );
  const fixtures = division === 1 ? state.fixtures.d1 : state.fixtures.d2;
  for (const f of fixtures) {
    if (!f.played) continue;
    const h = rows.get(f.homeId)!;
    const a = rows.get(f.awayId)!;
    h.played++; a.played++;
    h.gf += f.homeGoals; h.ga += f.awayGoals;
    a.gf += f.awayGoals; a.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) { h.won++; h.pts += 3; a.lost++; }
    else if (f.homeGoals < f.awayGoals) { a.won++; a.pts += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.pts++; a.pts++; }
  }
  const out = [...rows.values()];
  for (const r of out) r.gd = r.gf - r.ga;
  return out.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
}

export function userDivision(state: GameState): 1 | 2 {
  return state.clubs.find((c) => c.id === state.userClubId)!.division;
}

export function nextUserFixture(state: GameState): Fixture | null {
  const div = userDivision(state);
  const fixtures = div === 1 ? state.fixtures.d1 : state.fixtures.d2;
  return (
    fixtures.find(
      (f) => f.round === state.week && (f.homeId === state.userClubId || f.awayId === state.userClubId)
    ) ?? null
  );
}

export function seasonOver(state: GameState): boolean {
  return state.week > SEASON_ROUNDS;
}

/**
 * Play the current round. The user's match report must be pre-simulated (so
 * the UI can play it back); every AI match is simulated here. Advances week,
 * updates morale/form/injuries and rolls fresh transfer offers.
 */
export function playRound(state: GameState, userReport: MatchReport): GameState {
  const s: GameState = structuredClone(state);
  const round = s.week;

  for (const fixtures of [s.fixtures.d1, s.fixtures.d2]) {
    for (const f of fixtures) {
      if (f.round !== round || f.played) continue;
      if (f.homeId === userReport.homeId && f.awayId === userReport.awayId) {
        f.homeGoals = userReport.homeGoals;
        f.awayGoals = userReport.awayGoals;
      } else {
        const rep = simulateMatch(s, f.homeId, f.awayId);
        f.homeGoals = rep.homeGoals;
        f.awayGoals = rep.awayGoals;
      }
      f.played = true;
    }
  }

  // Morale from the user result.
  const isHome = userReport.homeId === s.userClubId;
  const gf = isHome ? userReport.homeGoals : userReport.awayGoals;
  const ga = isHome ? userReport.awayGoals : userReport.homeGoals;
  const delta = gf > ga ? MORALE_WIN : gf < ga ? MORALE_LOSS : MORALE_DRAW;
  s.morale = clamp(s.morale + delta, MORALE_MIN, MORALE_MAX);

  // Weekly form drift + injury recovery for every player.
  for (const p of Object.values(s.players)) {
    p.form = clamp(p.form + (Math.random() - 0.5) * 0.06, 0.85, 1.15);
    if (p.injuryWeeks > 0) p.injuryWeeks--;
  }

  // Injury risk for the user's starters (keeps the squad decision interesting).
  for (const id of s.lineup) {
    if (id === null) continue;
    const p = s.players[id];
    if (p && p.injuryWeeks === 0 && Math.random() < 0.025) {
      p.injuryWeeks = 1 + Math.floor(Math.random() * 3);
      s.news.unshift(`${p.name} injured — out for ${p.injuryWeeks} week${p.injuryWeeks > 1 ? 's' : ''}.`);
    }
  }

  s.week = round + 1;
  s.incomingOffers = generateWeeklyOffers(s);

  // Repair the lineup if injuries/sales broke it.
  if (!isLineupValid(s, s.userClubId, s.lineup)) {
    s.lineup = autoPickLineup(s, s.userClubId, getFormation(s.formationId));
  }

  s.news = s.news.slice(0, 12);
  return s;
}

/** Wrap up the season: prize money, promotion/relegation, ageing, new fixtures. */
export function endSeason(state: GameState): { state: GameState; summary: SeasonSummary } {
  const s: GameState = structuredClone(state);
  const div = userDivision(s);
  const table = computeTable(s, div);
  const position = table.findIndex((r) => r.clubId === s.userClubId) + 1;
  const prize = prizeMoney(div, position);

  const d1Table = computeTable(s, 1);
  const d2Table = computeTable(s, 2);
  const relegatedIds = d1Table.slice(-PROMOTION_SPOTS).map((r) => r.clubId);
  const promotedIds = d2Table.slice(0, PROMOTION_SPOTS).map((r) => r.clubId);
  for (const c of s.clubs) {
    if (relegatedIds.includes(c.id)) c.division = 2;
    if (promotedIds.includes(c.id)) c.division = 1;
  }

  const summary: SeasonSummary = {
    year: s.seasonYear,
    division: div,
    position,
    pts: table[position - 1]?.pts ?? 0,
    champions: div === 1 && position === 1,
    promoted: div === 2 && promotedIds.includes(s.userClubId),
    relegated: div === 1 && relegatedIds.includes(s.userClubId),
    prize,
  };
  s.history.push(summary);
  s.budget += prize;

  // Ageing: youngsters develop, veterans decline, values move with both.
  for (const p of Object.values(s.players)) {
    p.age++;
    if (p.age <= 23) p.rating = Math.min(94, p.rating + 1);
    else if (p.age >= 31) p.rating = Math.max(48, p.rating - (p.age >= 34 ? 2 : 1));
    p.value = marketValue(p.rating, p.age);
    p.form = 1;
    p.injuryWeeks = 0;
  }

  s.seasonYear++;
  s.week = 1;
  s.morale = MORALE_START;
  s.incomingOffers = [];
  s.fixtures = {
    d1: generateFixtures(s.clubs.filter((c) => c.division === 1).map((c) => c.id)),
    d2: generateFixtures(s.clubs.filter((c) => c.division === 2).map((c) => c.id)),
  };
  s.lineup = autoPickLineup(s, s.userClubId, getFormation(s.formationId));
  s.news = [
    summary.champions
      ? `CHAMPIONS! ${s.clubs.find((c) => c.id === s.userClubId)!.name} win the title!`
      : summary.promoted
        ? 'PROMOTED! The club goes up to Division 1!'
        : summary.relegated
          ? 'Relegated to Division 2. Time to rebuild.'
          : `Season over — finished ${position}${ordinal(position)}. New season begins.`,
  ];
  return { state: s, summary };
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

/** How many players in the user's squad, for quick guards in the UI. */
export function userSquadSize(state: GameState): number {
  return getSquad(state, state.userClubId).length;
}
