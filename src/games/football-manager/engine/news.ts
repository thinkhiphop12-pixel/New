/**
 * Weekly press desk (gap 76, disclosed narrowing below). Reads the user's own
 * league table and squad data and, when something is actually newsworthy,
 * pushes a plain-text headline into `state.news`.
 *
 * Disclosed scope narrowing from the reference: the reference ships 17 story
 * generators producing structured HTML articles (sub-heads, pull quotes,
 * mini tables) into a rich article store. This ships 5 real generators —
 * title race, relegation scrap, Golden Boot race, breakout young player, and
 * board pressure on the user's own job — as plain headlines into the
 * existing `state.news: string[]` model, which is what this codebase
 * actually has (there is no rich-article store to write into; building one
 * would be a much larger structural change than this pass's scope). Two
 * reference story types (transfer splash, manager pressure at AI clubs) are
 * deliberately dropped rather than faked: there is no tracked ledger of
 * completed transfer fees to draw a "biggest deal this week" from, and AI
 * clubs carry no board-confidence field the way the user's club does (see
 * `Club` in engine/types.ts) — inventing one just to produce a rumor headline
 * would be exactly the kind of silent scope-widening this project's
 * conventions warn against.
 */
import type { Club, GameState, TableRow } from './types';
import { getLeague } from './gameRules';

// Deliberately no import from seasonProgression.ts here: it calls
// generateWeeklyNews from its weekly tick, so this module takes the table
// and club list as arguments instead of computing them itself — importing
// computeTable/leagueClubs/userLeagueId back from seasonProgression.ts would
// close a direct two-file cycle (news.ts <-> seasonProgression.ts).

/** Weeks a given story type must sit quiet before it can fire again, so the
 *  news feed doesn't repeat the same headline every round. */
const COOLDOWN_WEEKS = 4;

function ensureNewsCooldowns(s: GameState): Record<string, number> {
  s.newsCooldowns = s.newsCooldowns ?? {};
  return s.newsCooldowns;
}

function offCooldown(cooldowns: Record<string, number>, key: string, week: number): boolean {
  const last = cooldowns[key];
  return last === undefined || week - last >= COOLDOWN_WEEKS;
}

/** Run once a week (from the main tick). Mutates in place — callers already
 *  hold a freshly-cloned `GameState` at the point this runs (see
 *  seasonProgression.ts's weekly tick), matching how `tickTacticalFamiliarity`
 *  and `tickFinances` are called in that same tick. `table`/`clubs` are the
 *  user's own league's standings and club list, computed by the caller. */
export function generateWeeklyNews(s: GameState, leagueId: string, table: TableRow[], clubs: Club[]): void {
  const cooldowns = ensureNewsCooldowns(s);
  const week = s.week;
  const league = getLeague(leagueId);
  const clubName = (id: number) => clubs.find((c) => c.id === id)?.name ?? '???';

  // Title race: top two within 3 points, and at least half the season played
  // (a 3-point gap in week 2 means nothing; the same gap in week 30 does).
  if (offCooldown(cooldowns, 'title', week) && table.length >= 2 && table[0].played > 0) {
    const totalRounds = league.rounds * (table.length - 1);
    if (table[0].played >= totalRounds * 0.5) {
      const gap = table[0].pts - table[1].pts;
      if (gap <= 3) {
        s.news.unshift(
          `Title race goes to the wire: ${clubName(table[0].clubId)} lead ${clubName(table[1].clubId)} by just ${gap} point${gap === 1 ? '' : 's'}.`
        );
        cooldowns.title = week;
      }
    }
  }

  // Relegation scrap: the last safe place and the first relegation place
  // within 2 points of each other.
  if (offCooldown(cooldowns, 'relegation', week) && league.relegation > 0 && table.length > league.relegation) {
    const cutIdx = table.length - league.relegation;
    const safe = table[cutIdx - 1];
    const doomed = table[cutIdx];
    if (safe && doomed && safe.played > 0) {
      const gap = safe.pts - doomed.pts;
      if (gap <= 2) {
        s.news.unshift(
          `Relegation dogfight: ${clubName(safe.clubId)} cling to safety, just ${gap} point${gap === 1 ? '' : 's'} above ${clubName(doomed.clubId)}.`
        );
        cooldowns.relegation = week;
      }
    }
  }

  // Golden Boot race: the league's top two scorers, close and each with a
  // real tally (not 2-1 in week 3).
  if (offCooldown(cooldowns, 'goldenboot', week)) {
    const scorers = clubs
      .flatMap((c) => c.playerIds.map((id) => ({ p: s.players[id], clubId: c.id })))
      .filter((x) => x.p && x.p.goals > 0)
      .sort((a, b) => b.p.goals - a.p.goals);
    if (scorers.length >= 2 && scorers[0].p.goals >= 5 && scorers[0].p.goals - scorers[1].p.goals <= 3) {
      s.news.unshift(
        `Golden Boot race hots up: ${scorers[0].p.name} (${clubName(scorers[0].clubId)}) leads with ${scorers[0].p.goals}, chased by ${scorers[1].p.name} on ${scorers[1].p.goals}.`
      );
      cooldowns.goldenboot = week;
    }
  }

  // Breakout young player: a U21 with a strong average rating this season.
  if (offCooldown(cooldowns, 'breakout', week)) {
    const young = clubs
      .flatMap((c) => c.playerIds.map((id) => ({ p: s.players[id], clubId: c.id })))
      .filter((x) => x.p && x.p.age <= 21 && (x.p.seasonRatingCount ?? 0) >= 5);
    const best = young.sort(
      (a, b) => (b.p.seasonRatingSum! / b.p.seasonRatingCount!) - (a.p.seasonRatingSum! / a.p.seasonRatingCount!)
    )[0];
    if (best) {
      const avg = Math.round((best.p.seasonRatingSum! / best.p.seasonRatingCount!) * 10) / 10;
      if (avg >= 7.2) {
        s.news.unshift(`Breakout season: ${best.p.name} (${clubName(best.clubId)}, age ${best.p.age}) averaging ${avg} this campaign.`);
        cooldowns.breakout = week;
      }
    }
  }

  // Board pressure on the user's own job — the one club whose confidence is
  // actually tracked at the board level.
  if (offCooldown(cooldowns, 'pressure', week) && s.board.confidence < 25) {
    s.news.unshift(`Pressure mounting: the board's patience is wearing thin (confidence ${s.board.confidence}).`);
    cooldowns.pressure = week;
  }

  // Cap the feed so it can't grow unbounded over a long career.
  if (s.news.length > 30) s.news.length = 30;
}
