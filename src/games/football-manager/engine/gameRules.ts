import type { Division, FormationDef, LeagueDef, Position } from './types';

/** Calendar weeks in a season. League fixtures occupy 46 of them; the two
 *  WINTER_BREAK weeks carry no domestic league football (gap item 41). */
export const SEASON_ROUNDS = 48;
/** Number of league match rounds a 24-club league actually plays. */
export const LEAGUE_ROUNDS = 46;
export const CLUBS_PER_DIVISION = 24;
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

export const MIN_SQUAD_SIZE = 16;
export const MAX_SQUAD_SIZE = 30;

/* ============================================================================
   THE LEAGUE PYRAMID
   ----------------------------------------------------------------------------
   Structure, promotion/relegation counts, UEFA slot allocation and TV
   equal-share values are ported from the reference implementation's
   `LEAGUES` map (js/data.js). `clubCount` is what our own dataset actually
   supplies (24 per simulated league) rather than the real-world figure —
   everything else is theirs.

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
    clubCount: 24, rounds: 2,
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
    clubCount: 24, rounds: 2,
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
    clubCount: 24, rounds: 2,
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
    clubCount: 24, rounds: 2,
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
    clubCount: 24, rounds: 2,
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
    clubCount: 24, rounds: 2,
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
    clubCount: 24, rounds: 2,
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
    id: 'scottish_championship', name: 'Scottish Championship', country: 'Scotland', level: 2,
    clubCount: 10, rounds: 4,
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
};

export function leagueIdForDivision(division: number): string {
  return DIVISION_TO_LEAGUE[division as Division] ?? 'premier_league';
}

/** Starting transfer budget for a club in this league. */
export function startingBudget(leagueId: string): number {
  return getLeague(leagueId).startingBudget;
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
export const CUP_PRIZES = [75_000, 150_000, 300_000, 600_000, 1_200_000, 2_500_000, 6_000_000];

/** Continental Champions Cup: 24 clubs (top 8 seeds bye to the Round of 16,
 *  the rest fight through a two-legged playoff round), then two-legged R16 /
 *  QF / SF and a single-match final — 5 rounds. Each entry is the week the
 *  round's first leg (or the final) is played; a two-legged round's second
 *  leg follows one week later. */
export const CONTINENTAL_WEEKS = [6, 12, 20, 33, 44];
export const CONTINENTAL_PRIZES = [1_500_000, 3_000_000, 6_000_000, 12_000_000, 25_000_000];
export const CONTINENTAL_SPOTS = 24;


/** Cost to upgrade the youth academy to level 2 / level 3. */
export const ACADEMY_UPGRADE_COST: Record<number, number> = { 2: 5_000_000, 3: 12_000_000 };

/** Backroom staff: cost to reach each level (index = new level) and weekly wage per level. */
export const STAFF_UPGRADE_COST = [0, 500_000, 1_500_000, 4_000_000];
export const STAFF_WEEKLY_WAGE = 10_000; // per level, per role
export const STAFF_MAX_LEVEL = 3;

/** Stadium expansion: gate income multiplier is 1 + 0.25 × (level − 1). */
export const STADIUM_UPGRADE_COST: Record<number, number> = { 2: 8_000_000, 3: 20_000_000 };

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
