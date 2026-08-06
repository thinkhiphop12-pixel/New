import type {
  Board, Club, Continental, Fixture, GameData, GameState, JobOffer, Knockout, LeagueDef, MatchReport,
  Player, Position, SeasonSummary, Staff, TableRow,
} from './types';
import {
  ACADEMY_UPGRADE_COST, CONTINENTAL_PRIZES, CONTINENTAL_SPOTS, CONTINENTAL_WEEKS, CUP_PRIZES,
  CUP_WEEKS, LEAGUES, MAX_SQUAD_SIZE, MORALE_DRAW, MORALE_LOSS, MORALE_MAX,
  MORALE_MIN, MORALE_START, MORALE_WIN, SEASON_ROUNDS, SIMULATED_LEAGUE_IDS, STADIUM_UPGRADE_COST,
  STAFF_MAX_LEVEL, STAFF_UPGRADE_COST, STAFF_WEEKLY_WAGE, gateBase, getFormation, getLeague,
  isPhantomLeague, isWinterBreakWeek, leagueAbove, leagueBelow, leagueIdForDivision, leagueName,
  prizeMoney, roundToWeek, startingBudget,
} from './gameRules';
import { matchRatings, simulateMatch } from './matchSimulation';
import {
  WAGE_BUDGET_HEADROOM, autoPickLineup, clubWageBill, ensureSquadNumbers, getSquad,
  isLineupValid, isOnLoan, squadAvgRating,
} from './teamManagement';
import { clamp, contractEndFor, marketValue, pickRandom, rollRetireAge, weeklyWage } from './utils';
import { tickTacticalFamiliarity } from './familiarity';
import { generateWeeklyNews } from './news';
import { seedClubIdentities } from './clubIdentity';
import { aiWeeklyTransfers, generateWeeklyOffers } from './transferMarket';
import { clubRunName, createKnockout, isClubAlive, knockoutRoundDue, playKnockoutRound, roundName, tieWinner, userTieThisRound } from './cups';
import {
  continentalRoundDue, continentalRoundName, continentalRunName, continentalTieWinner, createContinental,
  isContinentalClubAlive, playContinentalRound, tieAggregate, tieComplete, userContinentalTie,
} from './europeanCup';
import { evalScenarioAtSeasonEnd } from './scenarios';
import { pushInbox } from './inbox';
import { tickFinances, weeklyMatchdayIncome } from './finances';
import { FITNESS_RECOVER_REST, matchFitnessDrain, teamStaminaRate } from './tickEngine/xgModel';
import { tickFacilitiesWeek } from './facilities';
import { applyWeeklySchedule } from './schedule';
import { tickScoutNetwork } from './scouting';
import { applyDevPlans } from './development';

export { markInboxRead, markAllInboxRead } from './inbox';

/**
 * Single round-robin pairings via the circle method. `startRound` is the round
 * number the first matchday gets; `flip` swaps home and away for alternating
 * legs so nobody plays every meeting at home.
 */
function roundRobin(ids: number[], startRound: number, flip: boolean): Fixture[] {
  const n = ids.length;
  const half = n - 1;
  const fixtures: Fixture[] = [];
  const arr = ids.slice(1);
  for (let round = 0; round < half; round++) {
    const others = [ids[0], ...arr];
    for (let i = 0; i < n / 2; i++) {
      const a = others[i];
      const b = others[n - 1 - i];
      const homeFirst = (round % 2 === 0) !== flip;
      fixtures.push({
        round: startRound + round,
        homeId: homeFirst ? a : b,
        awayId: homeFirst ? b : a,
        played: false, homeGoals: 0, awayGoals: 0,
      });
    }
    arr.unshift(arr.pop()!);
  }
  return fixtures;
}

/**
 * A league's fixture list: `rounds` full round-robins (2 = home and away,
 * 3 = the Scottish Premiership's pre-split phase, 4 = the Scottish
 * Championship). Match rounds are mapped onto calendar weeks by `roundToWeek`,
 * which steps over the winter break.
 */
export function generateLeagueFixtures(clubIds: number[], rounds = 2): Fixture[] {
  if (clubIds.length < 2) return [];
  const ids = [...clubIds];
  const perRobin = ids.length - 1;
  const out: Fixture[] = [];
  for (let r = 0; r < rounds; r++) {
    out.push(...roundRobin(ids, r * perRobin + 1, r % 2 === 1));
  }
  for (const f of out) f.round = roundToWeek(f.round);
  return out.sort((a, b) => a.round - b.round);
}

/** Back-compat alias: a plain home-and-away season. */
export function generateFixtures(clubIds: number[]): Fixture[] {
  return generateLeagueFixtures(clubIds, 2);
}

/**
 * The Scottish split. After the pre-split rounds the table freezes into a top
 * and bottom half of `splitSize`; each half plays one more round-robin among
 * itself and clubs cannot cross the split — a club in the bottom half finishes
 * 7th at best however many points it ends on.
 */
export function splitFixtures(topIds: number[], bottomIds: number[], startWeek: number): Fixture[] {
  const out = [
    ...roundRobin(topIds, 1, false),
    ...roundRobin(bottomIds, 1, true),
  ];
  // Lay the extra matchdays out on successive non-break calendar weeks.
  const weeks = new Map<number, number>();
  let w = startWeek;
  for (const r of [...new Set(out.map((f) => f.round))].sort((a, b) => a - b)) {
    while (isWinterBreakWeek(w)) w++;
    weeks.set(r, w++);
  }
  return out.map((f) => ({ ...f, round: weeks.get(f.round)! })).sort((a, b) => a.round - b.round);
}

/** Every league the game simulates, in pyramid order. */
export const ALL_LEAGUES: string[] = SIMULATED_LEAGUE_IDS;

/** League ids that actually hold clubs in this save, pyramid order. */
export function activeLeagueIds(state: Pick<GameState, 'clubs'>): string[] {
  return ALL_LEAGUES.filter((id) => state.clubs.some((c) => c.leagueId === id && !c.dormant));
}

export function leagueClubs(state: Pick<GameState, 'clubs'>, leagueId: string): Club[] {
  return state.clubs.filter((c) => c.leagueId === leagueId && !c.dormant);
}

/** The league fixture list for any league id. */
export function leagueFixtures(state: GameState, leagueId: string): Fixture[] {
  return state.fixtures[leagueId] ?? [];
}

export function allFixtures(state: GameState): Fixture[][] {
  return Object.values(state.fixtures).filter((list) => list.length > 0);
}

function makeSeasonFixtures(state: Pick<GameState, 'clubs'>): GameState['fixtures'] {
  const out: GameState['fixtures'] = {};
  for (const lg of LEAGUES) {
    if (lg.phantom) continue;
    const ids = leagueClubs(state, lg.id).map((c) => c.id);
    // A split league only schedules its pre-split rounds up front; the rest is
    // generated once the halves are known (see applySplits).
    out[lg.id] = ids.length >= 2 ? generateLeagueFixtures(ids, lg.rounds) : [];
  }
  return out;
}

/**
 * Generate the post-split round-robins for any split league whose pre-split
 * programme has finished. Idempotent — a league already split is skipped.
 */
export function applySplits(s: GameState): void {
  s.splitGroups = s.splitGroups ?? {};
  for (const lg of LEAGUES) {
    if (lg.phantom || !lg.splitSize) continue;
    const fixtures = s.fixtures[lg.id];
    if (!fixtures || !fixtures.length) continue;
    if (s.splitGroups[lg.id]) continue;
    if (fixtures.some((f) => !f.played)) continue;
    const order = computeTable(s, lg.id).map((r) => r.clubId);
    if (order.length < lg.splitSize * 2) continue;
    const top = order.slice(0, lg.splitSize);
    const bottom = order.slice(lg.splitSize);
    s.splitGroups[lg.id] = [top, bottom];
    const lastRound = Math.max(...fixtures.map((f) => f.round));
    s.fixtures[lg.id] = [...fixtures, ...splitFixtures(top, bottom, lastRound + 1)];
  }
}

/**
 * Board expectations from the club's squad rank inside its own league, graded
 * against that league's real promotion / play-off / relegation shape rather
 * than a fixed 1–3 up, 22–24 down assumption.
 */
export function makeBoardObjective(state: GameState): Board {
  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const lg = getLeague(club.leagueId);
  const peers = leagueClubs(state, club.leagueId)
    .map((c) => ({ id: c.id, avg: squadAvgRating(state, c.id) }))
    .sort((a, b) => b.avg - a.avg);
  const n = Math.max(peers.length, 1);
  const rank = peers.findIndex((p) => p.id === club.id) + 1;
  const up = lg.autoPromotion;
  const po = up + lg.playoffSpots;
  const safe = n - lg.relegation;

  let objective: string;
  let minPosition: number;
  if (lg.level === 1 && rank <= 2) {
    objective = 'Challenge for the title (finish top 2)';
    minPosition = 2;
  } else if (up > 0 && rank <= up) {
    objective = `Win automatic promotion (finish top ${up})`;
    minPosition = up;
  } else if (po > up && rank <= po) {
    objective = `Reach the promotion play-offs (finish top ${po})`;
    minPosition = po;
  } else if (lg.level === 1 && rank <= Math.max(4, lg.championsLeague)) {
    objective = `Qualify for Europe (finish top ${Math.max(4, lg.championsLeague)})`;
    minPosition = Math.max(4, lg.championsLeague);
  } else if (rank <= Math.ceil(n / 4)) {
    objective = 'Finish in the top 6';
    minPosition = 6;
  } else if (rank <= Math.ceil(n / 2)) {
    objective = 'Finish in the top half';
    minPosition = Math.floor(n / 2);
  } else {
    objective = 'Avoid relegation';
    minPosition = Math.max(1, safe);
  }
  return { objective, minPosition, confidence: 60 };
}

/** Domestic cup for one season: all clubs, byes to square the bracket. */
export function makeDomesticCup(state: Pick<GameState, 'clubs'>): Knockout {
  // The BALLKNW Cup is the English knockout — the top three English tiers (up
  // to 63 entrants) keep the bracket within the six scheduled CUP_WEEKS. The
  // lower tiers and every foreign league focus on their league campaign.
  const ids = state.clubs
    .filter((c) => {
      const lg = getLeague(c.leagueId);
      return !c.dormant && lg.country === 'England' && lg.level <= 3;
    })
    .map((c) => c.id);
  // Largest power of two ≤ entrants becomes the round-2 field size.
  let bracket = 2;
  while (bracket * 2 <= ids.length) bracket *= 2;
  const byes = ids.length === bracket ? 0 : 2 * bracket - ids.length;
  const totalRounds = Math.log2(bracket) + (byes > 0 ? 1 : 0);
  return createKnockout('BALLKNW Cup', CUP_WEEKS.slice(-totalRounds), ids, byes);
}

/** Continental cup for one season from the given participant clubs. */
export function makeContinental(state: Pick<GameState, 'clubs'>, participantIds: number[]): Continental {
  return createContinental('Continental Champions Cup', CONTINENTAL_WEEKS, participantIds, state.clubs);
}

const YOUTH_FIRST = ['Alfie', 'Ben', 'Callum', 'Dan', 'Eli', 'Finn', 'George', 'Harry', 'Isaac', 'Jack', 'Kai', 'Leo', 'Mason', 'Noah', 'Oscar', 'Reece', 'Sam', 'Theo', 'Will', 'Zack'];
const YOUTH_LAST = ['Abbott', 'Barnes', 'Clarke', 'Dawson', 'Ellis', 'Foster', 'Grant', 'Hayes', 'Ingram', 'Jennings', 'Kerr', 'Lowe', 'Mercer', 'Nolan', 'Osborne', 'Price', 'Quinn', 'Reid', 'Shaw', 'Turner'];
const YOUTH_ROLES: [Position, string][] = [['GK', 'GK'], ['DEF', 'CB'], ['DEF', 'RB'], ['MID', 'CM'], ['MID', 'CAM'], ['FWD', 'ST'], ['FWD', 'LW']];

export function makeYouthPlayer(id: number, clubId: number, academyLevel: number, seasonYear = 2026): Player {
  const [pos, role] = pickRandom(YOUTH_ROLES);
  const base = 52 + academyLevel * 4;
  const rating = base + Math.floor(Math.random() * 9);
  const age = 16 + Math.floor(Math.random() * 3);
  const stat = () => clamp(rating - 6 + Math.floor(Math.random() * 14), 30, 90);
  const value = marketValue(rating, age);
  // Academy kids are raw: a better academy finds bigger ceilings, and the gap
  // above their current rating is what makes them worth playing.
  const potential = Math.min(99, rating + 8 + academyLevel * 2 + Math.floor(Math.random() * 12));
  return {
    id,
    name: `${pickRandom(YOUTH_FIRST)} ${pickRandom(YOUTH_LAST)}`,
    nat: 'Academy',
    pos,
    role,
    rating,
    potential,
    pac: stat(), sho: stat(), pas: stat(), dri: stat(), def: stat(), phy: stat(),
    gkReflexes: pos === 'GK' ? stat() : 5 + Math.floor(Math.random() * 15),
    gkPositioning: pos === 'GK' ? stat() : 5 + Math.floor(Math.random() * 15),
    height: pos === 'GK' ? 185 + Math.floor(Math.random() * 15) : 168 + Math.floor(Math.random() * 24),
    altPos: [],
    age,
    value,
    wage: weeklyWage(value, rating),
    clubId,
    form: 1,
    injuryWeeks: 0,
    contractYears: 3,
    contractEnd: contractEndFor(seasonYear, 3),
    releaseClause: 0,
    loyal: Math.random() < 0.8, // academy graduates start out attached to the club
    transferListed: false,
    wantsMove: false,
    promisedStatus: null,
    retireAge: rollRetireAge(pos === 'GK'),
    morale: 70 + Math.floor(Math.random() * 20),
    fitness: 90 + Math.floor(Math.random() * 11),
    sharpness: 50 + Math.floor(Math.random() * 20),
    chem: 60 + Math.floor(Math.random() * 20),
    apps: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    saves: 0,
    lgApps: 0,
    lgGoals: 0,
    career: [],
  };
}

/* ---------------------------------------------------------------------------
   PHANTOM POOL CLUBS
   ---------------------------------------------------------------------------
   Phantom leagues are not simulated, so a club sitting in one needs no squad
   until the day it rotates up. Pool clubs are therefore created dormant and
   squadless, and given a generated squad only at the moment they are promoted
   into a league the game actually plays (see wakePoolClub). That keeps the
   save small while still giving every league real promotion churn.
--------------------------------------------------------------------------- */

const FILLER_ROLES: [Position, string][] = [
  ['GK', 'GK'], ['GK', 'GK'],
  ['DEF', 'CB'], ['DEF', 'CB'], ['DEF', 'CB'], ['DEF', 'LB'], ['DEF', 'RB'],
  ['MID', 'CDM'], ['MID', 'CM'], ['MID', 'CM'], ['MID', 'CAM'], ['MID', 'LM'], ['MID', 'RM'],
  ['FWD', 'LW'], ['FWD', 'RW'], ['FWD', 'ST'], ['FWD', 'ST'], ['FWD', 'ST'],
];

function makeFillerPlayer(id: number, clubId: number, target: number, seasonYear: number, slot: number): Player {
  const [pos, role] = FILLER_ROLES[slot % FILLER_ROLES.length];
  const rating = clamp(target + Math.floor(Math.random() * 9) - 4, 40, 90);
  const age = 18 + Math.floor(Math.random() * 15);
  const stat = () => clamp(rating - 6 + Math.floor(Math.random() * 14), 30, 92);
  const value = marketValue(rating, age);
  const years = 1 + Math.floor(Math.random() * 4);
  return {
    id,
    name: `${pickRandom(YOUTH_FIRST)} ${pickRandom(YOUTH_LAST)}`,
    nat: 'Unattached',
    pos, role, rating,
    potential: Math.min(99, rating + (age <= 22 ? 4 + Math.floor(Math.random() * 10) : Math.floor(Math.random() * 3))),
    pac: stat(), sho: stat(), pas: stat(), dri: stat(), def: stat(), phy: stat(),
    gkReflexes: pos === 'GK' ? stat() : 5 + Math.floor(Math.random() * 15),
    gkPositioning: pos === 'GK' ? stat() : 5 + Math.floor(Math.random() * 15),
    height: pos === 'GK' ? 185 + Math.floor(Math.random() * 15) : 168 + Math.floor(Math.random() * 24),
    altPos: [],
    age, value,
    wage: weeklyWage(value, rating),
    clubId,
    form: 1,
    injuryWeeks: 0,
    contractYears: years,
    contractEnd: contractEndFor(seasonYear, years),
    releaseClause: 0,
    loyal: Math.random() < 0.5,
    transferListed: false,
    wantsMove: false,
    promisedStatus: null,
    retireAge: Math.max(age + 1, rollRetireAge(pos === 'GK')),
    morale: 60 + Math.floor(Math.random() * 25),
    fitness: 85 + Math.floor(Math.random() * 16),
    sharpness: 60 + Math.floor(Math.random() * 25),
    chem: 55 + Math.floor(Math.random() * 30),
    apps: 0, goals: 0, assists: 0, cleanSheets: 0, saves: 0, lgApps: 0, lgGoals: 0,
    career: [],
    seasonRatingSum: 0,
    seasonRatingCount: 0,
  };
}

const POOL_SIZE = 4;

function nextClubId(s: GameState): number {
  const next = Math.max(s.nextClubId ?? 0, ...s.clubs.map((c) => c.id)) + 1;
  s.nextClubId = next;
  return next;
}

/** Create one dormant club at the back of a phantom league's pool. */
function makePoolClub(s: GameState, leagueId: string, seq: number): Club {
  const lg = getLeague(leagueId);
  const id = nextClubId(s);
  const name = `${lg.name} ${seq}`;
  const club: Club = {
    id,
    name,
    code: lg.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'AFC',
    color: '#5a5a5a',
    leagueId,
    playerIds: [],
    dormant: true,
  };
  s.clubs.push(club);
  return club;
}

/** Top every phantom league's pool back up to POOL_SIZE dormant clubs. */
export function refillPhantomPools(s: GameState): void {
  s.phantomPools = s.phantomPools ?? {};
  for (const lg of LEAGUES) {
    if (!lg.phantom) continue;
    const pool = (s.phantomPools[lg.id] = s.phantomPools[lg.id] ?? []);
    let seq = 1;
    while (pool.length < POOL_SIZE) {
      pool.push(makePoolClub(s, lg.id, s.seasonYear * 10 + seq++).id);
    }
  }
}

/**
 * A dormant pool club has just been promoted into a league the game plays, so
 * it needs a squad. Clubs that dropped in from a real league already have one
 * and keep it.
 */
function wakePoolClub(s: GameState, club: Club, targetLeagueId: string, seasonYear: number): void {
  club.dormant = false;
  if (club.playerIds.length > 0) return;
  const lg = getLeague(targetLeagueId);
  // Promoted sides are weaker than the division they join: base the squad on
  // the weakest existing side in it, or a low floor if the league is empty.
  const peers = leagueClubs(s, targetLeagueId);
  const weakest = peers.length
    ? Math.min(...peers.map((c) => squadAvgRating(s, c.id)))
    : 70 - lg.level * 4;
  const target = clamp(Math.round(weakest) - 1, 46, 88);
  for (let i = 0; i < 18; i++) {
    const p = makeFillerPlayer(s.nextPlayerId++, club.id, target, seasonYear, i);
    s.players[p.id] = p;
    club.playerIds.push(p.id);
  }
}

export function newGame(data: GameData, userClubId: number, managerName = 'The Gaffer', seasonYear = 2026): GameState {
  const clubs: Club[] = data.clubs.map(({ division, ...c }) => ({
    ...c,
    leagueId: leagueIdForDivision(division),
    playerIds: [...c.playerIds],
  }));
  const players: GameState['players'] = {};
  for (const p of data.players) {
    const years = 1 + (p.id % 4);
    players[p.id] = {
      ...p,
      wage: p.wage ?? weeklyWage(p.value, p.rating),
      form: 1,
      injuryWeeks: 0,
      contractYears: years,
      contractEnd: contractEndFor(seasonYear, years),
      transferListed: Math.random() < 0.03,
      wantsMove: false,
      promisedStatus: null,
      morale: 65 + Math.floor(Math.random() * 31),
      fitness: 75 + Math.floor(Math.random() * 26),
      sharpness: 60 + Math.floor(Math.random() * 31),
      // Seeded squads read as established sides with a few newer faces.
      chem: 55 + Math.floor(Math.random() * 36),
      apps: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      saves: 0,
      lgApps: 0,
      lgGoals: 0,
      career: [],
      seasonRatingSum: 0,
      seasonRatingCount: 0,
    };
  }

  const userClub = clubs.find((c) => c.id === userClubId)!;
  const state: GameState = {
    version: 6,
    userClubId,
    seasonYear,
    week: 1,
    budget: startingBudget(userClub.leagueId),
    morale: MORALE_START,
    formationId: '4-3-3',
    lineup: [],
    tactics: { style: 'balanced', pressing: 'mid', tempo: 'normal', width: 'standard', mentality: 'balanced' },
    training: 'balanced',
    chemistry: 50,
    fanConfidence: 60,
    board: { objective: '', minPosition: 17, confidence: 60 },
    manager: {
      name: managerName,
      // Reputation on appointment tracks how high up the pyramid the job is.
      reputation: clamp(60 - getLeague(userClub.leagueId).level * 10, 20, 50),
      wins: 0, draws: 0, losses: 0, seasons: 0, trophies: [],
    },
    academyLevel: 1,
    captainId: null,
    staff: { coach: 0, physio: 0, scout: 0 },
    stadiumLevel: 1,
    ledger: [],
    cup: { name: '', weeks: [], rounds: [], byes: [], round: 0, winnerId: null },
    continental: { name: '', weeks: [], ties: [], seedRank: {}, directQualifiers: [], round: 0, winnerId: null },
    jobOffers: [],
    records: { biggestWin: null, bestFinish: null, topSeasonScorer: null },
    legacy: {},
    nextPlayerId: Math.max(...data.players.map((p) => p.id)) + 1,
    players,
    clubs,
    fixtures: {},
    phantomPools: {},
    splitGroups: {},
    nextClubId: Math.max(...data.clubs.map((c) => c.id)) + 1,
    incomingOffers: [],
    history: [],
    news: [`Welcome to ${userClub.name}! The board expects a solid season.`],
    inbox: [],
    nextInboxId: 1,
    pressWeek: 0,
  };
  refillPhantomPools(state);
  state.fixtures = makeSeasonFixtures(state);
  state.board = makeBoardObjective(state);
  state.cup = makeDomesticCup(state);
  state.continental = makeContinental(state, continentalEntrants(state));
  state.lineup = autoPickLineup(state, userClubId, getFormation(state.formationId));
  // Give every club a play-style identity and reputation band before the first
  // drilling tick, so familiarity has something to work from.
  seedClubIdentities(state);
  ensureSquadNumbers(state);
  // Sanctioned wage bill: what the inherited squad costs, plus headroom.
  state.wageBudget = Math.round(weeklyWageBill(state) * WAGE_BUDGET_HEADROOM);
  state.playStyle = state.playStyle ?? state.clubs.find((c) => c.id === userClubId)?.playStyle ?? 'balanced';
  state.news.push(`Board objective: ${state.board.objective}.`);
  pushInbox(state, {
    category: 'club',
    title: `Welcome to ${userClub.name}`,
    body: `You have been appointed manager of ${userClub.name}.\n\nThe board's objective for this season: ${state.board.objective}. Finish ${state.board.minPosition}${ordinal(state.board.minPosition)} or higher to keep their confidence.\n\nGood luck, ${managerName}.`,
  });
  return state;
}

export function computeTable(state: GameState, leagueId: string): TableRow[] {
  const clubs = leagueClubs(state, leagueId);
  const rows = new Map<number, TableRow>(
    clubs.map((c) => [c.id, { clubId: c.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 }])
  );
  const fixtures = leagueFixtures(state, leagueId);
  for (const f of fixtures) {
    if (!f.played) continue;
    const h = rows.get(f.homeId);
    const a = rows.get(f.awayId);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += f.homeGoals; h.ga += f.awayGoals;
    a.gf += f.awayGoals; a.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) { h.won++; h.pts += 3; a.lost++; }
    else if (f.homeGoals < f.awayGoals) { a.won++; a.pts += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.pts++; a.pts++; }
  }
  const out = [...rows.values()];
  for (const r of out) r.gd = r.gf - r.ga;
  out.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
  // Scottish split: once the halves are frozen a club cannot cross them, so the
  // bottom six finish 7th–12th however many points they end on.
  const groups = state.splitGroups?.[leagueId];
  if (groups && groups.length === 2) {
    const half = new Map<number, number>();
    groups.forEach((ids, i) => ids.forEach((id) => half.set(id, i)));
    out.sort((x, y) => (half.get(x.clubId) ?? 0) - (half.get(y.clubId) ?? 0));
  }
  return out;
}

/** The league id the user's club is registered in. */
export function userLeagueId(state: GameState): string {
  return state.clubs.find((c) => c.id === state.userClubId)!.leagueId;
}

/** The user's league definition. */
export function userLeague(state: GameState): LeagueDef {
  return getLeague(userLeagueId(state));
}

/**
 * Continental Champions Cup entrants: the strongest sides from each top flight,
 * allocated by that league's Champions League slot count and ordered by squad
 * strength, so the field reflects UEFA's per-league allocation.
 */
export function continentalEntrants(state: GameState): number[] {
  const seeds: { id: number; avg: number }[] = [];
  for (const lg of LEAGUES) {
    const slots = lg.championsLeague + lg.clPlayoff;
    if (lg.phantom || slots <= 0) continue;
    const table = computeTable(state, lg.id);
    const order = table.length
      ? table.map((r) => r.clubId)
      : leagueClubs(state, lg.id)
          .sort((a, b) => squadAvgRating(state, b.id) - squadAvgRating(state, a.id))
          .map((c) => c.id);
    for (const id of order.slice(0, slots)) seeds.push({ id, avg: squadAvgRating(state, id) });
  }
  return seeds.sort((a, b) => b.avg - a.avg).map((x) => x.id).slice(0, CONTINENTAL_SPOTS);
}

export function nextUserFixture(state: GameState): Fixture | null {
  const fixtures = leagueFixtures(state, userLeagueId(state));
  return (
    fixtures.find(
      (f) => f.round === state.week && (f.homeId === state.userClubId || f.awayId === state.userClubId)
    ) ?? null
  );
}

export function userPosition(state: GameState): number {
  const table = computeTable(state, userLeagueId(state));
  return table.findIndex((r) => r.clubId === state.userClubId) + 1;
}

export function seasonOver(state: GameState): boolean {
  return state.week > SEASON_ROUNDS;
}

/** Backroom staff with defaults for saves from before staff existed. */
export function getStaff(state: GameState): Staff {
  return state.staff ?? { coach: 0, physio: 0, scout: 0 };
}

export function getStadiumLevel(state: GameState): number {
  return state.stadiumLevel ?? 1;
}

/** Weekly matchday income: league base scaled by position, fans and stadium. */
export function gateIncome(state: GameState): number {
  // Phase 8: delegates to the capacity × ticket-tier × opponent matchday model
  // in engine/finances.ts, which pays per home fixture instead of the old flat
  // per-week `gateBase` drip.
  return weeklyMatchdayIncome(state) * (1 + 0.25 * (getStadiumLevel(state) - 1));
}

/** The user's total weekly wage bill (loanees are off the books). */
export function weeklyWageBill(state: GameState): number {
  return clubWageBill(state, state.userClubId);
}

/** Weekly staff wages: legacy per-level backroom figure plus every named
 *  coach (Staff Hub) and named scout (Scouting Network) actually on the
 *  books — the single wage line every screen and the weekly tick reads, so
 *  hiring named staff has a real, immediate budget cost. */
export function staffWageBill(state: GameState): number {
  const st = getStaff(state);
  const legacy = (st.coach + st.physio + st.scout) * STAFF_WEEKLY_WAGE;
  const coaches = (state.facilities?.coaches ?? []).reduce((sum, c) => sum + c.wage, 0);
  const scouts = (state.scouting?.scouts ?? []).reduce((sum, sc) => sum + sc.wage, 0);
  return legacy + coaches + scouts;
}

/** Credit apps, goals and match ratings from a report onto the players involved. */
function applyReportStats(s: GameState, report: MatchReport): void {
  const ratings = matchRatings(report);
  for (const id of [...report.homeLineup, ...report.awayLineup]) {
    const p = s.players[id];
    if (!p) continue;
    p.apps++;
    p.seasonRatingSum = (p.seasonRatingSum ?? 0) + (ratings[id] ?? 6.5);
    p.seasonRatingCount = (p.seasonRatingCount ?? 0) + 1;
    // Strong or weak showings nudge form.
    const r = ratings[id] ?? 6.5;
    if (r >= 8) p.form = clamp(p.form + 0.02, 0.85, 1.15);
    else if (r <= 6) p.form = clamp(p.form - 0.02, 0.85, 1.15);
  }
  for (const e of report.events) {
    if (e.type === 'goal' && e.playerId !== undefined) {
      const p = s.players[e.playerId];
      if (p) p.goals++;
      const a = e.assistId !== undefined ? s.players[e.assistId] : undefined;
      if (a) a.assists++;
    }
    // Match injuries (gap 25): seven types, day-based layoff, and the serious
    // ones permanently cost potential — an ACL rupture takes 3 off the ceiling.
    if (e.type === 'injury' && e.playerId !== undefined && e.injuryDays) {
      const p = s.players[e.playerId];
      if (p) {
        p.injuryDays = Math.max(p.injuryDays ?? 0, e.injuryDays);
        p.injuryType = e.injuryType ?? 'knock';
        p.injuryWeeks = Math.max(p.injuryWeeks, Math.ceil(p.injuryDays / 7));
        if (e.potDrop) p.potential = Math.max(p.rating, p.potential - e.potDrop);
      }
    }
  }
  // Per-match condition (gap 26): minutes played drain fitness, resting tops it
  // up, and match sharpness only comes from actually playing.
  applyMatchCondition(s, report);
}

/** Fitness/sharpness bookkeeping for everyone involved in a finished match. */
function applyMatchCondition(s: GameState, report: MatchReport): void {
  const played = new Set([...report.homeLineup, ...report.awayLineup]);
  for (const clubId of [report.homeId, report.awayId]) {
    const club = s.clubs.find((c) => c.id === clubId);
    if (!club) continue;
    const rate = teamStaminaRate(clubId === s.userClubId ? s.tactics : { style: 'balanced', pressing: 'mid', tempo: 'normal', width: 'standard' });
    for (const id of club.playerIds) {
      const p = s.players[id];
      if (!p) continue;
      if (played.has(id)) {
        // Assume a full shift; substitutes are already the minority case and
        // the report does not track minutes.
        p.fitness = clamp(p.fitness - matchFitnessDrain(p, 90, rate) + 20, 15, 100);
        p.sharpness = clamp(p.sharpness + 7, 0, 100);
      } else if (p.injuryWeeks === 0) {
        p.fitness = clamp(p.fitness + FITNESS_RECOVER_REST, 15, 100);
        p.sharpness = clamp(p.sharpness - 2, 0, 100);
      }
    }
  }
}

function money(v: number): string {
  return v >= 1_000_000 ? `£${(Math.round(v / 100_000) / 10).toFixed(1)}M` : `£${Math.round(v / 1000)}K`;
}

/** Play one knockout round: prizes, morale, news and trophies for the user. */
function runKnockout(s: GameState, k: Knockout, prizes: number[], trophyLabel: string): void {
  const wasAlive = isClubAlive(k, s.userClubId);
  const playedRound = k.round;
  const rName = roundName(k, playedRound);
  const userTie = userTieThisRound(k, s.userClubId);
  const reports = playKnockoutRound(s, k);
  for (const rep of reports) applyReportStats(s, rep);

  if (userTie) {
    const won = tieWinner(userTie) === s.userClubId;
    const isHome = userTie.homeId === s.userClubId;
    const opp = s.clubs.find((c) => c.id === (isHome ? userTie.awayId : userTie.homeId))?.name ?? '???';
    const score = `${userTie.homeGoals}–${userTie.awayGoals}${userTie.pensWinnerId ? ' (pens)' : ''}`;
    if (won) {
      const prize = prizes[playedRound + (prizes.length - k.weeks.length)] ?? 0;
      s.budget += prize;
      s.ledger.unshift({ week: s.week, desc: `${k.name} ${rName} win`, amount: prize });
      s.morale = clamp(s.morale + 3, MORALE_MIN, MORALE_MAX);
      s.fanConfidence = clamp(s.fanConfidence + 3, 5, 99);
      s.news.unshift(`${k.name} ${rName}: beat ${opp} ${score} — ${money(prize)} banked.`);
      if (k.winnerId === s.userClubId) {
        const trophy = `${trophyLabel} ${s.seasonYear}/${(s.seasonYear + 1) % 100}`;
        s.manager.trophies.push(trophy);
        s.manager.reputation = clamp(s.manager.reputation + 8, 0, 100);
        s.board.confidence = clamp(s.board.confidence + 15, 1, 99);
        s.news.unshift(`${s.clubs.find((c) => c.id === s.userClubId)!.name} WIN the ${k.name}!`);
        pushInbox(s, {
          category: 'match',
          title: `${trophy} won!`,
          body: `${s.clubs.find((c) => c.id === s.userClubId)!.name} have won the ${k.name}, beating ${opp} ${score} in the final.\n\nThe board and fans are delighted — your reputation as a manager grows.`,
        });
      }
    } else {
      s.morale = clamp(s.morale - 3, MORALE_MIN, MORALE_MAX);
      s.fanConfidence = clamp(s.fanConfidence - 3, 5, 99);
      s.news.unshift(`${k.name} ${rName}: knocked out by ${opp} (${score}).`);
    }
  } else if (wasAlive && k.byes.includes(s.userClubId) && playedRound === 0) {
    s.news.unshift(`${k.name}: bye into the next round.`);
  } else if (k.winnerId && k.winnerId !== s.userClubId && k.round >= k.weeks.length) {
    const w = s.clubs.find((c) => c.id === k.winnerId)?.name ?? '???';
    s.news.unshift(`${w} win the ${k.name}.`);
  }
}

/**
 * Continental sibling of runKnockout, needed rather than reusing it because a
 * tie here can span two legs — the round only fully resolves (and a prize is
 * due) once tieComplete() says so, not on every single leg played. Reports
 * the individual leg's score as it's played, then the aggregate outcome once
 * the tie is decided.
 */
function runContinental(s: GameState, c: Continental, prizes: number[]): void {
  const wasAlive = isContinentalClubAlive(c, s.userClubId);
  const playedRound = c.round;
  const rName = continentalRoundName(c, playedRound);
  const userTie = userContinentalTie(c, s.userClubId);
  const reports = playContinentalRound(s, c);
  for (const rep of reports) applyReportStats(s, rep);

  if (userTie) {
    const isHome = userTie.homeId === s.userClubId;
    const opp = s.clubs.find((c2) => c2.id === (isHome ? userTie.awayId : userTie.homeId))?.name ?? '???';
    const lastLeg = userTie.legs[userTie.legs.length - 1];
    if (!lastLeg) return; // nothing played this call (shouldn't happen, but stay quiet rather than crash)

    if (!tieComplete(userTie)) {
      // First leg of a two-legged tie: report the leg score, no prize yet.
      const legIsHome = lastLeg.homeId === s.userClubId;
      const score = `${legIsHome ? lastLeg.homeGoals : lastLeg.awayGoals}–${legIsHome ? lastLeg.awayGoals : lastLeg.homeGoals}`;
      s.news.unshift(`${c.name} ${rName} (1st leg): ${score} vs ${opp}.`);
      return;
    }

    const won = continentalTieWinner(userTie) === s.userClubId;
    const agg = tieAggregate(userTie);
    const myAgg = isHome ? agg.home : agg.away;
    const oppAgg = isHome ? agg.away : agg.home;
    const score = userTie.twoLegged
      ? `${myAgg}–${oppAgg} agg${lastLeg.pensWinnerId ? ' (pens)' : ''}`
      : `${myAgg}–${oppAgg}${lastLeg.pensWinnerId ? ' (pens)' : ''}`;
    if (won) {
      const prize = prizes[playedRound] ?? 0;
      s.budget += prize;
      s.ledger.unshift({ week: s.week, desc: `${c.name} ${rName} win`, amount: prize });
      s.morale = clamp(s.morale + 3, MORALE_MIN, MORALE_MAX);
      s.fanConfidence = clamp(s.fanConfidence + 3, 5, 99);
      s.news.unshift(`${c.name} ${rName}: beat ${opp} ${score} — ${money(prize)} banked.`);
      if (c.winnerId === s.userClubId) {
        const trophy = `Continental Champions Cup ${s.seasonYear}/${(s.seasonYear + 1) % 100}`;
        s.manager.trophies.push(trophy);
        s.manager.reputation = clamp(s.manager.reputation + 8, 0, 100);
        s.board.confidence = clamp(s.board.confidence + 15, 1, 99);
        s.news.unshift(`${s.clubs.find((c2) => c2.id === s.userClubId)!.name} WIN the ${c.name}!`);
        pushInbox(s, {
          category: 'match',
          title: `${trophy} won!`,
          body: `${s.clubs.find((c2) => c2.id === s.userClubId)!.name} have won the ${c.name}, beating ${opp} ${score} in the final.\n\nThe board and fans are delighted — your reputation as a manager grows.`,
        });
      }
    } else {
      s.morale = clamp(s.morale - 3, MORALE_MIN, MORALE_MAX);
      s.fanConfidence = clamp(s.fanConfidence - 3, 5, 99);
      s.news.unshift(`${c.name} ${rName}: knocked out by ${opp} (${score}).`);
    }
  } else if (wasAlive && c.round === 0 && c.directQualifiers.includes(s.userClubId)) {
    s.news.unshift(`${c.name}: straight into the Round of 16 as a top seed.`);
  } else if (c.winnerId && c.winnerId !== s.userClubId && c.round >= c.weeks.length) {
    const w = s.clubs.find((c2) => c2.id === c.winnerId)?.name ?? '???';
    s.news.unshift(`${w} win the ${c.name}.`);
  }
}

/**
 * Play the current round. The user's match report must be pre-simulated (so
 * the UI can play it back); every AI match is simulated here. Advances week,
 * updates morale/form/injuries/finances/cups and rolls fresh transfer offers.
 */
export function playRound(state: GameState, userReport: MatchReport): GameState {
  const s: GameState = structuredClone(state);
  const round = s.week;
  const userClub = s.clubs.find((c) => c.id === s.userClubId)!;

  for (const fixtures of allFixtures(s)) {
    for (const f of fixtures) {
      if (f.round !== round || f.played) continue;
      if (f.homeId === userReport.homeId && f.awayId === userReport.awayId) {
        f.homeGoals = userReport.homeGoals;
        f.awayGoals = userReport.awayGoals;
        applyReportStats(s, userReport);
      } else {
        const rep = simulateMatch(s, f.homeId, f.awayId);
        f.homeGoals = rep.homeGoals;
        f.awayGoals = rep.awayGoals;
        applyReportStats(s, rep);
      }
      f.played = true;
    }
  }

  // Morale, fan confidence, chemistry and the manager's record from the result.
  const isHome = userReport.homeId === s.userClubId;
  const gf = isHome ? userReport.homeGoals : userReport.awayGoals;
  const ga = isHome ? userReport.awayGoals : userReport.homeGoals;
  const delta = gf > ga ? MORALE_WIN : gf < ga ? MORALE_LOSS : MORALE_DRAW;
  s.morale = clamp(s.morale + delta, MORALE_MIN, MORALE_MAX);
  if (gf > ga) {
    s.manager.wins++;
    s.fanConfidence = clamp(s.fanConfidence + 4, 5, 99);
    s.chemistry = clamp(s.chemistry + 2, 0, 100);
  } else if (gf < ga) {
    s.manager.losses++;
    s.fanConfidence = clamp(s.fanConfidence - 5, 5, 99);
    s.chemistry = clamp(s.chemistry + 1, 0, 100);
  } else {
    s.manager.draws++;
    s.fanConfidence = clamp(s.fanConfidence - 1, 5, 99);
    s.chemistry = clamp(s.chemistry + 1, 0, 100);
  }

  // Club record: biggest win.
  if (gf > ga) {
    const margin = gf - ga;
    if (!s.records.biggestWin || margin > s.records.biggestWin.margin) {
      const opp = s.clubs.find((c) => c.id === (isHome ? userReport.awayId : userReport.homeId))?.name ?? '???';
      s.records.biggestWin = { margin, text: `${gf}–${ga} vs ${opp} (${s.seasonYear}/${(s.seasonYear + 1) % 100})` };
    }
  }

  // Weekly tactical drilling. Runs before form drift so a style switched this
  // week starts accruing familiarity immediately rather than a week late.
  tickTacticalFamiliarity(s);

  // Weekly press desk (Phase 12) — reads the table/squad state as it stands
  // this week, so it must run after results are recorded above but before
  // anything below mutates form/fitness for next week.
  {
    const newsLeagueId = userLeagueId(s);
    generateWeeklyNews(s, newsLeagueId, computeTable(s, newsLeagueId), leagueClubs(s, newsLeagueId));
  }

  // Weekly form drift + injury recovery for every player.
  const fitnessFocus = s.training === 'fitness';
  for (const p of Object.values(s.players)) {
    p.form = clamp(p.form + (Math.random() - 0.5) * 0.06, 0.85, 1.15);
    if (p.injuryWeeks > 0) p.injuryWeeks--;
    // Day-based recovery is the real clock; injuryWeeks stays in sync as a
    // rounded-up view of it for every screen that already reads weeks.
    if (p.injuryDays && p.injuryDays > 0) {
      p.injuryDays = Math.max(0, p.injuryDays - 7);
      p.injuryWeeks = Math.ceil(p.injuryDays / 7);
      if (p.injuryDays === 0) p.injuryType = null;
    } else if (p.injuryWeeks === 0) {
      p.injuryType = null;
    }
    // A rest day for anyone whose club had no fixture this round.
    p.fitness = clamp(p.fitness + 4, 15, 100);
  }

  // Career mode weekly planner (engine/schedule.ts): per-day training/recovery
  // choice for the user's own squad layers on top of the flat rest-day bump
  // above, so an unedited schedule (the default 5:2 split) doesn't change
  // anything a save already relied on.
  applyWeeklySchedule(s);

  // Squad happiness: good players left out of the XI week after week grow
  // unhappy and start attracting transfer interest; starters settle back down.
  for (const id of userClub.playerIds) {
    const p = s.players[id];
    if (!p || p.rating < 74 || p.injuryWeeks > 0 || isOnLoan(p)) continue;
    const starting = s.lineup.includes(id);
    if (!starting && !p.unhappy && Math.random() < 0.05) {
      p.unhappy = true;
      s.news.unshift(`${p.name} is unhappy with his lack of game time.`);
    } else if (starting && p.unhappy && Math.random() < 0.3) {
      p.unhappy = false;
    }
  }

  // Backroom staff: a good coach sharpens training, a good physio speeds healing.
  const staff = getStaff(s);
  const coachMult = 1 + staff.coach * 0.35;
  const physioHealChance = 0.5 + staff.physio * 0.15;

  // Per-player development plans (engine/development.ts) resolve first —
  // players with an active plan skip the generic squad-wide roll below.
  applyDevPlans(s);

  // Reset the manual-training-drill weekly cap.
  s.drillsUsedThisWeek = 0;

  // Training: focused development for the user's younger players.
  if (s.training !== 'fitness') {
    for (const id of userClub.playerIds) {
      const p = s.players[id];
      if (!p || p.age > 27 || p.rating >= 90 || isOnLoan(p) || p.devPlan) continue;
      const matches =
        s.training === 'attack' ? p.pos === 'MID' || p.pos === 'FWD'
        : s.training === 'defense' ? p.pos === 'GK' || p.pos === 'DEF'
        : true;
      // Backroom Staff hub: a positional coach (attack/midfield/defense)
      // speeds up development for players in his position group, on top of
      // the legacy head-coach `coachMult`.
      const posRole =
        p.pos === 'FWD' ? 'attack' : p.pos === 'MID' ? 'midfield' : p.pos === 'DEF' ? 'defense' : null;
      const posCoach = posRole ? s.facilities?.coaches.find((c) => c.role === posRole) : undefined;
      const posMult = posCoach ? 1 + posCoach.quality / 200 : 1;
      // Low morale saps focus in the gym; high morale gives a small lift.
      // Player.morale is otherwise only written (transfer-promise breaches),
      // never read — this is the one place it's wired into the sim.
      const moraleMult = clamp(0.5 + p.morale / 100, 0.5, 1.15);
      const chance = (s.training === 'balanced' ? 0.02 : matches ? 0.05 : 0) * coachMult * posMult * moraleMult;
      if (Math.random() < chance) {
        p.rating++;
        p.value = marketValue(p.rating, p.age);
        if (p.rating >= 75) s.news.unshift(`${p.name} is improving in training (${p.rating} OVR).`);
      }
    }
  } else {
    // Fitness focus: injured players heal faster.
    for (const id of userClub.playerIds) {
      const p = s.players[id];
      if (p && p.injuryWeeks > 0 && Math.random() < 0.5) p.injuryWeeks = Math.max(0, p.injuryWeeks - 1);
    }
  }
  // A physio helps recovery regardless of training focus.
  if (staff.physio > 0) {
    for (const id of userClub.playerIds) {
      const p = s.players[id];
      if (p && p.injuryWeeks > 0 && Math.random() < physioHealChance * 0.5) {
        p.injuryWeeks = Math.max(0, p.injuryWeeks - 1);
      }
    }
  }

  // Injury risk for the user's starters (keeps the squad decision interesting).
  const injuryChance = (fitnessFocus ? 0.015 : 0.025) * (1 - staff.physio * 0.1);
  for (const id of s.lineup) {
    if (id === null) continue;
    const p = s.players[id];
    if (p && p.injuryWeeks === 0 && Math.random() < injuryChance) {
      p.injuryWeeks = 1 + Math.floor(Math.random() * 3);
      p.injuryDays = p.injuryWeeks * 7;
      p.injuryType = 'knock';
      s.news.unshift(`${p.name} injured — out for ${p.injuryWeeks} week${p.injuryWeeks > 1 ? 's' : ''}.`);
      pushInbox(s, {
        category: 'injury',
        title: `${p.name} picks up an injury`,
        body: `${p.name} was withdrawn during the match with a knock and has been assessed by the medical staff.\n\nExpect them to be out for ${p.injuryWeeks} week${p.injuryWeeks > 1 ? 's' : ''}. Plan your squad accordingly.`,
        playerId: p.id,
      });
    }
  }

  // Finances: gate receipts in, player and staff wages out.
  const gate = gateIncome(s);
  const wages = weeklyWageBill(s);
  const staffWages = staffWageBill(s);
  s.budget += gate - wages - staffWages;
  s.ledger.unshift({ week: round, desc: 'Gate receipts', amount: gate });
  s.ledger.unshift({ week: round, desc: 'Player wages', amount: -wages });
  if (staffWages > 0) s.ledger.unshift({ week: round, desc: 'Staff wages', amount: -staffWages });
  if (s.budget < 0) {
    s.board.confidence = clamp(s.board.confidence - 2, 1, 99);
    if (round % 3 === 0) s.news.unshift('The club is in the red — the board is uneasy about the finances.');
  }
  s.ledger = s.ledger.slice(0, 24);
  tickFinances(s, round); // Phase 8 — see engine/finances.ts (sole hook into this file).

  // Board confidence tracks performance against the objective.
  const pos = userPosition(s);
  s.board.confidence = clamp(s.board.confidence + (pos <= s.board.minPosition ? 1 : -1), 1, 99);

  // Cup competitions this week.
  if (knockoutRoundDue(s.cup, round)) runKnockout(s, s.cup, CUP_PRIZES, 'BALLKNW Cup');
  if (continentalRoundDue(s.continental, round)) runContinental(s, s.continental, CONTINENTAL_PRIZES);

  // AI clubs work the market too.
  for (const headline of aiWeeklyTransfers(s)) s.news.unshift(headline);

  // Dynamic news: the wider world.
  if (round % 6 === 0) {
    const table = computeTable(s, userLeagueId(s));
    const leader = s.clubs.find((c) => c.id === table[0]?.clubId);
    if (leader && leader.id !== s.userClubId) s.news.unshift(`${leader.name} top the ${leagueName(userLeagueId(s))} after week ${round}.`);
  }
  if (round % 8 === 0) {
    const scorer = getSquad(s, s.userClubId).sort((a, b) => b.goals - a.goals)[0];
    if (scorer && scorer.goals >= 5) s.news.unshift(`${scorer.name} leads your scoring charts with ${scorer.goals} goals.`);
  }
  for (const id of userClub.playerIds) {
    const p = s.players[id];
    if (p && (p.goals === 10 || p.goals === 20) && userReport.events.some((e) => e.playerId === p.id && e.type === 'goal')) {
      s.news.unshift(`Milestone: ${p.name} reaches ${p.goals} goals this season!`);
      pushInbox(s, {
        category: 'match',
        title: `${p.name} reaches ${p.goals} goals`,
        body: `${p.name} has now scored ${p.goals} goals this season, a landmark tally that has fans buzzing.\n\nKeep them firing and silverware could follow.`,
        playerId: p.id,
      });
    }
  }
  if (s.board.confidence < 30) {
    s.news.unshift('The board is losing patience — results must improve.');
    if (round % 4 === 0) {
      pushInbox(s, {
        category: 'board',
        title: 'Board confidence is fading',
        body: `The board have made their frustration known behind closed doors. Confidence stands at just ${s.board.confidence}/100.\n\nA run of results is needed soon, or your position could come under real scrutiny.`,
      });
    }
  } else if (s.fanConfidence >= 85 && round % 5 === 0) s.news.unshift('The fans are singing your name — confidence is sky-high.');
  else if (s.fanConfidence <= 25 && round % 5 === 0) s.news.unshift('Protests in the stands — the fans want change.');

  s.week = round + 1;
  // A split league schedules its post-split round-robins once its pre-split
  // programme is complete and the halves are known.
  applySplits(s);
  s.incomingOffers = generateWeeklyOffers(s);

  // Advance facilities projects and scouting assignments by one week.
  const facilityState = tickFacilitiesWeek(s);
  s.facilities = facilityState.facilities;
  s.scouting = facilityState.scouting;
  s.news = facilityState.news;

  // Scouting network: named scouts (Career mode) file transfer-target leads
  // into the shortlist + inbox, independent of the ad-hoc assignments above.
  const scoutedState = tickScoutNetwork(s);
  s.scouting = scoutedState.scouting;
  s.news = scoutedState.news;
  s.inbox = scoutedState.inbox;
  s.nextInboxId = scoutedState.nextInboxId;

  // Repair the lineup if injuries/sales/loans broke it.
  if (!isLineupValid(s, s.userClubId, s.lineup)) {
    s.lineup = autoPickLineup(s, s.userClubId, getFormation(s.formationId));
  }

  // Number anyone who arrived this week (signings, loans, youth intake) and
  // resolve any collision the moves created. Idempotent, so this is a no-op
  // in a week where nobody changed clubs.
  ensureSquadNumbers(s);

  s.news = s.news.slice(0, 14);
  return s;
}

/** Upgrade the youth academy (level 2, then 3). */
export function upgradeAcademy(state: GameState): GameState {
  const cost = ACADEMY_UPGRADE_COST[state.academyLevel + 1];
  if (!cost || cost > state.budget) return state;
  const s: GameState = structuredClone(state);
  s.academyLevel++;
  s.budget -= cost;
  s.ledger.unshift({ week: s.week, desc: `Academy upgrade (level ${s.academyLevel})`, amount: -cost });
  s.news.unshift(`Youth academy upgraded to level ${s.academyLevel} — better prospects incoming.`);
  return s;
}

const STAFF_ROLE_LABEL: Record<keyof Staff, string> = {
  coach: 'Assistant coach',
  physio: 'Physio',
  scout: 'Chief scout',
};

/** Hire the next level of a backroom staff role (coach / physio / scout). */
export function upgradeStaff(state: GameState, role: keyof Staff): GameState {
  const current = getStaff(state)[role];
  if (current >= STAFF_MAX_LEVEL) return state;
  const cost = STAFF_UPGRADE_COST[current + 1];
  if (cost > state.budget) return state;
  const s: GameState = structuredClone(state);
  s.staff = { ...getStaff(s), [role]: current + 1 };
  s.budget -= cost;
  s.ledger.unshift({ week: s.week, desc: `${STAFF_ROLE_LABEL[role]} hired (level ${current + 1})`, amount: -cost });
  s.news.unshift(`${STAFF_ROLE_LABEL[role]} upgraded to level ${current + 1}.`);
  return s;
}

/** Expand the stadium (level 2, then 3) — permanently boosts gate income. */
export function upgradeStadium(state: GameState): GameState {
  const level = getStadiumLevel(state);
  const cost = STADIUM_UPGRADE_COST[level + 1];
  if (!cost || cost > state.budget) return state;
  const s: GameState = structuredClone(state);
  s.stadiumLevel = level + 1;
  s.budget -= cost;
  s.ledger.unshift({ week: s.week, desc: `Stadium expansion (level ${s.stadiumLevel})`, amount: -cost });
  s.news.unshift(`Stadium expanded to level ${s.stadiumLevel} — matchday income will rise.`);
  return s;
}

export type PressTone = 'confident' | 'cautious' | 'bullish';

export interface PressResult {
  quote: string;
  reaction: string;
}

const PRESS_QUOTES: Record<PressTone, (opponent: string) => string> = {
  confident: (opp) => `"We've prepared well and I'm confident we can get a result against ${opp}."`,
  cautious: (opp) => `"${opp} are a good side — we'll respect them and focus on our own game."`,
  bullish: (opp) => `"Frankly, we should be beating a team like ${opp}. I expect three points."`,
};

/**
 * Answer the pre-match press question. Confidence plays well with fans but a
 * bullish line can rattle the board if it doesn't come off, while playing it
 * safe is low risk, low reward. One shot per fixture week.
 */
export function respondPress(state: GameState, tone: PressTone, opponentName: string): { state: GameState; result: PressResult } {
  const s: GameState = structuredClone(state);
  s.pressWeek = s.week;
  let reaction: string;
  if (tone === 'confident') {
    s.morale = clamp(s.morale + 2, MORALE_MIN, MORALE_MAX);
    s.fanConfidence = clamp(s.fanConfidence + 1, 5, 99);
    reaction = 'The squad likes the vote of confidence — morale ticks up.';
  } else if (tone === 'cautious') {
    s.board.confidence = clamp(s.board.confidence + 1, 1, 99);
    reaction = 'The board approves of the measured tone.';
  } else {
    s.morale = clamp(s.morale + 3, MORALE_MIN, MORALE_MAX);
    s.fanConfidence = clamp(s.fanConfidence + 3, 5, 99);
    s.board.confidence = clamp(s.board.confidence - 1, 1, 99);
    reaction = 'Bold words go down well with the fans — but the board hopes you can back it up.';
  }
  const quote = PRESS_QUOTES[tone](opponentName);
  s.news.unshift(`Press: ${quote}`);
  pushInbox(s, {
    category: 'press',
    title: `Press conference: ${opponentName} preview`,
    body: `Ahead of the match, you were asked about the visit of ${opponentName}.\n\nYour response: ${quote}\n\n${reaction}`,
  });
  return { state: s, result: { quote, reaction } };
}

/** Appoint the squad captain. */
export function setCaptain(state: GameState, playerId: number | null): GameState {
  const s: GameState = structuredClone(state);
  s.captainId = playerId;
  const p = playerId !== null ? s.players[playerId] : null;
  if (p) {
    s.news.unshift(`${p.name} is named club captain.`);
    pushInbox(s, {
      category: 'club',
      title: `${p.name} named club captain`,
      body: `As manager, it is your responsibility to appoint a club captain to lead the team on the pitch.\n\n${p.name} has been given the armband. Leadership and experience made them the standout choice — the squad will look to them in tight moments.`,
      playerId: p.id,
    });
  }
  return s;
}

/** Mark a player as unhappy (fewer minutes than they want) or settled. */
export function setPlayerHappiness(state: GameState, playerId: number, unhappy: boolean): GameState {
  const s: GameState = structuredClone(state);
  const p = s.players[playerId];
  if (p) p.unhappy = unhappy;
  return s;
}

/** Take a job at another club (from a season-end offer). */
export function switchJob(state: GameState, clubId: number): GameState {
  const s: GameState = structuredClone(state);
  const club = s.clubs.find((c) => c.id === clubId);
  if (!club) return state;
  s.userClubId = clubId;
  s.budget = startingBudget(club.leagueId) + s.manager.reputation * 100_000;
  s.chemistry = 45;
  s.morale = MORALE_START;
  s.fanConfidence = 60;
  s.academyLevel = 1;
  s.staff = { coach: 0, physio: 0, scout: 0 };
  s.stadiumLevel = 1;
  s.captainId = null;
  s.legacy = {};
  s.records = { biggestWin: null, bestFinish: null, topSeasonScorer: null };
  s.ledger = [];
  s.jobOffers = [];
  s.incomingOffers = [];
  s.board = makeBoardObjective(s);
  s.lineup = autoPickLineup(s, clubId, getFormation(s.formationId));
  s.pressWeek = 0;
  s.news.unshift(`${s.manager.name} takes charge of ${club.name}! Objective: ${s.board.objective}.`);
  pushInbox(s, {
    category: 'club',
    title: `${s.manager.name} appointed at ${club.name}`,
    body: `You have taken charge of ${club.name}.\n\nThe board's objective this season: ${s.board.objective}. Finish ${s.board.minPosition}${ordinal(s.board.minPosition)} or higher to keep their confidence.`,
  });
  return s;
}

/* ===========================================================================
   PROMOTION, RELEGATION AND THE PLAY-OFFS
   ===========================================================================
   Ported from the reference's season.js. Every league moves clubs according to
   its own LeagueDef: `autoPromotion` straight up, a `playoffSpots` bracket for
   the last promotion place, `relegation` straight down, plus two extras —
   the inter-league play-off (Bundesliga Relegationsspiele / Ligue 1 barrage),
   where a top flight's lowest safe club defends its place against a challenger
   from the tier below, and the dormant phantom pools that stand in for tiers
   we do not simulate.
========================================================================== */

export interface LeagueMove {
  clubId: number;
  from: string;
  to: string;
}

/** One-off play-off tie; a draw is settled by a coin toss (their simPO). */
function simPlayoff(s: GameState, aId: number, bId: number): number {
  const r = simulateMatch(s, aId, bId);
  if (r.homeGoals > r.awayGoals) return aId;
  if (r.awayGoals > r.homeGoals) return bId;
  return Math.random() < 0.5 ? aId : bId;
}

/** 3rd v 6th, 4th v 5th, then the final — the winner takes the last place up. */
function runPromotionPlayoff(s: GameState, seeds: number[]): number | null {
  if (seeds.length < 4) return seeds[0] ?? null;
  const sf1 = simPlayoff(s, seeds[0], seeds[3]);
  const sf2 = simPlayoff(s, seeds[1], seeds[2]);
  return simPlayoff(s, sf1, sf2);
}

/**
 * A phantom league's dormant pool feeds the simulated league directly above it.
 * The front of the queue auto-promotes (as many as that league relegates), the
 * next in line contests its relegation play-off where the league has one, and
 * every club relegated out of it goes dormant at the back of the queue.
 */
function processPhantomPool(s: GameState, poolLg: LeagueDef, moves: LeagueMove[]): void {
  const feeder = leagueAbove(poolLg.id);
  if (!feeder || feeder.phantom) return;
  const table = computeTable(s, feeder.id);
  if (!table.length) return;
  s.phantomPools = s.phantomPools ?? {};
  const pool = (s.phantomPools[poolLg.id] = s.phantomPools[poolLg.id] ?? []);
  const relCount = feeder.relegation;
  if (relCount <= 0) return;

  const relegated = table.slice(-relCount).map((r) => r.clubId);
  const atRisk = table[table.length - relCount - 1]?.clubId ?? null;

  // Front of the queue comes up, so the league keeps its size.
  const promoteCount = Math.min(relCount, pool.length);
  for (let i = 0; i < promoteCount; i++) {
    const id = pool.shift()!;
    moves.push({ clubId: id, from: poolLg.id, to: feeder.id });
  }

  // The relegation play-off (Relegationsspiele / barrage): the lowest safe club
  // defends its place against the pool's challenger.
  if (feeder.interPlayoff === poolLg.id && atRisk !== null && pool.length) {
    const spots = Math.max(1, poolLg.interPlayoffFeederSpots ?? 1);
    let challenger = pool.shift()!;
    // A wider feeder bracket (Ligue 2's 3rd–5th) is settled among pool entrants.
    // Only losers of these sub-playoffs go back in the pool below — whichever
    // entrant keeps winning becomes `challenger` and is tracked separately, so
    // it can't end up both promoted (or re-pooled) as the final challenger AND
    // pushed back to the pool a second time under its original id.
    const extras: number[] = [];
    for (let i = 1; i < spots && pool.length; i++) extras.push(pool.shift()!);
    const losers: number[] = [];
    for (const e of extras) {
      const w = simPlayoff(s, challenger, e);
      losers.push(w === challenger ? e : challenger);
      challenger = w;
    }
    const winner = simPlayoff(s, atRisk, challenger);
    if (winner === challenger) {
      moves.push({ clubId: challenger, from: poolLg.id, to: feeder.id });
      if (atRisk === s.userClubId) {
        // Never strand the user without fixtures — they get the reprieve.
        moves.pop();
        pool.push(challenger);
      } else {
        moves.push({ clubId: atRisk, from: feeder.id, to: poolLg.id });
      }
    } else {
      pool.push(challenger);
    }
    for (const l of losers) pool.push(l);
  }

  // The auto-relegated clubs go dormant at the back of the queue.
  for (const id of relegated) {
    if (id === s.userClubId) {
      s.relegatedOutOfPyramid = true;
      continue;
    }
    moves.push({ clubId: id, from: feeder.id, to: poolLg.id });
    pool.push(id);
  }
}

/**
 * Work out every club movement for the season just finished. Does not apply
 * them — `applyLeagueMoves` does, so the caller can read the user's old league
 * first.
 */
export function computeLeagueMoves(s: GameState): LeagueMove[] {
  const moves: LeagueMove[] = [];
  const tables = new Map<string, TableRow[]>();
  for (const lg of LEAGUES) {
    if (lg.phantom) continue;
    tables.set(lg.id, computeTable(s, lg.id));
  }

  // 1. Promotion play-offs (each league's own bracket).
  const playoffWinner = new Map<string, number>();
  for (const lg of LEAGUES) {
    const table = tables.get(lg.id);
    if (!table || lg.autoPromotion <= 0 || lg.playoffSpots < 4) continue;
    const above = leagueAbove(lg.id);
    if (!above || above.phantom) continue;
    if (table.length < lg.autoPromotion + lg.playoffSpots) continue;
    const seeds = table.slice(lg.autoPromotion, lg.autoPromotion + lg.playoffSpots).map((r) => r.clubId);
    const w = runPromotionPlayoff(s, seeds);
    if (w !== null) playoffWinner.set(lg.id, w);
  }

  // 2. Straight promotions and relegations inside each country's pyramid.
  for (const lg of LEAGUES) {
    const table = tables.get(lg.id);
    if (!table) continue;
    const above = leagueAbove(lg.id);
    const below = leagueBelow(lg.id);
    if (above && !above.phantom) {
      for (const r of table.slice(0, lg.autoPromotion)) moves.push({ clubId: r.clubId, from: lg.id, to: above.id });
      const w = playoffWinner.get(lg.id);
      if (w !== undefined) moves.push({ clubId: w, from: lg.id, to: above.id });
    }
    if (below && !below.phantom && lg.relegation > 0) {
      for (const r of table.slice(-lg.relegation)) moves.push({ clubId: r.clubId, from: lg.id, to: below.id });
    } else if (!below && lg.relegation > 0) {
      // Bottom of the pyramid we model — nowhere lower to send anyone.
      if (table.slice(-lg.relegation).some((r) => r.clubId === s.userClubId)) s.relegatedOutOfPyramid = true;
    }
  }

  // 3. Inter-league play-offs between two simulated leagues.
  for (const lg of LEAGUES) {
    if (!lg.interPlayoff) continue;
    const lower = getLeague(lg.interPlayoff);
    if (lower.phantom) continue; // handled by the phantom pool instead
    const upTable = tables.get(lg.id);
    const downTable = tables.get(lower.id);
    if (!upTable?.length || !downTable?.length) continue;
    const upClub = upTable[upTable.length - lg.relegation - 1]?.clubId;
    const spots = Math.max(1, lower.interPlayoffFeederSpots ?? 1);
    const seeds = downTable.slice(lower.autoPromotion, lower.autoPromotion + spots).map((r) => r.clubId);
    if (upClub === undefined || !seeds.length) continue;
    let downClub = seeds[seeds.length - 1];
    for (let i = seeds.length - 2; i >= 0; i--) downClub = simPlayoff(s, seeds[i], downClub);
    const winner = simPlayoff(s, upClub, downClub);
    if (winner === downClub) {
      moves.push({ clubId: downClub, from: lower.id, to: lg.id });
      moves.push({ clubId: upClub, from: lg.id, to: lower.id });
    }
  }

  // 4. Dormant tier pools feed the churn for every tier we do not simulate.
  for (const lg of LEAGUES) {
    if (lg.phantom) processPhantomPool(s, lg, moves);
  }

  return moves;
}

/** Apply computed movements, waking any dormant club that has come up. */
export function applyLeagueMoves(s: GameState, moves: LeagueMove[]): void {
  for (const m of moves) {
    const club = s.clubs.find((c) => c.id === m.clubId);
    if (!club) continue;
    club.leagueId = m.to;
    if (isPhantomLeague(m.to)) {
      club.dormant = true;
    } else {
      wakePoolClub(s, club, m.to, s.seasonYear + 1);
    }
  }
  refillPhantomPools(s);
}

/** Wrap up the season: prizes, promotion/relegation, contracts, youth, ageing. */
export function endSeason(state: GameState): { state: GameState; summary: SeasonSummary } {
  const s: GameState = structuredClone(state);
  const leagueId = userLeagueId(s);
  const lg = getLeague(leagueId);
  const userClub = s.clubs.find((c) => c.id === s.userClubId)!;
  const table = computeTable(s, leagueId);
  const position = table.findIndex((r) => r.clubId === s.userClubId) + 1;
  const prize = prizeMoney(leagueId, position);

  // Promotion, relegation and every play-off, across the whole pyramid.
  const moves = computeLeagueMoves(s);
  applyLeagueMoves(s, moves);
  const myMove = moves.find((m) => m.clubId === s.userClubId);
  const promoted = !!myMove && getLeague(myMove.to).level < lg.level;
  const relegated = (!!myMove && getLeague(myMove.to).level > lg.level) || !!s.relegatedOutOfPyramid;
  const newLeague = getLeague(userLeagueId(s));

  const objectiveMet = position <= s.board.minPosition;
  const sacked = !objectiveMet && s.board.confidence < 20;

  // Records & legends for the user's club. "Best" is highest tier first, then
  // best position within it.
  if (!s.records.bestFinish || lg.level < s.records.bestFinish.level ||
      (lg.level === s.records.bestFinish.level && position < s.records.bestFinish.position)) {
    s.records.bestFinish = { year: s.seasonYear, leagueId, level: lg.level, position };
  }
  const topScorer = getSquad(s, s.userClubId).sort((a, b) => b.goals - a.goals)[0];
  if (topScorer && topScorer.goals > 0 &&
      (!s.records.topSeasonScorer || topScorer.goals > s.records.topSeasonScorer.goals)) {
    s.records.topSeasonScorer = { name: topScorer.name, goals: topScorer.goals, year: s.seasonYear };
  }
  for (const id of userClub.playerIds) {
    const p = s.players[id];
    if (!p || p.apps === 0) continue;
    const entry = s.legacy[id] ?? { name: p.name, apps: 0, goals: 0 };
    entry.apps += p.apps;
    entry.goals += p.goals;
    s.legacy[id] = entry;
  }

  // League-wide season awards, judged across every club in the user's league.
  const awards: string[] = [];
  const divPlayers = s.clubs
    .filter((c) => c.leagueId === leagueId)
    .flatMap((c) => c.playerIds.map((id) => s.players[id]))
    .filter((p) => p && p.apps > 0);
  const goldenBoot = [...divPlayers].sort((a, b) => b.goals - a.goals)[0];
  if (goldenBoot && goldenBoot.goals > 0) {
    const club = s.clubs.find((c) => c.playerIds.includes(goldenBoot.id));
    awards.push(`Golden Boot: ${goldenBoot.name} (${club?.name ?? '—'}, ${goldenBoot.goals} goals)`);
  }
  const rated = divPlayers.filter((p) => (p.seasonRatingCount ?? 0) >= 8);
  const potsRank = [...rated].sort(
    (a, b) => (b.seasonRatingSum! / b.seasonRatingCount!) - (a.seasonRatingSum! / a.seasonRatingCount!)
  );
  const pots = potsRank[0];
  if (pots) {
    const club = s.clubs.find((c) => c.playerIds.includes(pots.id));
    const avg = Math.round((pots.seasonRatingSum! / pots.seasonRatingCount!) * 10) / 10;
    awards.push(`Player of the Season: ${pots.name} (${club?.name ?? '—'}, ${avg} avg rating)`);
  }
  const yotsRank = potsRank.filter((p) => p.age <= 21);
  const yots = yotsRank[0];
  if (yots) {
    const club = s.clubs.find((c) => c.playerIds.includes(yots.id));
    awards.push(`Young Player of the Season: ${yots.name} (${club?.name ?? '—'}, age ${yots.age})`);
  }

  const summary: SeasonSummary = {
    year: s.seasonYear,
    leagueId,
    position,
    pts: table[position - 1]?.pts ?? 0,
    champions: position === 1,
    promoted,
    relegated,
    prize,
    objective: s.board.objective,
    objectiveMet,
    sacked,
    cupRun: clubRunName(s.cup, s.userClubId),
    continentalRun: continentalRunName(s.continental, s.userClubId),
    awards,
  };
  s.history.push(summary);
  s.budget += prize;

  // Phase 11: a starting scenario's own pass/fail check, independent of the
  // board's objective — a scenario can fail even when the board is happy
  // (Wonderkid Factory) or succeed despite a missed board objective
  // (Relegation Battle surviving in a lowly position).
  const scenarioResult = evalScenarioAtSeasonEnd(s, summary);
  if (scenarioResult) {
    pushInbox(s, { category: 'board', title: scenarioResult.title, body: scenarioResult.body });
  }

  // Manager reputation & trophies.
  s.manager.seasons++;
  if (summary.champions) {
    s.manager.trophies.push(`${lg.name} Title ${s.seasonYear}/${(s.seasonYear + 1) % 100}`);
    s.manager.reputation = clamp(s.manager.reputation + 10, 0, 100);
  } else if (promoted) {
    s.manager.trophies.push(`${lg.name} Promotion ${s.seasonYear}/${(s.seasonYear + 1) % 100}`);
    s.manager.reputation = clamp(s.manager.reputation + 6, 0, 100);
  }
  s.manager.reputation = clamp(s.manager.reputation + (objectiveMet ? 3 : -4) + (relegated ? -5 : 0), 0, 100);
  s.board.confidence = clamp(s.board.confidence + (objectiveMet ? 20 : -20), 1, 99);

  // Career history entries, then reset season stats. Minutes and average match
  // rating are captured first because development (below) is earned on the
  // pitch, and the counters are about to be zeroed for the new season.
  const clubNameOf = (id: number) => (id === 0 ? 'Free agent' : s.clubs.find((c) => c.id === id)?.name ?? '—');
  const seasonApps = new Map<number, number>();
  const seasonAvgRating = new Map<number, number>();
  for (const p of Object.values(s.players)) {
    seasonApps.set(p.id, p.apps);
    if (p.seasonRatingCount) seasonAvgRating.set(p.id, p.seasonRatingSum! / p.seasonRatingCount);
    if (p.apps > 0) p.career.push({ year: s.seasonYear, club: clubNameOf(p.clubId), apps: p.apps, goals: p.goals });
    if (p.career.length > 12) p.career = p.career.slice(-12);
    p.apps = 0;
    p.goals = 0;
    p.assists = 0;
    p.cleanSheets = 0;
    p.saves = 0;
    p.lgApps = 0;
    p.lgGoals = 0;
    p.seasonRatingSum = 0;
    p.seasonRatingCount = 0;
  }

  // Loans end: players return, youngsters come back sharper.
  for (const p of Object.values(s.players)) {
    if (p.onLoanUntil !== undefined && p.onLoanUntil <= s.seasonYear + 1) {
      delete p.onLoanUntil;
      if (p.clubId === s.userClubId && p.age <= 23) {
        // A loan spell can push a youngster on, but never past his ceiling.
        p.rating = Math.min(p.potential, p.rating + 2);
        s.news.unshift(`${p.name} returns from loan a better player (${p.rating} OVR).`);
      }
    }
  }

  // Contracts: everyone loses a year; expired user players leave, AI auto-renews.
  // `contractEnd` is the display-facing truth (a real 31 Jan / 30 Jun date), so
  // it is re-derived wherever `contractYears` moves.
  for (const p of Object.values(s.players)) {
    if (p.clubId === 0) continue;
    p.contractYears = Math.max(0, p.contractYears - 1);
    p.contractEnd = contractEndFor(s.seasonYear + 1, p.contractYears);
    if (p.contractYears === 0) {
      if (p.clubId === s.userClubId) {
        const club = s.clubs.find((c) => c.id === p.clubId)!;
        if (club.playerIds.length <= 15) {
          // Can't afford to lose him with the squad this thin — a grudging 1-year deal.
          p.contractYears = 1;
          p.contractEnd = contractEndFor(s.seasonYear + 1, 1);
          s.news.unshift(`${p.name} agrees a short one-year extension.`);
          pushInbox(s, {
            category: 'contract',
            title: `${p.name} signs a new deal`,
            body: `With the squad already stretched thin, ${p.name}'s contract has been extended for another year.\n\nIt's a short-term fix — expect the conversation to come up again next season.`,
            playerId: p.id,
          });
          continue;
        }
        club.playerIds = club.playerIds.filter((id) => id !== p.id);
        p.clubId = 0;
        s.news.unshift(`${p.name} leaves on a free — his contract expired.`);
        pushInbox(s, {
          category: 'contract',
          title: `${p.name} leaves on a free transfer`,
          body: `${p.name}'s contract has expired and they have left the club as a free agent.\n\nThey are now available for any club to sign.`,
          playerId: p.id,
        });
      } else {
        p.contractYears = 2 + Math.floor(Math.random() * 3);
        p.contractEnd = contractEndFor(s.seasonYear + 1, p.contractYears);
      }
    }
  }

  // Youth academy intake.
  const intakeCount = s.academyLevel >= 3 ? 2 : 1;
  for (let i = 0; i < intakeCount; i++) {
    if (userClub.playerIds.length >= MAX_SQUAD_SIZE) break;
    const kid = makeYouthPlayer(s.nextPlayerId++, s.userClubId, s.academyLevel, s.seasonYear);
    s.players[kid.id] = kid;
    userClub.playerIds.push(kid.id);
    s.news.unshift(`Academy graduate ${kid.name} (${kid.role}, ${kid.rating} OVR) joins the first team.`);
    pushInbox(s, {
      category: 'youth',
      title: `${kid.name} promoted to the first team`,
      body: `Academy graduate ${kid.name} has impressed the youth coaches enough to earn a first-team squad number.\n\nA raw ${kid.rating} OVR ${kid.role} at ${kid.age} — the kind of prospect worth developing.`,
      playerId: kid.id,
    });
  }

  // Ageing, development and retirement.
  //
  // Development converges on `potential` rather than running a flat +1 per
  // season under 24. How fast a player closes that gap is earned on the pitch:
  // his age band sets the base rate, minutes and average match rating scale it,
  // and how much ceiling is left scales it again (a 17-year-old 20 points short
  // is a different animal from a 22-year-old two points short). Nobody ever
  // passes his ceiling. Past 30 there is no potential left — what he is now is
  // what he is — so `potential` is pulled down to `rating` and only decline
  // remains. Rates are ported from their tickPlayerDevelopment, rescaled from
  // per-week rolls to one per-season expectation.
  const retired: Player[] = [];
  for (const p of Object.values(s.players)) {
    p.age++;

    if (p.age >= p.retireAge) {
      retired.push(p);
      continue;
    }

    if (p.age >= 30) {
      // Development is over; close any advertised upside outright.
      p.potential = p.rating;
      if (p.age >= 31) p.rating = Math.max(48, p.rating - (p.age >= 34 ? 2 : 1));
    } else if (p.rating < p.potential) {
      const headroom = p.potential - p.rating;
      // Expected OVR points gained this season, weighted hard toward youth.
      const base = p.age <= 17 ? 3.0 : p.age <= 19 ? 2.5 : p.age <= 21 ? 1.9
        : p.age <= 23 ? 1.2 : p.age <= 25 ? 0.6 : p.age <= 27 ? 0.32 : 0.16;
      const apps = seasonApps.get(p.id) ?? 0;
      // Minutes are the single biggest lever for a young player; the spread
      // narrows with age because a 27-year-old isn't learning much either way.
      const playTime = p.age > 23
        ? (apps <= 0 ? 0.45 : Math.min(1.4, 0.8 + (apps / SEASON_ROUNDS) * 0.55))
        : (apps <= 0 ? 0.17 : Math.min(1.95, 0.46 + (apps / SEASON_ROUNDS) * 1.08));
      const avg = seasonAvgRating.get(p.id);
      // 6.5 is par; youngsters ride their form harder.
      const formMult = avg === undefined
        ? 1
        : clamp(1 + (avg - 6.5) * (p.age <= 23 ? 0.34 : 0.25), 0.72, 1.55);
      const headroomMult = p.age > 23
        ? clamp(0.7 + headroom * 0.07, 0.7, 1.4)
        : clamp(0.65 + headroom * 0.085, 0.65, 1.85);
      const expected = base * playTime * formMult * headroomMult;
      // Fractional part becomes the odds of one further point, so slow burners
      // still climb over several seasons instead of being rounded to nothing.
      const gain = Math.floor(expected) + (Math.random() < expected % 1 ? 1 : 0);
      p.rating = Math.min(p.potential, p.rating + gain);
    } else if (p.age <= 23) {
      // A prospect who has already maxed out shouldn't stop dead at 20 — his
      // ceiling occasionally creeps up instead. (Their same fix, per season.)
      if (Math.random() < (p.age <= 20 ? 0.35 : 0.2)) p.potential = Math.min(99, p.potential + 1);
    }

    p.potential = Math.min(99, Math.max(p.potential, p.rating));
    p.value = marketValue(p.rating, p.age);
    p.form = 1;
    p.injuryWeeks = 0;
    p.injuryDays = 0;
    p.injuryType = null;
    p.fitness = 100;
    p.sharpness = clamp(p.sharpness, 50, 75);
  }

  // Retirees leave the squad and the player pool entirely — every reference to
  // them has to go with them or the lineup/offers point at ghosts.
  for (const p of retired) {
    const club = s.clubs.find((c) => c.id === p.clubId);
    if (club) club.playerIds = club.playerIds.filter((id) => id !== p.id);
    if (p.clubId === s.userClubId) {
      s.news.unshift(`${p.name} retires at ${p.age} after ${p.career.length} recorded seasons.`);
      pushInbox(s, {
        category: 'club',
        title: `${p.name} announces his retirement`,
        body: `${p.name} has hung up his boots at ${p.age}.\n\nHis place in the squad is now free — the board expects a replacement to be found.`,
        playerId: p.id,
      });
    }
    delete s.players[p.id];
  }
  if (retired.length) {
    s.lineup = s.lineup.map((id) => (id !== null && !s.players[id] ? null : id));
    if (s.captainId != null && !s.players[s.captainId]) s.captainId = null;
    s.incomingOffers = s.incomingOffers.filter((o) => s.players[o.playerId]);
  }

  // Job offers: rescue jobs when sacked, step-up offers after a strong season.
  s.jobOffers = [];
  const myAvg = squadAvgRating(s, s.userClubId);
  const others = s.clubs.filter((c) => c.id !== s.userClubId);
  if (sacked) {
    const rescuers = others
      .filter((c) => !c.dormant && getLeague(c.leagueId).level >= lg.level)
      .sort((a, b) => squadAvgRating(s, a.id) - squadAvgRating(s, b.id))
      .slice(0, 4);
    for (const c of rescuers.sort(() => Math.random() - 0.5).slice(0, 2)) {
      s.jobOffers.push({ clubId: c.id, note: `${leagueName(c.leagueId)} — a chance to rebuild your reputation.` });
    }
  } else if (s.manager.reputation >= 60 && position <= 6 && Math.random() < 0.7) {
    const suitor = others
      .filter((c) => !c.dormant && getLeague(c.leagueId).level <= lg.level && squadAvgRating(s, c.id) > myAvg + 1)
      .sort((a, b) => squadAvgRating(s, b.id) - squadAvgRating(s, a.id))
      .slice(0, 3)[Math.floor(Math.random() * 3)];
    if (suitor) s.jobOffers.push({ clubId: suitor.id, note: `${leagueName(suitor.leagueId)} — a bigger club wants you.` });
  }

  // Board reinvestment: a club doesn't hoard cash indefinitely. Surplus above a
  // sensible war chest is spent on wages, facilities and debt over the break, so
  // the transfer kitty stays believable instead of snowballing season on season
  // (which quietly broke the market by the second season).
  const warChest = startingBudget(userClub.leagueId) * 1.5;
  let reinvestNote: string | null = null;
  if (s.budget > warChest) {
    const reinvested = Math.round((s.budget - warChest) * 0.75);
    s.budget -= reinvested;
    reinvestNote = `The board reinvests ${money(reinvested)} of the season's surplus into wages and facilities.`;
  }

  // New season setup.
  s.seasonYear++;
  s.week = 1;
  // Cooldowns are absolute week numbers; week resets to 1 every season, so a
  // cooldown left over from late last season (e.g. week 45) would otherwise
  // block that story type until deep into the new season (week - last >= 4
  // needs week >= 49). Reset alongside the news feed itself.
  s.newsCooldowns = {};
  s.morale = MORALE_START;
  s.chemistry = clamp(s.chemistry, 40, 70);
  s.fanConfidence = clamp(Math.round((s.fanConfidence + 60) / 2), 5, 99);
  s.incomingOffers = [];
  s.ledger = [];
  s.splitGroups = {};
  s.continental = makeContinental(s, continentalEntrants(s));
  s.fixtures = makeSeasonFixtures(s);
  s.cup = makeDomesticCup(s);
  s.board = { ...makeBoardObjective(s), confidence: s.board.confidence };
  s.lineup = autoPickLineup(s, s.userClubId, getFormation(s.formationId));
  s.news = [
    summary.champions
      ? `CHAMPIONS! ${userClub.name} win the title!`
      : summary.promoted
        ? `PROMOTED! The club goes up to the ${newLeague.name}!`
        : summary.relegated
          ? `Relegated to the ${newLeague.name}. Time to rebuild.`
          : `Season over — finished ${position}${ordinal(position)}. New season begins.`,
    ...awards,
    ...(reinvestNote ? [reinvestNote] : []),
    `Board objective: ${s.board.objective}.`,
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
