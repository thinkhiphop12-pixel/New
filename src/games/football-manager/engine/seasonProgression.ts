import type {
  Board, Club, Division, Fixture, GameData, GameState, JobOffer, Knockout, MatchReport, Player,
  Position, SeasonSummary, Staff, TableRow,
} from './types';
import {
  ACADEMY_UPGRADE_COST, CONTINENTAL_PRIZES, CONTINENTAL_SPOTS, CONTINENTAL_WEEKS, CUP_PRIZES,
  CUP_WEEKS, GATE_BASE, MAX_SQUAD_SIZE, MORALE_DRAW, MORALE_LOSS, MORALE_MAX,
  MORALE_MIN, MORALE_START, MORALE_WIN, PROMOTION_SPOTS, SEASON_ROUNDS, STADIUM_UPGRADE_COST,
  STAFF_MAX_LEVEL, STAFF_UPGRADE_COST, STAFF_WEEKLY_WAGE, STARTING_BUDGET, getFormation, prizeMoney,
} from './gameRules';
import { matchRatings, simulateMatch } from './matchSimulation';
import { autoPickLineup, getSquad, isLineupValid, isOnLoan, squadAvgRating } from './teamManagement';
import { clamp, marketValue, pickRandom, weeklyWage } from './utils';
import { aiWeeklyTransfers, generateWeeklyOffers } from './transferMarket';
import { clubRunName, createKnockout, isClubAlive, knockoutRoundDue, playKnockoutRound, roundName, tieWinner, userTieThisRound } from './cups';

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

/** Every division the game supports, in order (English pyramid 1–4, then the
 * top European leagues La Liga, Serie A, Bundesliga, Ligue 1). */
export const ALL_DIVISIONS: Division[] = [1, 2, 3, 4, 5, 6, 7, 8];

function divisionIds(state: GameState, division: Division): number[] {
  return state.clubs.filter((c) => c.division === division).map((c) => c.id);
}

/** The league fixture list for any division (1–8). */
export function divisionFixtures(state: GameState, division: Division): Fixture[] {
  return state.fixtures[`d${division}` as keyof GameState['fixtures']] ?? [];
}

export function allFixtures(state: GameState): Fixture[][] {
  return ALL_DIVISIONS.map((d) => divisionFixtures(state, d)).filter((list) => list.length > 0);
}

function makeSeasonFixtures(state: Pick<GameState, 'clubs'>): GameState['fixtures'] {
  const gen = (d: Division) => {
    const ids = state.clubs.filter((c) => c.division === d).map((c) => c.id);
    return ids.length >= 2 ? generateFixtures(ids) : [];
  };
  return {
    d1: gen(1), d2: gen(2), d3: gen(3), d4: gen(4),
    d5: gen(5), d6: gen(6), d7: gen(7), d8: gen(8),
  };
}

/** Board expectations based on the club's squad rank within its division. */
export function makeBoardObjective(state: GameState): Board {
  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const peers = state.clubs
    .filter((c) => c.division === club.division)
    .map((c) => ({ id: c.id, avg: squadAvgRating(state, c.id) }))
    .sort((a, b) => b.avg - a.avg);
  const rank = peers.findIndex((p) => p.id === club.id) + 1;
  let objective: string;
  let minPosition: number;
  if (rank <= 2 && club.division === 1) {
    objective = 'Challenge for the title (finish top 2)';
    minPosition = 2;
  } else if (rank <= 3 && club.division !== 1) {
    objective = 'Win promotion (finish top 3)';
    minPosition = PROMOTION_SPOTS;
  } else if (rank <= 6) {
    objective = 'Finish in the top 6';
    minPosition = 6;
  } else if (rank <= 12) {
    objective = 'Finish in the top half';
    minPosition = 10;
  } else {
    objective = 'Avoid relegation';
    minPosition = 17;
  }
  return { objective, minPosition, confidence: 60 };
}

/** Domestic cup for one season: all clubs, byes to square the bracket. */
export function makeDomesticCup(state: Pick<GameState, 'clubs'>): Knockout {
  // The BALLKNW Cup is the English knockout — the top three tiers (up to 63
  // entrants) keep the bracket within the six scheduled CUP_WEEKS. Clubs in the
  // fourth tier and the European leagues focus on their league campaign.
  const ids = state.clubs.filter((c) => c.division <= 3).map((c) => c.id);
  // Largest power of two ≤ entrants becomes the round-2 field size.
  let bracket = 2;
  while (bracket * 2 <= ids.length) bracket *= 2;
  const byes = ids.length === bracket ? 0 : 2 * bracket - ids.length;
  const totalRounds = Math.log2(bracket) + (byes > 0 ? 1 : 0);
  return createKnockout('BALLKNW Cup', CUP_WEEKS.slice(-totalRounds), ids, byes);
}

/** Continental cup for one season from the given participant clubs. */
export function makeContinental(participantIds: number[]): Knockout {
  return createKnockout('Continental Champions Cup', CONTINENTAL_WEEKS, participantIds.slice(0, CONTINENTAL_SPOTS));
}

const YOUTH_FIRST = ['Alfie', 'Ben', 'Callum', 'Dan', 'Eli', 'Finn', 'George', 'Harry', 'Isaac', 'Jack', 'Kai', 'Leo', 'Mason', 'Noah', 'Oscar', 'Reece', 'Sam', 'Theo', 'Will', 'Zack'];
const YOUTH_LAST = ['Abbott', 'Barnes', 'Clarke', 'Dawson', 'Ellis', 'Foster', 'Grant', 'Hayes', 'Ingram', 'Jennings', 'Kerr', 'Lowe', 'Mercer', 'Nolan', 'Osborne', 'Price', 'Quinn', 'Reid', 'Shaw', 'Turner'];
const YOUTH_ROLES: [Position, string][] = [['GK', 'GK'], ['DEF', 'CB'], ['DEF', 'RB'], ['MID', 'CM'], ['MID', 'CAM'], ['FWD', 'ST'], ['FWD', 'LW']];

function makeYouthPlayer(id: number, clubId: number, academyLevel: number): Player {
  const [pos, role] = pickRandom(YOUTH_ROLES);
  const base = 52 + academyLevel * 4;
  const rating = base + Math.floor(Math.random() * 9);
  const age = 16 + Math.floor(Math.random() * 3);
  const stat = () => clamp(rating - 6 + Math.floor(Math.random() * 14), 30, 90);
  const value = marketValue(rating, age);
  return {
    id,
    name: `${pickRandom(YOUTH_FIRST)} ${pickRandom(YOUTH_LAST)}`,
    nat: 'Academy',
    pos,
    role,
    rating,
    pac: stat(), sho: stat(), pas: stat(), dri: stat(), def: stat(), phy: stat(),
    age,
    value,
    wage: weeklyWage(value, rating),
    clubId,
    form: 1,
    injuryWeeks: 0,
    contractYears: 3,
    apps: 0,
    goals: 0,
    career: [],
  };
}

export function newGame(data: GameData, userClubId: number, managerName = 'The Gaffer', seasonYear = 2026): GameState {
  const clubs: Club[] = data.clubs.map((c) => ({ ...c, playerIds: [...c.playerIds] }));
  const players: GameState['players'] = {};
  for (const p of data.players) {
    players[p.id] = {
      ...p,
      wage: p.wage ?? weeklyWage(p.value, p.rating),
      form: 1,
      injuryWeeks: 0,
      contractYears: 1 + (p.id % 4),
      apps: 0,
      goals: 0,
      career: [],
      seasonRatingSum: 0,
      seasonRatingCount: 0,
    };
  }

  const userClub = clubs.find((c) => c.id === userClubId)!;
  const state: GameState = {
    version: 2,
    userClubId,
    seasonYear,
    week: 1,
    budget: STARTING_BUDGET[userClub.division],
    morale: MORALE_START,
    formationId: '4-3-3',
    lineup: [],
    tactics: { style: 'balanced', pressing: 'mid', tempo: 'normal', width: 'standard', mentality: 'balanced' },
    training: 'balanced',
    chemistry: 50,
    fanConfidence: 60,
    board: { objective: '', minPosition: 17, confidence: 60 },
    manager: { name: managerName, reputation: userClub.division === 1 ? 50 : userClub.division === 2 ? 40 : 30, wins: 0, draws: 0, losses: 0, seasons: 0, trophies: [] },
    academyLevel: 1,
    captainId: null,
    staff: { coach: 0, physio: 0, scout: 0 },
    stadiumLevel: 1,
    ledger: [],
    cup: { name: '', weeks: [], rounds: [], byes: [], round: 0, winnerId: null },
    continental: { name: '', weeks: [], rounds: [], byes: [], round: 0, winnerId: null },
    jobOffers: [],
    records: { biggestWin: null, bestFinish: null, topSeasonScorer: null },
    legacy: {},
    nextPlayerId: Math.max(...data.players.map((p) => p.id)) + 1,
    players,
    clubs,
    fixtures: { d1: [], d2: [], d3: [], d4: [], d5: [], d6: [], d7: [], d8: [] },
    incomingOffers: [],
    history: [],
    news: [`Welcome to ${userClub.name}! The board expects a solid season.`],
  };
  state.fixtures = makeSeasonFixtures(state);
  state.board = makeBoardObjective(state);
  state.cup = makeDomesticCup(state);
  const d1ByStrength = clubs
    .filter((c) => c.division === 1)
    .sort((a, b) => squadAvgRating(state, b.id) - squadAvgRating(state, a.id))
    .map((c) => c.id);
  state.continental = makeContinental(d1ByStrength);
  state.lineup = autoPickLineup(state, userClubId, getFormation(state.formationId));
  state.news.push(`Board objective: ${state.board.objective}.`);
  return state;
}

export function computeTable(state: GameState, division: Division): TableRow[] {
  const clubs = state.clubs.filter((c) => c.division === division);
  const rows = new Map<number, TableRow>(
    clubs.map((c) => [c.id, { clubId: c.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 }])
  );
  const fixtures = divisionFixtures(state, division);
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

export function userDivision(state: GameState): Division {
  return state.clubs.find((c) => c.id === state.userClubId)!.division;
}

export function hasThirdDivision(state: GameState): boolean {
  return state.clubs.some((c) => c.division === 3);
}

export function nextUserFixture(state: GameState): Fixture | null {
  const div = userDivision(state);
  const fixtures = divisionFixtures(state, div);
  return (
    fixtures.find(
      (f) => f.round === state.week && (f.homeId === state.userClubId || f.awayId === state.userClubId)
    ) ?? null
  );
}

export function userPosition(state: GameState): number {
  const table = computeTable(state, userDivision(state));
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

/** Weekly matchday income: division base scaled by position, fans and stadium. */
export function gateIncome(state: GameState): number {
  const div = userDivision(state);
  const pos = Math.max(userPosition(state), 1);
  const stadiumMult = 1 + 0.25 * (getStadiumLevel(state) - 1);
  const raw = GATE_BASE[div] * (0.55 + state.fanConfidence / 250 + (21 - pos) / 50) * stadiumMult;
  return Math.round(raw / 10_000) * 10_000;
}

/** The user's total weekly wage bill (loanees are off the books). */
export function weeklyWageBill(state: GameState): number {
  return getSquad(state, state.userClubId)
    .filter((p) => !isOnLoan(p))
    .reduce((s, p) => s + p.wage, 0);
}

/** Weekly staff wages (per level, per role). */
export function staffWageBill(state: GameState): number {
  const st = getStaff(state);
  return (st.coach + st.physio + st.scout) * STAFF_WEEKLY_WAGE;
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
        s.news.unshift(`🏆 ${s.clubs.find((c) => c.id === s.userClubId)!.name} WIN the ${k.name}!`);
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

  // Weekly form drift + injury recovery for every player.
  const fitnessFocus = s.training === 'fitness';
  for (const p of Object.values(s.players)) {
    p.form = clamp(p.form + (Math.random() - 0.5) * 0.06, 0.85, 1.15);
    if (p.injuryWeeks > 0) p.injuryWeeks--;
  }

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

  // Training: focused development for the user's younger players.
  if (s.training !== 'fitness') {
    for (const id of userClub.playerIds) {
      const p = s.players[id];
      if (!p || p.age > 27 || p.rating >= 90 || isOnLoan(p)) continue;
      const matches =
        s.training === 'attack' ? p.pos === 'MID' || p.pos === 'FWD'
        : s.training === 'defense' ? p.pos === 'GK' || p.pos === 'DEF'
        : true;
      const chance = (s.training === 'balanced' ? 0.02 : matches ? 0.05 : 0) * coachMult;
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
      s.news.unshift(`${p.name} injured — out for ${p.injuryWeeks} week${p.injuryWeeks > 1 ? 's' : ''}.`);
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

  // Board confidence tracks performance against the objective.
  const pos = userPosition(s);
  s.board.confidence = clamp(s.board.confidence + (pos <= s.board.minPosition ? 1 : -1), 1, 99);

  // Cup competitions this week.
  if (knockoutRoundDue(s.cup, round)) runKnockout(s, s.cup, CUP_PRIZES, 'BALLKNW Cup');
  if (knockoutRoundDue(s.continental, round)) runKnockout(s, s.continental, CONTINENTAL_PRIZES, 'Continental Champions Cup');

  // AI clubs work the market too.
  for (const headline of aiWeeklyTransfers(s)) s.news.unshift(headline);

  // Dynamic news: the wider world.
  if (round % 6 === 0) {
    const table = computeTable(s, userDivision(s));
    const leader = s.clubs.find((c) => c.id === table[0]?.clubId);
    if (leader && leader.id !== s.userClubId) s.news.unshift(`${leader.name} top Division ${userDivision(s)} after week ${round}.`);
  }
  if (round % 8 === 0) {
    const scorer = getSquad(s, s.userClubId).sort((a, b) => b.goals - a.goals)[0];
    if (scorer && scorer.goals >= 5) s.news.unshift(`${scorer.name} leads your scoring charts with ${scorer.goals} goals.`);
  }
  for (const id of userClub.playerIds) {
    const p = s.players[id];
    if (p && (p.goals === 10 || p.goals === 20) && userReport.events.some((e) => e.playerId === p.id && e.type === 'goal')) {
      s.news.unshift(`Milestone: ${p.name} reaches ${p.goals} goals this season!`);
    }
  }
  if (s.board.confidence < 30) s.news.unshift('⚠ The board is losing patience — results must improve.');
  else if (s.fanConfidence >= 85 && round % 5 === 0) s.news.unshift('The fans are singing your name — confidence is sky-high.');
  else if (s.fanConfidence <= 25 && round % 5 === 0) s.news.unshift('Protests in the stands — the fans want change.');

  s.week = round + 1;
  s.incomingOffers = generateWeeklyOffers(s);

  // Repair the lineup if injuries/sales/loans broke it.
  if (!isLineupValid(s, s.userClubId, s.lineup)) {
    s.lineup = autoPickLineup(s, s.userClubId, getFormation(s.formationId));
  }

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

/** Appoint the squad captain. */
export function setCaptain(state: GameState, playerId: number | null): GameState {
  const s: GameState = structuredClone(state);
  s.captainId = playerId;
  const p = playerId !== null ? s.players[playerId] : null;
  if (p) s.news.unshift(`${p.name} is named club captain.`);
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
  s.budget = STARTING_BUDGET[club.division] + s.manager.reputation * 100_000;
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
  s.news.unshift(`${s.manager.name} takes charge of ${club.name}! Objective: ${s.board.objective}.`);
  return s;
}

/** Wrap up the season: prizes, promotion/relegation, contracts, youth, ageing. */
export function endSeason(state: GameState): { state: GameState; summary: SeasonSummary } {
  const s: GameState = structuredClone(state);
  const div = userDivision(s);
  const userClub = s.clubs.find((c) => c.id === s.userClubId)!;
  const table = computeTable(s, div);
  const position = table.findIndex((r) => r.clubId === s.userClubId) + 1;
  const prize = prizeMoney(div, position);

  const d1Table = computeTable(s, 1);
  const d2Table = computeTable(s, 2);
  const d3 = hasThirdDivision(s);
  const d3Table = d3 ? computeTable(s, 3) : [];
  const relegatedD1 = d1Table.slice(-PROMOTION_SPOTS).map((r) => r.clubId);
  const promotedD2 = d2Table.slice(0, PROMOTION_SPOTS).map((r) => r.clubId);
  const relegatedD2 = d3 ? d2Table.slice(-PROMOTION_SPOTS).map((r) => r.clubId) : [];
  const promotedD3 = d3 ? d3Table.slice(0, PROMOTION_SPOTS).map((r) => r.clubId) : [];
  for (const c of s.clubs) {
    if (relegatedD1.includes(c.id)) c.division = 2;
    if (promotedD2.includes(c.id)) c.division = 1;
    if (relegatedD2.includes(c.id)) c.division = 3;
    if (promotedD3.includes(c.id)) c.division = 2;
  }

  const promoted = div !== 1 && (div === 2 ? promotedD2 : promotedD3).includes(s.userClubId);
  const relegated = (div === 1 && relegatedD1.includes(s.userClubId)) || (div === 2 && relegatedD2.includes(s.userClubId));
  const objectiveMet = position <= s.board.minPosition;
  const sacked = !objectiveMet && s.board.confidence < 20;

  // Records & legends for the user's club.
  if (!s.records.bestFinish || div < s.records.bestFinish.division ||
      (div === s.records.bestFinish.division && position < s.records.bestFinish.position)) {
    s.records.bestFinish = { year: s.seasonYear, division: div, position };
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

  // League-wide season awards, judged across every club in the user's division.
  const awards: string[] = [];
  const divPlayers = s.clubs
    .filter((c) => c.division === div)
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
    division: div,
    position,
    pts: table[position - 1]?.pts ?? 0,
    champions: div === 1 && position === 1,
    promoted,
    relegated,
    prize,
    objective: s.board.objective,
    objectiveMet,
    sacked,
    cupRun: clubRunName(s.cup, s.userClubId),
    continentalRun: clubRunName(s.continental, s.userClubId),
    awards,
  };
  s.history.push(summary);
  s.budget += prize;

  // Manager reputation & trophies.
  s.manager.seasons++;
  if (summary.champions) {
    s.manager.trophies.push(`Division 1 Title ${s.seasonYear}/${(s.seasonYear + 1) % 100}`);
    s.manager.reputation = clamp(s.manager.reputation + 10, 0, 100);
  } else if (promoted) {
    s.manager.trophies.push(`Division ${div} Promotion ${s.seasonYear}/${(s.seasonYear + 1) % 100}`);
    s.manager.reputation = clamp(s.manager.reputation + 6, 0, 100);
  }
  s.manager.reputation = clamp(s.manager.reputation + (objectiveMet ? 3 : -4) + (relegated ? -5 : 0), 0, 100);
  s.board.confidence = clamp(s.board.confidence + (objectiveMet ? 20 : -20), 1, 99);

  // Career history entries, then reset season stats.
  const clubNameOf = (id: number) => (id === 0 ? 'Free agent' : s.clubs.find((c) => c.id === id)?.name ?? '—');
  for (const p of Object.values(s.players)) {
    if (p.apps > 0) p.career.push({ year: s.seasonYear, club: clubNameOf(p.clubId), apps: p.apps, goals: p.goals });
    if (p.career.length > 12) p.career = p.career.slice(-12);
    p.apps = 0;
    p.goals = 0;
    p.seasonRatingSum = 0;
    p.seasonRatingCount = 0;
  }

  // Loans end: players return, youngsters come back sharper.
  for (const p of Object.values(s.players)) {
    if (p.onLoanUntil !== undefined && p.onLoanUntil <= s.seasonYear + 1) {
      delete p.onLoanUntil;
      if (p.clubId === s.userClubId && p.age <= 23) {
        p.rating = Math.min(94, p.rating + 2);
        s.news.unshift(`${p.name} returns from loan a better player (${p.rating} OVR).`);
      }
    }
  }

  // Contracts: everyone loses a year; expired user players leave, AI auto-renews.
  for (const p of Object.values(s.players)) {
    if (p.clubId === 0) continue;
    p.contractYears = Math.max(0, p.contractYears - 1);
    if (p.contractYears === 0) {
      if (p.clubId === s.userClubId) {
        const club = s.clubs.find((c) => c.id === p.clubId)!;
        if (club.playerIds.length <= 15) {
          // Can't afford to lose him with the squad this thin — a grudging 1-year deal.
          p.contractYears = 1;
          s.news.unshift(`${p.name} agrees a short one-year extension.`);
          continue;
        }
        club.playerIds = club.playerIds.filter((id) => id !== p.id);
        p.clubId = 0;
        s.news.unshift(`${p.name} leaves on a free — his contract expired.`);
      } else {
        p.contractYears = 2 + Math.floor(Math.random() * 3);
      }
    }
  }

  // Youth academy intake.
  const intakeCount = s.academyLevel >= 3 ? 2 : 1;
  for (let i = 0; i < intakeCount; i++) {
    if (userClub.playerIds.length >= MAX_SQUAD_SIZE) break;
    const kid = makeYouthPlayer(s.nextPlayerId++, s.userClubId, s.academyLevel);
    s.players[kid.id] = kid;
    userClub.playerIds.push(kid.id);
    s.news.unshift(`Academy graduate ${kid.name} (${kid.role}, ${kid.rating} OVR) joins the first team.`);
  }

  // Ageing: youngsters develop, veterans decline, values move with both.
  for (const p of Object.values(s.players)) {
    p.age++;
    if (p.age <= 23) p.rating = Math.min(94, p.rating + 1);
    else if (p.age >= 31) p.rating = Math.max(48, p.rating - (p.age >= 34 ? 2 : 1));
    p.value = marketValue(p.rating, p.age);
    p.form = 1;
    p.injuryWeeks = 0;
  }

  // Job offers: rescue jobs when sacked, step-up offers after a strong season.
  s.jobOffers = [];
  const myAvg = squadAvgRating(s, s.userClubId);
  const others = s.clubs.filter((c) => c.id !== s.userClubId);
  if (sacked) {
    const rescuers = others
      .filter((c) => c.division >= div)
      .sort((a, b) => squadAvgRating(s, a.id) - squadAvgRating(s, b.id))
      .slice(0, 4);
    for (const c of rescuers.sort(() => Math.random() - 0.5).slice(0, 2)) {
      s.jobOffers.push({ clubId: c.id, note: `Division ${c.division} — a chance to rebuild your reputation.` });
    }
  } else if (s.manager.reputation >= 60 && position <= 6 && Math.random() < 0.7) {
    const suitor = others
      .filter((c) => c.division <= div && squadAvgRating(s, c.id) > myAvg + 1)
      .sort((a, b) => squadAvgRating(s, b.id) - squadAvgRating(s, a.id))
      .slice(0, 3)[Math.floor(Math.random() * 3)];
    if (suitor) s.jobOffers.push({ clubId: suitor.id, note: `Division ${suitor.division} — a bigger club wants you.` });
  }

  // Board reinvestment: a club doesn't hoard cash indefinitely. Surplus above a
  // sensible war chest is spent on wages, facilities and debt over the break, so
  // the transfer kitty stays believable instead of snowballing season on season
  // (which quietly broke the market by the second season).
  const warChest = STARTING_BUDGET[userClub.division] * 1.5;
  let reinvestNote: string | null = null;
  if (s.budget > warChest) {
    const reinvested = Math.round((s.budget - warChest) * 0.75);
    s.budget -= reinvested;
    reinvestNote = `The board reinvests ${money(reinvested)} of the season's surplus into wages and facilities.`;
  }

  // New season setup.
  s.seasonYear++;
  s.week = 1;
  s.morale = MORALE_START;
  s.chemistry = clamp(s.chemistry, 40, 70);
  s.fanConfidence = clamp(Math.round((s.fanConfidence + 60) / 2), 5, 99);
  s.incomingOffers = [];
  s.ledger = [];
  s.fixtures = makeSeasonFixtures(s);
  s.cup = makeDomesticCup(s);
  s.continental = makeContinental(computeTable(s, 1).map((r) => r.clubId));
  s.board = { ...makeBoardObjective(s), confidence: s.board.confidence };
  s.lineup = autoPickLineup(s, s.userClubId, getFormation(s.formationId));
  s.news = [
    summary.champions
      ? `CHAMPIONS! ${userClub.name} win the title!`
      : summary.promoted
        ? `PROMOTED! The club goes up to Division ${userClub.division}!`
        : summary.relegated
          ? `Relegated to Division ${userClub.division}. Time to rebuild.`
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
