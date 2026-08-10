import type { Division, FormationDef, LeagueDef, Position } from './types';
import { MONEY_SCALE } from './utils';

/** Calendar weeks in a season. League fixtures occupy 46 of them; the two
 *  WINTER_BREAK weeks carry no domestic league football (gap item 41). */
export const SEASON_ROUNDS = 48;
/** Calendar weeks available for league fixtures. The longest league in the
 *  game (a 24-club Championship playing everyone twice) needs 46 of them;
 *  shorter divisions simply finish earlier. */
export const LEAGUE_ROUNDS = 46;
export const PROMOTION_SPOTS = 3;

/** Calendar weeks with no domestic league programme — the winter break. Chosen
 *  to avoid every CUP_WEEKS / CONTINENTAL_WEEKS date below. */
export const WINTER_BREAK: number[] = [26, 27];

/** Map a league match round (1-based, uninterrupted) onto its calendar week,
 *  stepping over the winter break. */
export function roundToWeek(round: number): number {
  let week = round;
  for (const b of WINTER_BREAK) if (week >= b) week++;
  return week;
}

/** True when no domestic league match is scheduled in this calendar week. */
export function isWinterBreakWeek(week: number): boolean {
  return WINTER_BREAK.includes(week);
}

/**
 * Transfer windows, as inclusive calendar-week ranges.
 *
 * Derived from the week rather than stored on `GameState`, so there is no
 * save migration and no way for a save to drift out of sync with the rules.
 * The winter window is centred on `WINTER_BREAK` the way a real January
 * window sits in the mid-season gap. Between them the market is shut:
 * roughly a third of the season is tradeable, which is the point of having
 * a deadline at all. Tune here — every gate reads these two ranges.
 */
export const TRANSFER_WINDOWS: { name: string; opens: number; closes: number }[] = [
  { name: 'Summer', opens: 1, closes: 8 },
  { name: 'Winter', opens: 24, closes: 30 },
];

export interface TransferWindowState {
  /** Is the market open for paid transfers this week? */
  open: boolean;
  /** The window in play: the open one, or the next one due. */
  name: string;
  /** Weeks until deadline day when open, until it opens when shut. */
  weeksLeft: number;
  /** Last week of the open window (0 when shut). */
  closesWeek: number;
  /** First week of the next window (0 when none remain this season). */
  opensWeek: number;
}

/**
 * Why the market is shut, phrased for a gate error.
 *
 * Late in the season there is no window left to count down to, so
 * `weeksLeft` is 0 and "opens in 0 weeks" would be nonsense — that case gets
 * its own wording.
 */
export function windowShutReason(week: number, what = 'Transfer window'): string {
  const w = transferWindow(week);
  if (w.weeksLeft > 0) {
    return `${what} shut — the ${w.name} window opens in ${w.weeksLeft} week${w.weeksLeft === 1 ? '' : 's'}.`;
  }
  return `${what} shut — no window remains this season.`;
}

/** Whether the transfer market is open in a given calendar week, and how long
 *  is left on that state. Free agents are always signable — see `canBuy`. */
export function transferWindow(week: number): TransferWindowState {
  const current = TRANSFER_WINDOWS.find((w) => week >= w.opens && week <= w.closes);
  if (current) {
    return {
      open: true,
      name: current.name,
      weeksLeft: current.closes - week,
      closesWeek: current.closes,
      opensWeek: 0,
    };
  }
  const next = TRANSFER_WINDOWS.find((w) => w.opens > week);
  return {
    open: false,
    name: next?.name ?? 'Summer',
    weeksLeft: next ? next.opens - week : 0,
    closesWeek: 0,
    opensWeek: next?.opens ?? 0,
  };
}

/**
 * Deadline day: the final week of an open transfer window. Spec's "Deadline
 * Day Override" — selling clubs get easier to talk down, AI bidders for the
 * user's own players get harder to please. See `evaluateFeeOffer`'s
 * `deadlineDay` param and `checkIncomingOffers`/`resolveIncomingResponse` in
 * transferMarket.ts. Deliberately just this one-week easing/tightening, not
 * the spec's separate 10-turns-of-1-hour deadline-day UI mechanic — that
 * doesn't map onto this game's week-tick screens.
 */
export function isDeadlineWeek(week: number): boolean {
  const w = transferWindow(week);
  return w.open && w.weeksLeft === 0;
}

export const MIN_SQUAD_SIZE = 16;
export const MAX_SQUAD_SIZE = 30;

/* ============================================================================
   THE LEAGUE PYRAMID
   ----------------------------------------------------------------------------
   Structure, promotion/relegation counts, UEFA slot allocation and TV
   equal-share values are ported from the reference implementation's
   `LEAGUES` map (js/data.js). `clubCount` is what our own dataset actually
   supplies for each simulated league — the real size of the competition
   (20 in the Premier League, 18 in the Bundesliga, 24 in the Championship)
   — everything else is theirs.

   Leagues marked `phantom` are not simulated: they hold no fixtures and never
   appear in the UI. Each exists as a dormant pool feeding the league directly
   above it with promotion/relegation churn (see processPhantomPool in
   seasonProgression.ts) — the reference's own device for tiers it doesn't
   model. That is what makes England five tiers deep and gives every foreign
   top flight somewhere real to relegate to.
   ========================================================================= */

export const LEAGUES: LeagueDef[] = [
  // ── England: five tiers ────────────────────────────────────────────────
  {
    id: 'premier_league', name: 'Premier League', country: 'England', level: 1,
    clubCount: 20, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 3,
    championsLeague: 5, clPlayoff: 0, europaLeague: 2, conferenceLeague: 1,
    tvEqualShare: 110,
    startingBudget: 40_000_000, gateBase: 550_000, prizeTop: 32_000_000, prizeStep: 1_200_000,
  },
  {
    id: 'championship', name: 'Championship', country: 'England', level: 2,
    clubCount: 24, rounds: 2,
    autoPromotion: 2, playoffSpots: 4, relegation: 3,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 9.5,
    startingBudget: 12_000_000, gateBase: 180_000, prizeTop: 10_000_000, prizeStep: 350_000,
  },
  {
    id: 'league_one', name: 'League One', country: 'England', level: 3,
    clubCount: 24, rounds: 2,
    autoPromotion: 2, playoffSpots: 4, relegation: 4,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 1.9,
    startingBudget: 4_000_000, gateBase: 60_000, prizeTop: 3_000_000, prizeStep: 100_000,
  },
  {
    id: 'league_two', name: 'League Two', country: 'England', level: 4,
    clubCount: 24, rounds: 2,
    autoPromotion: 3, playoffSpots: 4, relegation: 2,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 1.3,
    startingBudget: 1_500_000, gateBase: 25_000, prizeTop: 800_000, prizeStep: 30_000,
  },
  {
    id: 'national_league', name: 'National League', country: 'England', level: 5,
    clubCount: 0, rounds: 2, phantom: true,
    autoPromotion: 1, playoffSpots: 4, relegation: 2,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 0.5,
    startingBudget: 400_000, gateBase: 12_000, prizeTop: 300_000, prizeStep: 10_000,
  },

  // ── Spain ───────────────────────────────────────────────────────────────
  {
    id: 'la_liga', name: 'La Liga', country: 'Spain', level: 1,
    clubCount: 20, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 3,
    championsLeague: 4, clPlayoff: 0, europaLeague: 3, conferenceLeague: 1,
    tvEqualShare: 52,
    startingBudget: 35_000_000, gateBase: 480_000, prizeTop: 28_000_000, prizeStep: 1_000_000,
  },
  {
    id: 'la_liga_2', name: 'La Liga 2', country: 'Spain', level: 2,
    clubCount: 0, rounds: 2, phantom: true,
    autoPromotion: 2, playoffSpots: 4, relegation: 2,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 2.0,
    startingBudget: 2_500_000, gateBase: 45_000, prizeTop: 2_000_000, prizeStep: 70_000,
  },
  {
    id: 'primera_rfef', name: 'Primera Federación', country: 'Spain', level: 3,
    clubCount: 0, rounds: 2, phantom: true,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 0,
    startingBudget: 400_000, gateBase: 10_000, prizeTop: 250_000, prizeStep: 8_000,
  },

  // ── Italy ───────────────────────────────────────────────────────────────
  {
    id: 'serie_a', name: 'Serie A', country: 'Italy', level: 1,
    clubCount: 20, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 3,
    championsLeague: 4, clPlayoff: 0, europaLeague: 3, conferenceLeague: 1,
    tvEqualShare: 42,
    startingBudget: 28_000_000, gateBase: 400_000, prizeTop: 22_000_000, prizeStep: 800_000,
  },
  {
    id: 'serie_b', name: 'Serie B', country: 'Italy', level: 2,
    clubCount: 0, rounds: 2, phantom: true,
    autoPromotion: 2, playoffSpots: 4, relegation: 2,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 1.8,
    startingBudget: 2_200_000, gateBase: 40_000, prizeTop: 1_800_000, prizeStep: 65_000,
  },
  {
    id: 'serie_c', name: 'Serie C', country: 'Italy', level: 3,
    clubCount: 0, rounds: 2, phantom: true,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 0,
    startingBudget: 400_000, gateBase: 10_000, prizeTop: 250_000, prizeStep: 8_000,
  },

  // ── Germany: Bundesliga 16th plays the Relegationsspiele ────────────────
  {
    id: 'bundesliga', name: 'Bundesliga', country: 'Germany', level: 1,
    clubCount: 18, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 2, interPlayoff: 'bundesliga_2',
    championsLeague: 4, clPlayoff: 0, europaLeague: 3, conferenceLeague: 1,
    tvEqualShare: 55,
    startingBudget: 25_000_000, gateBase: 380_000, prizeTop: 20_000_000, prizeStep: 750_000,
  },
  {
    id: 'bundesliga_2', name: '2. Bundesliga', country: 'Germany', level: 2,
    clubCount: 0, rounds: 2, phantom: true,
    autoPromotion: 2, playoffSpots: 0, relegation: 2, interPlayoffFeeder: 'bundesliga', interPlayoffFeederSpots: 1,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 4.5,
    startingBudget: 5_000_000, gateBase: 70_000, prizeTop: 4_500_000, prizeStep: 150_000,
  },
  {
    id: 'dritte_liga', name: '3. Liga', country: 'Germany', level: 3,
    clubCount: 0, rounds: 2, phantom: true,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 0,
    startingBudget: 400_000, gateBase: 10_000, prizeTop: 250_000, prizeStep: 8_000,
  },

  // ── France: Ligue 1 16th plays the barrage against a 3rd-5th playoff ────
  {
    id: 'ligue_1', name: 'Ligue 1', country: 'France', level: 1,
    clubCount: 18, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 2, interPlayoff: 'ligue_2',
    championsLeague: 3, clPlayoff: 0, europaLeague: 3, conferenceLeague: 2,
    tvEqualShare: 28,
    startingBudget: 22_000_000, gateBase: 340_000, prizeTop: 18_000_000, prizeStep: 650_000,
  },
  {
    id: 'ligue_2', name: 'Ligue 2', country: 'France', level: 2,
    clubCount: 0, rounds: 2, phantom: true,
    autoPromotion: 2, playoffSpots: 0, relegation: 2, interPlayoffFeeder: 'ligue_1', interPlayoffFeederSpots: 3,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 1.3,
    startingBudget: 1_800_000, gateBase: 35_000, prizeTop: 1_300_000, prizeStep: 50_000,
  },
  {
    id: 'national_fr', name: 'National', country: 'France', level: 3,
    clubCount: 0, rounds: 2, phantom: true,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 0,
    startingBudget: 400_000, gateBase: 10_000, prizeTop: 250_000, prizeStep: 8_000,
  },

  // ── Netherlands (our dataset carries the Eredivisie; the reference does not) ─
  {
    id: 'eredivisie', name: 'Eredivisie', country: 'Netherlands', level: 1,
    clubCount: 18, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 2,
    championsLeague: 2, clPlayoff: 1, europaLeague: 2, conferenceLeague: 1,
    tvEqualShare: 8,
    startingBudget: 18_000_000, gateBase: 280_000, prizeTop: 12_000_000, prizeStep: 450_000,
  },
  {
    id: 'eerste_divisie', name: 'Eerste Divisie', country: 'Netherlands', level: 2,
    clubCount: 0, rounds: 2, phantom: true,
    autoPromotion: 2, playoffSpots: 0, relegation: 0,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 0.4,
    startingBudget: 900_000, gateBase: 22_000, prizeTop: 700_000, prizeStep: 25_000,
  },

  // ── Portugal ────────────────────────────────────────────────────────────
  {
    id: 'primeira_liga', name: 'Primeira Liga', country: 'Portugal', level: 1,
    clubCount: 18, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 2,
    championsLeague: 2, clPlayoff: 1, europaLeague: 2, conferenceLeague: 1,
    tvEqualShare: 6,
    startingBudget: 16_000_000, gateBase: 250_000, prizeTop: 10_000_000, prizeStep: 400_000,
  },
  {
    id: 'liga_portugal_2', name: 'Liga Portugal 2', country: 'Portugal', level: 2,
    clubCount: 0, rounds: 2, phantom: true,
    autoPromotion: 2, playoffSpots: 0, relegation: 0,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 0.3,
    startingBudget: 800_000, gateBase: 20_000, prizeTop: 600_000, prizeStep: 22_000,
  },

  // ── Scotland: the genuine top-six split (3 full rounds, then split 6/6) ──
  // Our dataset ships no Scottish clubs, so these leagues sit empty; the split
  // and multi-round machinery they describe is implemented generically in
  // seasonProgression (generateLeagueFixtures / applySplit) and exercised by
  // the smoke test.
  {
    id: 'scottish_premiership', name: 'Scottish Premiership', country: 'Scotland', level: 1,
    clubCount: 12, rounds: 3, splitSize: 6,
    autoPromotion: 0, playoffSpots: 0, relegation: 1, interPlayoff: 'scottish_championship',
    championsLeague: 1, clPlayoff: 1, europaLeague: 1, conferenceLeague: 2,
    tvEqualShare: 1.3,
    startingBudget: 3_000_000, gateBase: 55_000, prizeTop: 2_500_000, prizeStep: 120_000,
  },
  {
    // phantom:true, like every other tier-2 league below — pre-existing gap
    // that only surfaced once Scottish Premiership got real clubs to
    // relegate: without it, there's no pool to promote a club back up from,
    // and the Premiership loses a club every season it relegates.
    id: 'scottish_championship', name: 'Scottish Championship', country: 'Scotland', level: 2,
    clubCount: 0, rounds: 4, phantom: true,
    autoPromotion: 1, playoffSpots: 0, relegation: 1, interPlayoffFeeder: 'scottish_premiership', interPlayoffFeederSpots: 3,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 0.2,
    startingBudget: 600_000, gateBase: 15_000, prizeTop: 450_000, prizeStep: 20_000,
  },
  {
    id: 'scottish_league_one', name: 'Scottish League One', country: 'Scotland', level: 3,
    clubCount: 0, rounds: 2, phantom: true,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 0,
    startingBudget: 250_000, gateBase: 8_000, prizeTop: 150_000, prizeStep: 5_000,
  },

  // ── Single-tier leagues sourced from the EA FC 26 ratings export: real
  // clubs and real rosters, but no modelled lower division since the export
  // only carries each country's top flight. ───────────────────────────────
  {
    id: 'pro_league', name: 'Pro League', country: 'Belgium', level: 1,
    clubCount: 16, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 1, europaLeague: 1, conferenceLeague: 2,
    tvEqualShare: 3.5,
    startingBudget: 6_000_000, gateBase: 100_000, prizeTop: 5_000_000, prizeStep: 180_000,
  },
  {
    // rounds:1, not 2 — 30 clubs is more than the 24-club double round-robin
    // the 46-week season is built around (2*(clubCount-1) must fit in 46
    // match weeks); a single round-robin (29 rounds) fits without cutting
    // any of the real clubs down to 24.
    id: 'mls', name: 'MLS', country: 'United States', level: 1,
    clubCount: 30, rounds: 1,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 0, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 5,
    startingBudget: 8_000_000, gateBase: 130_000, prizeTop: 6_000_000, prizeStep: 220_000,
  },
  {
    id: 'superliga', name: 'Superliga', country: 'Denmark', level: 1,
    clubCount: 12, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 1, europaLeague: 1, conferenceLeague: 1,
    tvEqualShare: 2,
    startingBudget: 3_500_000, gateBase: 60_000, prizeTop: 2_800_000, prizeStep: 100_000,
  },
  {
    // rounds:1 for the same reason as MLS above: 30 clubs won't fit a
    // double round-robin in a 46-week season.
    id: 'argentina_lpf', name: 'Liga Profesional', country: 'Argentina', level: 1,
    clubCount: 30, rounds: 1,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 2, clPlayoff: 0, europaLeague: 2, conferenceLeague: 1,
    tvEqualShare: 4,
    startingBudget: 5_000_000, gateBase: 90_000, prizeTop: 4_000_000, prizeStep: 150_000,
  },
  {
    id: 'super_lig', name: 'Süper Lig', country: 'Turkey', level: 1,
    clubCount: 18, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 2, clPlayoff: 0, europaLeague: 2, conferenceLeague: 1,
    tvEqualShare: 9,
    startingBudget: 11_000_000, gateBase: 170_000, prizeTop: 9_000_000, prizeStep: 320_000,
  },
  {
    id: 'saudi_pro_league', name: 'Saudi Pro League', country: 'Saudi Arabia', level: 1,
    clubCount: 18, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 0, europaLeague: 1, conferenceLeague: 1,
    tvEqualShare: 12,
    startingBudget: 15_000_000, gateBase: 160_000, prizeTop: 12_000_000, prizeStep: 400_000,
  },
  {
    id: 'chinese_super_league', name: 'Chinese Super League', country: 'China', level: 1,
    clubCount: 16, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 0, europaLeague: 1, conferenceLeague: 0,
    tvEqualShare: 4,
    startingBudget: 4_500_000, gateBase: 80_000, prizeTop: 3_500_000, prizeStep: 140_000,
  },
  {
    id: 'k_league_1', name: 'K League 1', country: 'South Korea', level: 1,
    clubCount: 12, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 0, europaLeague: 1, conferenceLeague: 0,
    tvEqualShare: 2.5,
    startingBudget: 3_000_000, gateBase: 55_000, prizeTop: 2_400_000, prizeStep: 90_000,
  },
  {
    id: 'ekstraklasa', name: 'Ekstraklasa', country: 'Poland', level: 1,
    clubCount: 18, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 1, europaLeague: 1, conferenceLeague: 1,
    tvEqualShare: 2,
    startingBudget: 2_500_000, gateBase: 50_000, prizeTop: 2_000_000, prizeStep: 80_000,
  },
  {
    id: 'liga_1_romania', name: 'Superliga', country: 'Romania', level: 1,
    clubCount: 16, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 1, europaLeague: 1, conferenceLeague: 2,
    tvEqualShare: 1.5,
    startingBudget: 2_000_000, gateBase: 40_000, prizeTop: 1_600_000, prizeStep: 60_000,
  },
  {
    id: 'eliteserien', name: 'Eliteserien', country: 'Norway', level: 1,
    clubCount: 16, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 1, europaLeague: 1, conferenceLeague: 1,
    tvEqualShare: 2,
    startingBudget: 2_200_000, gateBase: 45_000, prizeTop: 1_800_000, prizeStep: 70_000,
  },
  {
    id: 'allsvenskan', name: 'Allsvenskan', country: 'Sweden', level: 1,
    clubCount: 16, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 1, europaLeague: 1, conferenceLeague: 1,
    tvEqualShare: 2,
    startingBudget: 2_200_000, gateBase: 45_000, prizeTop: 1_800_000, prizeStep: 70_000,
  },
  {
    id: 'swiss_super_league', name: 'Swiss Super League', country: 'Switzerland', level: 1,
    clubCount: 12, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 1, europaLeague: 1, conferenceLeague: 1,
    tvEqualShare: 3,
    startingBudget: 3_200_000, gateBase: 58_000, prizeTop: 2_600_000, prizeStep: 95_000,
  },
  {
    id: 'austrian_bundesliga', name: 'Austrian Bundesliga', country: 'Austria', level: 1,
    clubCount: 12, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 1, europaLeague: 1, conferenceLeague: 1,
    tvEqualShare: 2.5,
    startingBudget: 2_800_000, gateBase: 50_000, prizeTop: 2_200_000, prizeStep: 85_000,
  },
  {
    id: 'a_league_men', name: 'A-League Men', country: 'Australia', level: 1,
    clubCount: 12, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 1.5,
    startingBudget: 1_600_000, gateBase: 35_000, prizeTop: 1_300_000, prizeStep: 50_000,
  },
  {
    id: 'indian_super_league', name: 'Indian Super League', country: 'India', level: 1,
    clubCount: 14, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 0, europaLeague: 0, conferenceLeague: 0,
    tvEqualShare: 1.2,
    startingBudget: 1_200_000, gateBase: 28_000, prizeTop: 1_000_000, prizeStep: 40_000,
  },
  {
    id: 'league_of_ireland_premier', name: 'Premier Division', country: 'Ireland', level: 1,
    clubCount: 10, rounds: 2,
    autoPromotion: 0, playoffSpots: 0, relegation: 0,
    championsLeague: 1, clPlayoff: 1, europaLeague: 1, conferenceLeague: 1,
    tvEqualShare: 0.8,
    startingBudget: 900_000, gateBase: 20_000, prizeTop: 700_000, prizeStep: 25_000,
  },
];

const LEAGUE_BY_ID = new Map(LEAGUES.map((l) => [l.id, l]));

/** Every league id, pyramid order (country, then level). */
export const ALL_LEAGUE_IDS: string[] = LEAGUES.map((l) => l.id);

/** Leagues the game actually simulates (fixtures, tables, UI). */
export const SIMULATED_LEAGUE_IDS: string[] = LEAGUES.filter((l) => !l.phantom).map((l) => l.id);

export function getLeague(id: string): LeagueDef {
  return LEAGUE_BY_ID.get(id) ?? LEAGUES[0];
}

export function leagueName(id: string): string {
  return LEAGUE_BY_ID.get(id)?.name ?? id;
}

export function isPhantomLeague(id: string): boolean {
  return !!LEAGUE_BY_ID.get(id)?.phantom;
}

/** Maps a country to its `--league-*` CSS custom property (defined in
 *  app/globals.css: real, recognisable per-country colours — PL purple, La
 *  Liga orange, Bundesliga red, etc.) and the actual hex behind that token,
 *  kept in sync here so a readable ink colour can be computed for any of
 *  them, not hand-picked one country at a time. A separate axis from
 *  `--brand` (the managed club's own colour) — this reflects the LEAGUE's
 *  identity, fixed regardless of which club the player runs. */
const COUNTRY_LEAGUE: Record<string, { cssVar: string; hex: string }> = {
  England: { cssVar: '--league-england', hex: '#38003c' },
  Spain: { cssVar: '--league-spain', hex: '#ff4b12' },
  Italy: { cssVar: '--league-italy', hex: '#024494' },
  Germany: { cssVar: '--league-germany', hex: '#d3010c' },
  France: { cssVar: '--league-france', hex: '#0d1a4b' },
  Netherlands: { cssVar: '--league-netherlands', hex: '#e2001a' },
  Portugal: { cssVar: '--league-portugal', hex: '#0f8a5f' },
  Scotland: { cssVar: '--league-scotland', hex: '#003087' },
};

/** Relative luminance via the standard sRGB coefficients — same formula as
 *  `readableTextOn` in components/visuals.tsx, duplicated here in a small,
 *  self-contained form rather than imported, since engine modules stay free
 *  of any component-layer import. */
function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b <= 0.55;
}

/** CSS `var(...)` color for a league's country identity, plus a readable ink
 *  color for text/borders sitting directly on it. */
export function leagueColor(id: string): { color: string; text: string } {
  const country = getLeague(id).country;
  const entry = COUNTRY_LEAGUE[country];
  if (!entry) return { color: 'var(--border-bright)', text: 'var(--text)' };
  return { color: `var(${entry.cssVar})`, text: isDark(entry.hex) ? '#f5f5f5' : '#04140d' };
}

/** Every league in one country, top tier first. */
export function pyramidOf(country: string): LeagueDef[] {
  return LEAGUES.filter((l) => l.country === country).sort((a, b) => a.level - b.level);
}

/** Distinct countries in pyramid order. */
export const COUNTRIES: string[] = [...new Set(LEAGUES.map((l) => l.country))];

/** The league one tier above / below within the same country (null at the ends). */
export function leagueAbove(id: string): LeagueDef | null {
  const lg = getLeague(id);
  const p = pyramidOf(lg.country);
  const i = p.findIndex((l) => l.id === id);
  return i > 0 ? p[i - 1] : null;
}
export function leagueBelow(id: string): LeagueDef | null {
  const lg = getLeague(id);
  const p = pyramidOf(lg.country);
  const i = p.findIndex((l) => l.id === id);
  return i >= 0 && i < p.length - 1 ? p[i + 1] : null;
}

/** Legacy `Division` (1–10) → league id. Used to read gamedata.json and to
 *  migrate pre-v4 saves; nothing else should branch on a division number. */
export const DIVISION_TO_LEAGUE: Record<Division, string> = {
  1: 'premier_league',
  2: 'championship',
  3: 'league_one',
  4: 'league_two',
  5: 'la_liga',
  6: 'serie_a',
  7: 'bundesliga',
  8: 'ligue_1',
  9: 'eredivisie',
  10: 'primeira_liga',
  11: 'pro_league',
  13: 'mls',
  14: 'superliga',
  15: 'argentina_lpf',
  16: 'super_lig',
  17: 'saudi_pro_league',
  18: 'chinese_super_league',
  19: 'k_league_1',
  20: 'ekstraklasa',
  21: 'liga_1_romania',
  22: 'eliteserien',
  23: 'allsvenskan',
  24: 'swiss_super_league',
  25: 'austrian_bundesliga',
  26: 'scottish_premiership',
  27: 'a_league_men',
  28: 'indian_super_league',
  29: 'league_of_ireland_premier',
};

/* Every money field in LEAGUES is authored on the base economy; MONEY_SCALE
   lifts them to the scale the game quotes. Done as a pass over the table so a
   new league added above cannot forget it. `tvEqualShare` is deliberately not
   scaled: it feeds the reference revenue model that `economyScale` divides by,
   so scaling `gateBase` already carries TV money up with everything else, and
   scaling both would compound. */
for (const lg of LEAGUES) {
  lg.startingBudget *= MONEY_SCALE;
  lg.gateBase *= MONEY_SCALE;
  lg.prizeTop *= MONEY_SCALE;
  lg.prizeStep *= MONEY_SCALE;
}

export function leagueIdForDivision(division: number): string {
  return DIVISION_TO_LEAGUE[division as Division] ?? 'premier_league';
}

/** Baseline starting transfer budget for this league — the money a *median*
 *  club in the division has. Individual clubs scale off this; see
 *  `clubStartingBudget`. */
export function startingBudget(leagueId: string): number {
  return getLeague(leagueId).startingBudget;
}

/**
 * How far a club's kitty sits from its league's baseline, from its standing
 * within its own division (1 = strongest squad, `of` = weakest).
 *
 * A flat per-league budget made every side in a division equally rich, which
 * is the one thing nobody believes: Arsenal and Burnley are in the same
 * competition but not in the same market. The curve is exponential rather
 * than linear because football money is — the gap between 1st and 4th is far
 * bigger than the gap between 14th and 17th.
 *
 * Weakest club ≈ 0.25×, median ≈ 0.64×, strongest ≈ 1.63× the league baseline.
 * At the Premier League's £40m baseline that runs roughly £10m to £65m.
 *
 * The ceiling is deliberately tighter than real-world spending because this
 * game's market is cheap: an 85-rated player asks around £6.6m, so a £120m
 * kitty buys most of an XI in a single window and the market stops meaning
 * anything. The ratio between top and bottom is what sells the hierarchy —
 * about 6.5:1 here — not the absolute ceiling.
 */
export function statureBudgetMultiplier(rank: number, of: number): number {
  const n = Math.max(1, of);
  // 0 for the weakest squad in the division, 1 for the strongest.
  const standing = n > 1 ? 1 - (Math.min(Math.max(rank, 1), n) - 1) / (n - 1) : 0.5;
  return 0.25 * Math.exp(1.87 * standing);
}

/**
 * Transfer budgets sit on the same scale as the rest of the economy.
 *
 * The league baselines predate the wage model, and were set when wages cost a
 * club ~8% of its revenue and nothing else competed for the money. Measured
 * against everything else this game prices — an elite player asks £6.6m, a
 * top club earns £39m a season and pays £22m of it in wages — the old
 * baselines ran roughly four times too rich: they handed a title favourite
 * 167% of its annual revenue to spend, where a real one gets about 25%.
 *
 * The consequence was concrete rather than cosmetic. Spending a full budget
 * amortized straight through the 70% squad-cost limit, so the board's own
 * money triggered a transfer embargo. Scaling the whole curve down keeps the
 * hierarchy exactly as it was — the ratio between clubs is untouched — while
 * making the money spendable and the market meaningful again.
 */
export const BUDGET_SCALE = 0.26;

/** Starting transfer budget for one specific club: its league's baseline
 *  scaled by where its squad ranks inside that league. */
export function clubStartingBudget(leagueId: string, rank: number, of: number): number {
  const raw = getLeague(leagueId).startingBudget * statureBudgetMultiplier(rank, of) * BUDGET_SCALE;
  // Round to something a board would actually quote. The thresholds and steps
  // are money, so they ride MONEY_SCALE too — otherwise the granularity of a
  // quote would change with the scale.
  const step = raw >= 20_000_000 * MONEY_SCALE ? 1_000_000 * MONEY_SCALE
    : raw >= 2_000_000 * MONEY_SCALE ? 100_000 * MONEY_SCALE
    : 10_000 * MONEY_SCALE;
  return Math.max(step, Math.round(raw / step) * step);
}

/** One-line pitch for a league on the club-select screen. */
export function formatLeagueBlurb(leagueId: string): string {
  const lg = getLeague(leagueId);
  const tier = lg.level === 1 ? 'Top flight' : lg.level === 2 ? 'Second tier'
    : lg.level === 3 ? 'Third tier' : `Tier ${lg.level}`;
  const bits: string[] = [`${tier} of ${lg.country}.`];
  if (lg.championsLeague + lg.clPlayoff > 0) bits.push('Continental football for the best of them.');
  if (lg.autoPromotion > 0) bits.push(`${lg.autoPromotion} go up automatically${lg.playoffSpots >= 4 ? ', with play-offs for one more' : ''}.`);
  if (lg.relegation > 0) bits.push(`${lg.relegation} go down.`);
  return bits.join(' ');
}

/** Weekly gate income baseline for this league. */
export function gateBase(leagueId: string): number {
  return getLeague(leagueId).gateBase;
}

/** Calendar weeks each domestic cup round is played (7 rounds, 72 clubs across
 *  divisions 1-3 at 24 clubs each — the entrant count isn't a power of two, so
 *  the bracket needs an extra qualifying round; see makeDomesticCup). The
 *  first entry is that extra early round, so every later round keeps its
 *  original week/prize unchanged. */
export const CUP_WEEKS = [2, 4, 9, 14, 19, 25, 31];
/** Prize for winning a tie in each cup round (last = winning the final). */
export const CUP_PRIZES = [75_000, 150_000, 300_000, 600_000, 1_200_000, 2_500_000, 6_000_000].map((v) => v * MONEY_SCALE);

/** Continental Champions Cup: 24 clubs (top 8 seeds bye to the Round of 16,
 *  the rest fight through a two-legged playoff round), then two-legged R16 /
 *  QF / SF and a single-match final — 5 rounds. Each entry is the week the
 *  round's first leg (or the final) is played; a two-legged round's second
 *  leg follows one week later. */
export const CONTINENTAL_WEEKS = [6, 12, 20, 33, 44];
export const CONTINENTAL_PRIZES = [1_500_000, 3_000_000, 6_000_000, 12_000_000, 25_000_000].map((v) => v * MONEY_SCALE);
export const CONTINENTAL_SPOTS = 24;


/** Cost to upgrade the youth academy to level 2 / level 3. */
export const ACADEMY_UPGRADE_COST: Record<number, number> = { 2: 5_000_000 * MONEY_SCALE, 3: 12_000_000 * MONEY_SCALE };

/** Backroom staff: cost to reach each level (index = new level) and weekly wage per level. */
export const STAFF_UPGRADE_COST = [0, 500_000, 1_500_000, 4_000_000].map((v) => v * MONEY_SCALE);
export const STAFF_WEEKLY_WAGE = 10_000 * MONEY_SCALE; // per level, per role
export const STAFF_MAX_LEVEL = 3;

/** Stadium expansion: gate income multiplier is 1 + 0.25 × (level − 1). */
export const STADIUM_UPGRADE_COST: Record<number, number> = { 2: 8_000_000 * MONEY_SCALE, 3: 20_000_000 * MONEY_SCALE };

/** In-match substitutions allowed at half time. */
export const MAX_SUBS = 3;

export const HOME_ADVANTAGE = 1.18;
export const BASE_GOALS = 1.32; // league-average goals per team per match

export const MORALE_START = 60;
export const MORALE_WIN = 6;
export const MORALE_DRAW = 1;
export const MORALE_LOSS = -6;
export const MORALE_MIN = 30;
export const MORALE_MAX = 95;

/** Prize money by final league position (1-based), from the league's own
 *  top prize and per-place step. Never negative. */
export function prizeMoney(leagueId: string, position: number): number {
  const lg = getLeague(leagueId);
  return Math.max(0, lg.prizeTop - (position - 1) * lg.prizeStep);
}

function line(pos: Position, labels: string[], y: number): { pos: Position; label: string; x: number; y: number }[] {
  const n = labels.length;
  return labels.map((label, i) => ({
    pos,
    label,
    x: n === 1 ? 50 : 10 + (80 * i) / (n - 1),
    y,
  }));
}

export const FORMATIONS: FormationDef[] = [
  {
    id: '4-4-2',
    name: '4-4-2 Classic',
    slots: [
      { pos: 'GK', label: 'GK', x: 50, y: 6 },
      ...line('DEF', ['LB', 'CB', 'CB', 'RB'], 28),
      ...line('MID', ['LM', 'CM', 'CM', 'RM'], 55),
      ...line('FWD', ['ST', 'ST'], 82),
    ],
  },
  {
    id: '4-3-3',
    name: '4-3-3 Attack',
    slots: [
      { pos: 'GK', label: 'GK', x: 50, y: 6 },
      ...line('DEF', ['LB', 'CB', 'CB', 'RB'], 28),
      ...line('MID', ['CM', 'CM', 'CM'], 54),
      ...line('FWD', ['LW', 'ST', 'RW'], 81),
    ],
  },
  {
    id: '4-2-3-1',
    name: '4-2-3-1 Control',
    slots: [
      { pos: 'GK', label: 'GK', x: 50, y: 6 },
      ...line('DEF', ['LB', 'CB', 'CB', 'RB'], 27),
      ...line('MID', ['CDM', 'CDM'], 46),
      ...line('MID', ['CAM', 'CAM', 'CAM'], 65),
      ...line('FWD', ['ST'], 85),
    ],
  },
  {
    id: '3-5-2',
    name: '3-5-2 Wingback',
    slots: [
      { pos: 'GK', label: 'GK', x: 50, y: 6 },
      ...line('DEF', ['CB', 'CB', 'CB'], 26),
      ...line('MID', ['LM', 'CM', 'CM', 'CM', 'RM'], 54),
      ...line('FWD', ['ST', 'ST'], 82),
    ],
  },
  {
    id: '5-3-2',
    name: '5-3-2 Fortress',
    slots: [
      { pos: 'GK', label: 'GK', x: 50, y: 6 },
      ...line('DEF', ['LB', 'CB', 'CB', 'CB', 'RB'], 28),
      ...line('MID', ['CM', 'CM', 'CM'], 56),
      ...line('FWD', ['ST', 'ST'], 82),
    ],
  },
];

import { EXTENDED_FORMATIONS } from './tickEngine/tacticsData';

/** Full formation catalogue: the classic five plus the tick-engine set. */
export const ALL_FORMATIONS: FormationDef[] = [
  ...FORMATIONS,
  ...EXTENDED_FORMATIONS.filter((f) => !FORMATIONS.some((g) => g.id === f.id)),
];

/** Role labels for a line of `n` players, front-to-back by position group.
 *  Mirrors the label choices already used by the hand-authored FORMATIONS
 *  above, extended to sizes they don't cover. */
function lineLabels(group: Position, n: number): string[] {
  if (n <= 0) return [];
  if (group === 'DEF') {
    if (n === 1) return ['CB'];
    if (n === 2) return ['CB', 'CB'];
    if (n === 3) return ['CB', 'CB', 'CB'];
    if (n === 4) return ['LB', 'CB', 'CB', 'RB'];
    if (n === 5) return ['LB', 'CB', 'CB', 'CB', 'RB'];
    return ['LB', ...Array(n - 2).fill('CB'), 'RB'];
  }
  if (group === 'MID') {
    if (n === 1) return ['CM'];
    if (n === 2) return ['CM', 'CM'];
    if (n === 3) return ['CM', 'CM', 'CM'];
    if (n === 4) return ['LM', 'CM', 'CM', 'RM'];
    if (n === 5) return ['LM', 'CM', 'CM', 'CM', 'RM'];
    return ['LM', ...Array(n - 2).fill('CM'), 'RM'];
  }
  // FWD
  if (n === 1) return ['ST'];
  if (n === 2) return ['ST', 'ST'];
  if (n === 3) return ['LW', 'ST', 'RW'];
  return ['LW', ...Array(n - 2).fill('ST'), 'RW'];
}

/** Custom formation id convention: `custom-<def>-<mid>-<fwd>`, e.g.
 *  `custom-3-4-3`. Generated on the fly rather than pre-registered, since the
 *  space of valid line splits (any three positive integers summing to 10) is
 *  too large to enumerate — `formation: 'custom'` (gap 24) means "any split
 *  the player builds", not a fixed extra formation. */
export function customFormationId(def: number, mid: number, fwd: number): string {
  return `custom-${def}-${mid}-${fwd}`;
}

export function parseCustomFormationId(id: string): [number, number, number] | null {
  const m = /^custom-(\d+)-(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Auto-generates positions and role labels from an arbitrary def/mid/fwd
 *  line split (gap 24). `def + mid + fwd` must equal 10 — one keeper plus
 *  the split fills the XI. Invalid splits fall back to a balanced 4-3-3 shape
 *  rather than producing a formation with the wrong number of slots. */
export function buildCustomFormation(def: number, mid: number, fwd: number): FormationDef {
  if (def < 1 || mid < 1 || fwd < 1 || def + mid + fwd !== 10) {
    return getFormation('4-3-3');
  }
  const id = customFormationId(def, mid, fwd);
  return {
    id,
    name: `Custom ${def}-${mid}-${fwd}`,
    slots: [
      { pos: 'GK', label: 'GK', x: 50, y: 6 },
      ...line('DEF', lineLabels('DEF', def), 27),
      ...line('MID', lineLabels('MID', mid), 55),
      ...line('FWD', lineLabels('FWD', fwd), 82),
    ],
  };
}

export function getFormation(id: string): FormationDef {
  const found = ALL_FORMATIONS.find((f) => f.id === id);
  if (found) return found;
  const custom = parseCustomFormationId(id);
  if (custom) return buildCustomFormation(...custom);
  return FORMATIONS[1];
}
