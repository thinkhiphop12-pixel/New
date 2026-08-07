import type { Board, ChairmanType, Club, GameState, JobOffer, TableRow } from './types';
import { getLeague, leagueName, startingBudget } from './gameRules';
import { squadAvgRating } from './teamManagement';
import { clamp } from './utils';

/**
 * The manager job market.
 *
 * A career here is a job you hold, not a club you own: other clubs sack their
 * managers as the season runs, those openings become listings you can read
 * and apply for, and every listing states what the board is actually offering
 * — budget, expectation, and the reputation they want — before you commit.
 *
 * This module deliberately imports nothing from `seasonProgression`, which
 * imports *it*. Vacancy generation and the interview odds live here; the
 * state transition that actually moves you between clubs (`applyForJob`)
 * lives next to `switchJob` in `seasonProgression`, so the dependency runs
 * one way only. `tickJobMarket` takes standings as an argument for the same
 * reason — `computeTable` is the caller's to run.
 */

/** How many openings the market holds at once. Enough to make the screen a
 *  real choice, few enough that a step up stays worth waiting for. */
const MAX_VACANCIES = 6;

/** Weeks a listing stays open before the club appoints someone else. */
const VACANCY_TTL_WEEKS = 8;

/** Clubs sampled for a sacking each week. The whole pyramid is thousands of
 *  clubs and this runs on every weekly tick, so it samples rather than scans. */
const SACK_SAMPLE = 40;

/** Matches a club must have played before its board judges the manager. */
const SACK_MIN_PLAYED = 5;

/** How far below its squad's rank a club must sit to be in sacking territory. */
const SACK_POSITION_GAP = 4;

/** Reputation lost for walking out on a club mid-season. Leaving between
 *  seasons is free; abandoning a campaign is not. */
export const MID_SEASON_RESIGN_REP_COST = 6;

export const CHAIRMAN_LABEL: Record<ChairmanType, string> = {
  ambitious: 'Ambitious',
  patient: 'Patient',
  frugal: 'Frugal',
  ruthless: 'Ruthless',
};

export const CHAIRMAN_BLURB: Record<ChairmanType, string> = {
  ambitious: 'Backs the manager in the market, and expects a return on it.',
  patient: 'Gives a project time to breathe. Confidence moves slowly.',
  frugal: 'Holds the purse tight. Overachieving on little is the job.',
  ruthless: 'Spends freely and sacks quickly. Confidence swings hard.',
};

/** Multiplier a chairman applies to the league's baseline transfer budget. */
const CHAIRMAN_BUDGET: Record<ChairmanType, number> = {
  ambitious: 1.35,
  patient: 1.0,
  frugal: 0.65,
  ruthless: 1.15,
};

/**
 * A club's chairman, derived from its id rather than stored.
 *
 * Deterministic so a listing reads the same every time it's rendered and
 * survives a save/load, without adding a per-club field that every existing
 * save would need back-filling.
 */
export function chairmanFor(clubId: number): ChairmanType {
  const types: ChairmanType[] = ['ambitious', 'patient', 'frugal', 'ruthless'];
  // Cheap integer hash — successive club ids must not walk the list in order,
  // or whole leagues would share a chairman in blocks.
  const h = (clubId * 2654435761) >>> 0;
  return types[h % types.length];
}

/** Clubs actually competing in a league. Dormant clubs sit in phantom pools
 *  and have no fixtures, so they can neither sack nor hire. */
function clubsIn(state: Pick<GameState, 'clubs'>, leagueId: string): Club[] {
  return state.clubs.filter((c) => c.leagueId === leagueId && !c.dormant);
}

/** Where a club's squad ranks in its own league, 1 = strongest. */
function squadRank(state: GameState, clubId: number, leagueId: string): { rank: number; of: number } {
  const peers = clubsIn(state, leagueId)
    .map((c) => ({ id: c.id, avg: squadAvgRating(state, c.id) }))
    .sort((a, b) => b.avg - a.avg);
  const rank = peers.findIndex((p) => p.id === clubId) + 1;
  return { rank: rank > 0 ? rank : peers.length, of: Math.max(peers.length, 1) };
}

/**
 * What a board will expect of whoever takes the job.
 *
 * Reads the club's squad against its league: a title-favourite squad is asked
 * to challenge, a bottom-third squad is asked to survive. Previously this only
 * existed for the user's own club; a job listing has to be able to state the
 * expectation of a club you don't manage yet.
 */
export function boardObjectiveFor(state: GameState, clubId: number): Board {
  const club = state.clubs.find((c) => c.id === clubId);
  if (!club) return { objective: 'Avoid relegation', minPosition: 1, confidence: 60 };
  const lg = getLeague(club.leagueId);
  const { rank, of: n } = squadRank(state, clubId, club.leagueId);
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

/**
 * Reputation a board is looking for, 0–100.
 *
 * Driven by the tier first and the club's standing within it second, so the
 * pyramid reads as a ladder: a fourth-tier job will take an unknown, a
 * top-flight title favourite will not.
 */
export function repRequiredFor(state: GameState, clubId: number): number {
  const club = state.clubs.find((c) => c.id === clubId);
  if (!club) return 0;
  const lg = getLeague(club.leagueId);
  const base = lg.level === 1 ? 52 : lg.level === 2 ? 32 : lg.level === 3 ? 18 : 8;
  const { rank, of: n } = squadRank(state, clubId, club.leagueId);
  // Strongest squad in the league adds the full premium, weakest adds none.
  const standing = n > 1 ? 1 - (rank - 1) / (n - 1) : 0.5;
  return Math.round(clamp(base + standing * 26, 3, 92));
}

/** Transfer budget the board would hand over, before any of your own money. */
export function jobBudget(state: GameState, clubId: number, chairman: ChairmanType): number {
  const club = state.clubs.find((c) => c.id === clubId);
  if (!club) return 0;
  return Math.round(startingBudget(club.leagueId) * CHAIRMAN_BUDGET[chairman]);
}

/** Build a listing for a club as it stands right now. */
export function makeVacancy(state: GameState, clubId: number, note: string): JobOffer | null {
  const club = state.clubs.find((c) => c.id === clubId);
  if (!club) return null;
  const chairman = chairmanFor(clubId);
  const board = boardObjectiveFor(state, clubId);
  return {
    clubId,
    note,
    leagueId: club.leagueId,
    budget: jobBudget(state, clubId, chairman),
    objective: board.objective,
    minPosition: board.minPosition,
    repRequired: repRequiredFor(state, clubId),
    chairman,
    openedWeek: state.week,
    openedYear: state.seasonYear,
  };
}

/**
 * Your chance of being appointed, 0–100.
 *
 * Meeting the board's reputation bar is most of the job; clearing it by a
 * distance makes it a formality, falling short of it makes it a long shot
 * without ever being impossible — a board with no better candidate will
 * gamble on you.
 */
export function interviewOdds(state: GameState, offer: JobOffer): number {
  const gap = state.manager.reputation - offer.repRequired;
  const base = gap >= 0 ? 78 + gap * 0.6 : 78 + gap * 4.2;
  // Silverware travels with you and speaks for itself at an interview.
  const pedigree = Math.min(10, state.manager.trophies.length * 2.5);
  // A ruthless chairman hires on reputation alone; a patient one will listen.
  const temperament = offer.chairman === 'ruthless' ? -6 : offer.chairman === 'patient' ? 5 : 0;
  return Math.round(clamp(base + pedigree + temperament, 4, 96));
}

/** Human-readable read on the odds, for the listing card. */
export function interviewVerdict(odds: number): string {
  if (odds >= 80) return 'Formality';
  if (odds >= 60) return 'Likely';
  if (odds >= 40) return 'Even odds';
  if (odds >= 20) return 'Long shot';
  return 'Outside chance';
}

/**
 * Weekly churn of the job market: expire stale listings, then let struggling
 * clubs sack their managers.
 *
 * A club is a sacking candidate when it sits well below where its squad says
 * it should be — the same judgement the user's own board makes, applied to
 * everyone else. `standings` is passed in rather than computed so this module
 * stays free of a `seasonProgression` import.
 */
export function tickJobMarket(s: GameState, standings: Record<string, TableRow[]>): void {
  const open = (s.vacancies ?? []).filter((v) => {
    // A listing dies with the season, when it ages out, or when the club it
    // names is the one you already manage.
    if (v.openedYear !== s.seasonYear) return false;
    if (s.week - v.openedWeek > VACANCY_TTL_WEEKS) return false;
    if (v.clubId === s.userClubId) return false;
    return s.clubs.some((c) => c.id === v.clubId && !c.dormant);
  });

  const taken = new Set(open.map((v) => v.clubId));
  const leagueIds = Object.keys(standings);

  for (let i = 0; open.length < MAX_VACANCIES && i < SACK_SAMPLE; i++) {
    const leagueId = leagueIds[Math.floor(Math.random() * leagueIds.length)];
    if (!leagueId) break;
    const table = standings[leagueId];
    if (!table || table.length === 0) continue;

    const row = table[Math.floor(Math.random() * table.length)];
    if (!row || row.clubId === s.userClubId || taken.has(row.clubId)) continue;
    if (row.played < SACK_MIN_PLAYED) continue;

    const actualPos = table.findIndex((r) => r.clubId === row.clubId) + 1;
    const { rank: expectedPos } = squadRank(s, row.clubId, leagueId);
    const shortfall = actualPos - expectedPos;
    if (shortfall < SACK_POSITION_GAP) continue;

    // The further adrift, the likelier the board acts — but never a certainty,
    // so the market stays unpredictable week to week.
    const chance = Math.min(0.5, 0.06 * (shortfall - SACK_POSITION_GAP + 1));
    if (Math.random() > chance) continue;

    const club = s.clubs.find((c) => c.id === row.clubId);
    if (!club) continue;
    const vacancy = makeVacancy(
      s,
      row.clubId,
      `${leagueName(leagueId)} — ${actualPos}${ordinal(actualPos)} with a squad built for ${expectedPos}${ordinal(expectedPos)}. The board have acted.`,
    );
    if (!vacancy) continue;
    open.push(vacancy);
    taken.add(row.clubId);
  }

  // Best jobs first, so the screen opens on the ones worth reading.
  open.sort((a, b) => b.repRequired - a.repRequired);
  s.vacancies = open;
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}
