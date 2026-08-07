import type { GameState } from './types';
import { SEASON_ROUNDS } from './gameRules';

/**
 * The game's clock.
 *
 * Before this file the engine had no clock at all: `playRound` was the only
 * function that moved `state.week`, and it required a match report to run, so
 * time could not pass without a match. Every management system resolved
 * invisibly inside that one call. `dayOfSeason` is the fix — a real calendar
 * the player advances a day at a time, with matches as events *on* it rather
 * than the thing that drives it.
 *
 * ## The model
 *
 * `dayOfSeason` is the source of truth for the calendar: a 0-based counter of
 * days since the season opened. A season is `SEASON_ROUNDS` calendar weeks of
 * seven days each.
 *
 *   dayIndex     = dayOfSeason % 7          // 0 = Monday … 6 = Sunday
 *   calendarWeek = dayOfSeason / 7 + 1      // 1-based, matches `state.week`
 *
 * `state.week` keeps its old meaning — the next fixture *round* to be played —
 * and stays the key every fixture, cup and table lookup already uses. Nothing
 * that reads `state.week` had to change.
 *
 * ## The invariant that keeps the two in step
 *
 *   At the start of calendar week W, `state.week === W`.
 *
 * That holds because the round is resolved exactly once per calendar week, on
 * MATCH_DAY, and `playRound` is what increments `state.week`. For the one day
 * that follows (Sunday), `state.week` reads one ahead of `calendarWeek` — which
 * is not a drift bug but the correct reading: this week's match is played, the
 * next round is W+1, and there is one day of the calendar week left to live
 * through. `weekOfDay()` below is therefore the *calendar* week and is
 * deliberately not interchangeable with `state.week`.
 */

export const DAYS_PER_WEEK = 7;

/** 0 = Monday. Matches `WEEK_DAY_LABELS` in engine/schedule.ts, which is what
 *  the weekly planner has always been indexed by. */
export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const DAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** The day of the week league fixtures are played on (Saturday). Cup and
 *  continental ties resolve on the same tick — the engine has never modelled
 *  midweek rounds as separate fixtures, and inventing them here would mean
 *  fabricating a second match the fixture list doesn't contain. */
export const MATCH_DAY = 5;

/** Seasons open at the start of August, which is what makes `Sat 16 Sep` type
 *  dates land plausibly against a 48-week programme. */
const SEASON_START_MONTH = 7; // 0-based: August
const SEASON_START_DATE = 1;

/** Current day-of-season, defaulting an unmigrated save to Monday of whatever
 *  week it was saved on. Every read goes through here so a save that predates
 *  the calendar can never produce `NaN` downstream. */
export function dayOfSeason(state: Pick<GameState, 'week' | 'dayOfSeason'>): number {
  const d = state.dayOfSeason;
  if (typeof d === 'number' && Number.isFinite(d) && d >= 0) return d;
  return (Math.max(1, state.week) - 1) * DAYS_PER_WEEK;
}

/** 0 = Monday … 6 = Sunday. */
export function dayIndex(state: Pick<GameState, 'week' | 'dayOfSeason'>): number {
  return dayOfSeason(state) % DAYS_PER_WEEK;
}

/** The *calendar* week the current day sits in. See the invariant note above:
 *  this equals `state.week` for six days out of seven and trails it by one on
 *  Sunday, once the round has been resolved. */
export function weekOfDay(state: Pick<GameState, 'week' | 'dayOfSeason'>): number {
  return Math.floor(dayOfSeason(state) / DAYS_PER_WEEK) + 1;
}

export function dayName(state: Pick<GameState, 'week' | 'dayOfSeason'>): string {
  return DAY_LABELS[dayIndex(state)];
}

export function isMatchDay(state: Pick<GameState, 'week' | 'dayOfSeason'>): boolean {
  return dayIndex(state) === MATCH_DAY;
}

/** Days from today until the next MATCH_DAY, 0 when today is one. */
export function daysUntilMatchDay(state: Pick<GameState, 'week' | 'dayOfSeason'>): number {
  const i = dayIndex(state);
  return i <= MATCH_DAY ? MATCH_DAY - i : DAYS_PER_WEEK - i + MATCH_DAY;
}

/** The real-world date a day-of-season maps to. Purely presentational — the
 *  sim never reads it — but it is what lets the UI say "Sat 16 Sep" instead of
 *  "Week 12", which is the whole point of having a clock the player can feel. */
export function gameDate(state: Pick<GameState, 'week' | 'dayOfSeason' | 'seasonYear'>): Date {
  const start = new Date(state.seasonYear, SEASON_START_MONTH, SEASON_START_DATE);
  start.setDate(start.getDate() + dayOfSeason(state));
  return start;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sat 16 Sep" — the header format. */
export function formatGameDate(state: Pick<GameState, 'week' | 'dayOfSeason' | 'seasonYear'>): string {
  const d = gameDate(state);
  return `${DAY_LABELS_SHORT[dayIndex(state)]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "Saturday 16 September 2025" — the day-summary heading. */
export function formatGameDateLong(state: Pick<GameState, 'week' | 'dayOfSeason' | 'seasonYear'>): string {
  const d = gameDate(state);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  return `${DAY_LABELS[dayIndex(state)]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Turns a day count into the phrasing the dashboard and stop cards use. */
export function relativeDays(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/** The last day of the season, after which `endSeason` takes over. */
export function seasonLastDay(): number {
  return SEASON_ROUNDS * DAYS_PER_WEEK - 1;
}
