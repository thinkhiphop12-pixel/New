import type { GameState, GameSettings, InboxCategory } from './types';
import { dayIndex, dayOfSeason, daysUntilMatchDay, isMatchDay } from './calendar';
import { applyDailyPlayerSystems, nextUserFixture } from './seasonProgression';
import { tickScoutNetwork } from './scouting';
import { getSquad } from './teamManagement';

/**
 * The live daily loop — the replacement for "the only way time moves is a
 * match". `advanceDay` is the whole of "SIM NEXT DAY": it runs one day of
 * the per-player systems (training, recovery, injuries, development,
 * scouting, squad happiness), then reports back either a quiet digest (safe
 * to keep going) or a set of stops (something needs the manager's attention).
 *
 * What it deliberately does NOT do: play a match. Matchday is a stop, not an
 * auto-resolve — "the user should never accidentally skip a match" is a hard
 * rule, not a setting. When `stops` contains a `'matchday'` entry, the
 * caller's job is to hand off into the existing lineup/MatchScreen flow;
 * once that match report exists, the existing `playRound` (unchanged, still
 * the weekly-cadence resolution: finances, cup rounds, board confidence,
 * AI transfer waves) is what actually plays it, exactly as before this file
 * existed.
 */

/** A day-tick outcome the player must look at before the sim can continue.
 *  `category` doubles as the settings key in `GameSettings.continueStops`,
 *  except `'matchday'`, which is a hard stop — see the note above. */
export interface DayStop {
  category: InboxCategory | 'matchday';
  title: string;
  detail: string;
  playerId?: number;
}

export interface DayTickResult {
  state: GameState;
  stops: DayStop[];
  /** Plain-English lines for a quiet day — no stop, but not nothing either.
   *  This is what keeps a "no action needed" day from feeling like silence. */
  digest: string[];
}

/** Which inbox categories halt the sim by default. Matchday is handled
 *  separately (see `DayStop['category']` above) and is never optional.
 *  `match`/`press` are routine and frequent — flavour, not decisions — so
 *  they stay off by default; everything a manager might need to *act* on
 *  stops by default and can be turned off in Settings → Continue Rules. */
const DEFAULT_STOPS: Record<InboxCategory, boolean> = {
  injury: true,
  contract: true,
  transfer: true,
  board: true,
  club: true,
  youth: true,
  match: false,
  press: false,
};

export function stopEnabled(settings: GameSettings | undefined, category: InboxCategory): boolean {
  return settings?.continueStops?.[category] ?? DEFAULT_STOPS[category];
}

export function defaultContinueStops(): Record<InboxCategory, boolean> {
  return { ...DEFAULT_STOPS };
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function pendingOfferCount(state: GameState): number {
  return (
    state.incomingOffers.length +
    (state.negotiations ?? []).filter((n) => n.type === 'incoming' && n.awaiting === 'user').length
  );
}

export function advanceDay(state: GameState, settings?: GameSettings): DayTickResult {
  const s: GameState = structuredClone(state);
  const dIdx = dayIndex(state);

  // Snapshot what "new since this tick" means, before anything mutates.
  const seenInboxIds = new Set(state.inbox.map((i) => i.id));
  const offersBefore = pendingOfferCount(state);
  const squadBefore = getSquad(state, state.userClubId);
  const avgSharpBefore = avg(squadBefore.map((p) => p.sharpness));
  const avgFitBefore = avg(squadBefore.map((p) => p.fitness));

  // The daily tick itself: training/recovery, injury recovery, development
  // plans, squad happiness — see engine/seasonProgression.ts for why this is
  // the same function the legacy weekly path uses, just called with `days=1`.
  applyDailyPlayerSystems(s, { mode: 'day', dayIdx: dIdx });

  // Scouting network: a report can land on any day now, not only in the same
  // breath as a match result.
  const scouted = tickScoutNetwork(s, 1);
  s.scouting = scouted.scouting;
  s.news = scouted.news;
  s.inbox = scouted.inbox;
  s.nextInboxId = scouted.nextInboxId;
  s.news = s.news.slice(0, 14);

  s.dayOfSeason = dayOfSeason(state) + 1;

  const stops: DayStop[] = [];
  const digest: string[] = [];

  // Anything freshly added to the inbox this tick becomes either a stop or a
  // digest line, depending on the player's Continue Rules for its category.
  const newItems = s.inbox.filter((i) => !seenInboxIds.has(i.id));
  for (const item of [...newItems].reverse()) {
    if (stopEnabled(settings, item.category)) {
      stops.push({
        category: item.category,
        title: item.title,
        detail: item.body.split('\n\n')[0],
        playerId: item.playerId,
      });
    } else {
      digest.push(item.title);
    }
  }

  // Transfer offers/negotiations don't always arrive via a fresh inbox item
  // (some populate `incomingOffers`/`negotiations` directly) — catch those
  // too so a bid never sits unseen because nothing pinged the inbox.
  if (pendingOfferCount(s) > offersBefore && stopEnabled(settings, 'transfer')) {
    stops.push({
      category: 'transfer',
      title: 'New transfer activity awaiting your response',
      detail: 'An offer or negotiation needs an answer — check Transfers.',
    });
  }

  // Matchday: the one non-optional stop. Checked on the day the calendar has
  // just landed on, so it wins over anything else that happened today.
  if (isMatchDay(s)) {
    const fixture = nextUserFixture(s);
    if (fixture) {
      const oppId = fixture.homeId === s.userClubId ? fixture.awayId : fixture.homeId;
      const opp = s.clubs.find((c) => c.id === oppId);
      stops.unshift({
        category: 'matchday',
        title: `Matchday — vs ${opp?.name ?? 'opponent'}`,
        detail: fixture.homeId === s.userClubId ? 'Home fixture' : 'Away fixture',
      });
    }
  } else if (daysUntilMatchDay(s) === 1) {
    const fixture = nextUserFixture(s);
    if (fixture) {
      const oppId = fixture.homeId === s.userClubId ? fixture.awayId : fixture.homeId;
      const opp = s.clubs.find((c) => c.id === oppId);
      digest.unshift(`Match tomorrow vs ${opp?.name ?? 'opponent'}.`);
    }
  }

  // Squad condition deltas — the "the schedule is doing something" feedback
  // the Weekly Schedule screen has never given the player same-session.
  const squadAfter = getSquad(s, s.userClubId);
  const avgSharpAfter = avg(squadAfter.map((p) => p.sharpness));
  const avgFitAfter = avg(squadAfter.map((p) => p.fitness));
  if (Math.round(avgSharpAfter) !== Math.round(avgSharpBefore)) {
    const d = Math.round(avgSharpAfter) - Math.round(avgSharpBefore);
    digest.push(`Squad sharpness ${Math.round(avgSharpBefore)} → ${Math.round(avgSharpAfter)} (${d > 0 ? '+' : ''}${d})`);
  }
  if (Math.round(avgFitAfter) !== Math.round(avgFitBefore)) {
    const d = Math.round(avgFitAfter) - Math.round(avgFitBefore);
    digest.push(`Squad fitness ${Math.round(avgFitBefore)} → ${Math.round(avgFitAfter)} (${d > 0 ? '+' : ''}${d})`);
  }

  return { state: s, stops, digest };
}
