/**
 * Starting scenarios (Phase 11) — seven bespoke challenges to set a career up
 * under, ported from the reference's SCENARIOS table.
 *
 * `applyScenario` runs once, right after `newGame`, and mutates budget, board
 * confidence, points or academy standing to match the premise; the Relegation
 * Battle scenario additionally fast-forwards roughly half the season before
 * handing control to the player, matching the reference's "you inherit this
 * on Boxing Day" premise. `evalScenarioAtSeasonEnd` runs from `endSeason` and
 * decides success/failure/continuation.
 */
import type { Club, GameState, Player, ScenarioId, ScenarioState, SeasonSummary } from './types';
import { getLeague } from './gameRules';
import { squadAvgRating } from './teamManagement';
import { pushInbox } from './inbox';
import { ensureFinances } from './finances';

// Deliberately no import from seasonProgression.ts or transferMarket.ts here:
// transferMarket.ts calls recordScenarioSale() below, and seasonProgression.ts
// calls evalScenarioAtSeasonEnd(); either of those importing playRound back
// from seasonProgression.ts would close a 3-file import cycle
// (transferMarket -> scenarios -> seasonProgression -> transferMarket). The
// Relegation Battle fast-forward that needs playRound/seasonOver lives in the
// component layer instead (FootballManagerGame.tsx), which already has those
// in scope with no such cycle.

export interface ScenarioDef {
  id: ScenarioId;
  icon: string;
  name: string;
  tagline: string;
  blurb: string;
  objective: string;
  /** Restricts the club picker. Absent = any club. */
  clubFilter?: (club: Club, state: GameState) => boolean;
}

/** True when a club sits in the bottom half of its own league by squad
 *  rating — the same test the reference's isBottomHalfClub runs. */
export function isBottomHalfClub(club: Club, state: GameState): boolean {
  const peers = state.clubs
    .filter((c) => c.leagueId === club.leagueId && !c.dormant)
    .sort((a, b) => squadAvgRating(state, b.id) - squadAvgRating(state, a.id));
  const rank = peers.findIndex((c) => c.id === club.id) + 1;
  return rank > 0 && rank > Math.ceil(peers.length / 2);
}

function nonTopFlight(club: Club): boolean {
  return getLeague(club.leagueId).level >= 2;
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'relegation_battle',
    icon: 'warning',
    name: 'Relegation Battle',
    tagline: 'A bottom-half side with a horror start — take over at Christmas, points deducted.',
    blurb: 'A horrid first half of the season was already sinking a side that had no business being down there — and now the league has docked points on top of it. The previous manager paid the price; you inherit the crisis at the season\'s halfway point with everything to do.',
    objective: 'Survive relegation this season.',
    clubFilter: isBottomHalfClub,
  },
  {
    id: 'hollywood',
    icon: 'movie',
    name: 'Hollywood Story',
    tagline: 'Pick any non-top-flight club — a real war chest, and promotion every season, all the way up.',
    blurb: 'New celebrity money buys a script straight out of the movies: a genuine transfer kitty plus a mandate for automatic promotion, season after season, however many rungs it takes to reach the top flight. Slip up even once and the story is over.',
    objective: 'Win promotion every season in a row, all the way to the top flight.',
    clubFilter: nonTopFlight,
  },
  {
    id: 'broke',
    icon: 'money-out',
    name: 'Broke',
    tagline: 'Any club — deep in debt before you\'ve picked a team.',
    blurb: 'The last regime spent recklessly and left the books in ruins. Whatever club you pick, the debt is scaled to match — a fortune for a small side, still a real crisis for a giant.',
    objective: 'Get the club\'s balance back into the black.',
  },
  {
    id: 'takeover',
    icon: 'money-in',
    name: 'The Takeover',
    tagline: 'Any non-top-flight club — a huge war chest and a board that expects a lasting project.',
    blurb: 'A mystery consortium buys the club and hands you a war chest sized to how transformative that kind of money would actually be at this level. They expect promotion soon, and they expect the club to stay there once it arrives.',
    objective: 'Win promotion within 2 seasons, then stay up the following season.',
    clubFilter: nonTopFlight,
  },
  {
    id: 'wonderkid_factory',
    icon: 'sprout',
    name: 'Wonderkid Factory',
    tagline: 'Any club — a first-class academy, whatever it takes to build one.',
    blurb: 'Whatever club you pick, the board is putting its money into the academy instead of the transfer kitty: facilities are already built out, reputation is strong, and a promising crop of prospects is waiting. The job is to develop them and sell high.',
    objective: 'Sell 3 academy graduates for a profit within 3 seasons.',
  },
  {
    id: 'underdog_title',
    icon: 'trophy',
    name: 'Against All Odds',
    tagline: 'A bottom-half club that nobody thinks can win anything at all.',
    blurb: 'Whatever club you pick, it\'s a genuine bottom-half side — the kind whose fans would settle for a quiet mid-table finish. Winning the league from here isn\'t just unlikely, it\'s the sort of story nobody would believe.',
    objective: 'Win the league title within 3 seasons.',
    clubFilter: isBottomHalfClub,
  },
  {
    id: 'points_deduction',
    icon: 'block',
    name: 'Points Deduction',
    tagline: 'Any club — a severe points deduction before a ball is even kicked.',
    blurb: 'The league has handed down its punishment before the season has even started: a heavy points deduction for financial breaches, wiping out any hope of a normal start.',
    objective: 'Avoid relegation despite starting the season on -24 points.',
  },
];

const POINTS_DEDUCTION_AMOUNT = 24;

/** Board-confidence-scaled injection: a smaller/lower-reputation club gets a
 *  proportionally bigger relative splash from the same absolute sum. */
function injectionByLevel(level: number, base: Record<number, number>, club: Club): number {
  const amount = base[level] ?? Object.values(base)[Object.values(base).length - 1] ?? 6_000_000;
  const repBoost = 1 + (3 - Math.min(3, club.reputation ?? 1)) * 0.15;
  return Math.round(amount * repBoost);
}

const HOLLYWOOD_INJECTION_BY_LEVEL: Record<number, number> = { 2: 20_000_000, 3: 12_000_000, 4: 7_000_000, 5: 4_000_000 };
const TAKEOVER_INJECTION_BY_LEVEL: Record<number, number> = { 2: 40_000_000, 3: 25_000_000, 4: 15_000_000, 5: 8_000_000 };

/** Relegation Battle needs the caller to fast-forward roughly half the season
 *  (via seasonProgression's playRound/seasonOver, from the component layer)
 *  before calling applyScenario, so the points deduction and board-confidence
 *  hit land on the club's actual mid-season position. Every other scenario
 *  applies immediately at game start. */
export function scenarioNeedsPreseasonFastForward(id: ScenarioId): boolean {
  return id === 'relegation_battle';
}

/**
 * Apply the chosen scenario to a freshly created (and, for Relegation Battle,
 * already fast-forwarded) career. Call this once, before the player sees the
 * hub.
 */
export function applyScenario(state: GameState, scenarioId: ScenarioId): GameState {
  const def = SCENARIOS.find((d) => d.id === scenarioId);
  if (!def) return state;
  // Clone rather than mutate, matching every other engine entry point's
  // convention — callers are free to keep a reference to the pre-scenario
  // state (e.g. for a "before" comparison) without it being silently mutated.
  const s: GameState = structuredClone(state);
  const club = s.clubs.find((c) => c.id === s.userClubId)!;
  const level = getLeague(club.leagueId).level;

  const scenario: ScenarioState = {
    id: scenarioId, status: 'active', objective: def.objective, startedSeason: s.seasonYear, meta: {},
  };

  switch (scenarioId) {
    case 'relegation_battle': {
      const deduction = 6;
      s.board.confidence = Math.max(5, s.board.confidence - 20);
      applyPointsHit(s, deduction);
      scenario.meta.deduction = deduction;
      pushInbox(s, {
        category: 'board',
        title: 'Welcome to the crisis',
        body: `You take over with the club already in serious trouble, and the league has docked a further ${deduction} points for financial irregularities under the previous board. Survival is the only job.`,
      });
      break;
    }
    case 'hollywood': {
      const promosNeeded = Math.max(1, level - 1);
      const injection = injectionByLevel(level, HOLLYWOOD_INJECTION_BY_LEVEL, club);
      s.budget += injection;
      s.board.confidence = 65;
      scenario.meta.streak = 0;
      scenario.meta.promosNeeded = promosNeeded;
      scenario.objective = `Win ${promosNeeded} promotion${promosNeeded > 1 ? 's' : ''} in a row to reach the top flight.`;
      pushInbox(s, {
        category: 'board',
        title: 'The cameras are rolling',
        body: `New celebrity ownership hands you ${moneyStr(injection)} to work with. The story only works if you keep winning promotion — ${promosNeeded} in a row gets you to the top.`,
      });
      break;
    }
    case 'broke': {
      const debt = -Math.round(Math.max(1_000_000, s.budget * 0.9));
      s.budget = debt;
      s.board.confidence = 35;
      pushInbox(s, {
        category: 'board',
        title: 'Books in the red',
        body: `The previous board left ${club.name} ${moneyStr(Math.abs(debt))} in debt. The new owners expect prudence — get the finances back under control.`,
      });
      break;
    }
    case 'takeover': {
      const injection = injectionByLevel(level, TAKEOVER_INJECTION_BY_LEVEL, club);
      s.budget += injection;
      s.board.confidence = 75;
      scenario.meta.deadlineSeason = s.seasonYear + 1;
      pushInbox(s, {
        category: 'board',
        title: 'New owners, big ambitions',
        body: `A mystery consortium hands you ${moneyStr(injection)}. They expect promotion within 2 seasons, and to stay there once it arrives.`,
      });
      break;
    }
    case 'wonderkid_factory': {
      s.academyLevel = 3;
      s.board.confidence = 70;
      scenario.meta.academySales = 0;
      pushInbox(s, {
        category: 'board',
        title: 'Built for developing talent',
        body: 'The academy is fully funded and staffed — your job is to develop the prospects coming through it and sell them on for a profit.',
      });
      break;
    }
    case 'underdog_title': {
      s.board.confidence = 60;
      scenario.meta.deadlineSeason = s.seasonYear + 2;
      pushInbox(s, {
        category: 'board',
        title: 'Dreaming big',
        body: `${club.name} are a bottom-half side nobody expects to challenge for the title — that's exactly the point.`,
      });
      break;
    }
    case 'points_deduction': {
      applyPointsHit(s, POINTS_DEDUCTION_AMOUNT);
      s.board.confidence = 15;
      scenario.meta.deduction = POINTS_DEDUCTION_AMOUNT;
      pushInbox(s, {
        category: 'board',
        title: `${POINTS_DEDUCTION_AMOUNT}-point deduction confirmed`,
        body: `The league has confirmed a ${POINTS_DEDUCTION_AMOUNT}-point deduction for financial breaches before a ball has even been kicked. ${club.name} start the season on -${POINTS_DEDUCTION_AMOUNT} points.`,
      });
      break;
    }
  }

  s.scenario = scenario;
  return s;
}

/**
 * Reuses the same points-deduction field FFP/SCR breaches already write to
 * (applyPointsDeductions reads it at table-compute time) rather than adding a
 * second deduction source. `ensureFinances` initializes the finance record on
 * demand — safe to call this before any weekly tick has run.
 */
function applyPointsHit(s: GameState, amount: number): void {
  const fin = ensureFinances(s);
  fin.pointsDeduction = (fin.pointsDeduction ?? 0) + amount;
}

function moneyStr(v: number): string {
  return v >= 1_000_000 ? `£${(Math.round(v / 100_000) / 10).toFixed(1)}M` : `£${Math.round(v / 1000)}K`;
}

/**
 * Called from endSeason() with the just-computed summary. Decides
 * success/failure, or rewrites the objective and continues for a multi-season
 * scenario (Hollywood, Takeover, Wonderkid Factory, Against All Odds).
 * Returns null if there is nothing to evaluate (no active scenario).
 */
export function evalScenarioAtSeasonEnd(
  s: GameState,
  summary: SeasonSummary,
): { title: string; body: string } | null {
  const scen = s.scenario;
  if (!scen || scen.status !== 'active') return null;

  const relegated = !!summary.relegated;
  const promoted = !!summary.promoted;
  const pos = summary.position ?? 0;

  let msg: { title: string; body: string } | null = null;

  if (scen.id === 'relegation_battle') {
    if (relegated) {
      scen.status = 'failed';
      msg = { title: 'Relegated', body: 'The escape attempt fell short — the club is relegated.' };
    } else {
      scen.status = 'success';
      msg = { title: 'The Great Escape', body: `Survival secured despite the points deduction — ${clubName(s)} stay up.` };
    }
  } else if (scen.id === 'points_deduction') {
    if (relegated) {
      scen.status = 'failed';
      msg = { title: 'Relegated', body: `Starting ${scen.meta.deduction} points down proved too much to overcome.` };
    } else {
      scen.status = 'success';
      msg = { title: 'Survival secured', body: `Despite starting the season on -${scen.meta.deduction} points, ${clubName(s)} stay up.` };
    }
  } else if (scen.id === 'hollywood') {
    if (promoted) {
      scen.meta.streak = (scen.meta.streak ?? 0) + 1;
      const needed = scen.meta.promosNeeded ?? 1;
      if (scen.meta.streak >= needed) {
        scen.status = 'success';
        msg = { title: 'HOLLYWOOD ENDING!', body: `${scen.meta.streak} promotion${scen.meta.streak > 1 ? 's' : ''} in a row — ${clubName(s)} have reached the top flight. Roll credits.` };
      } else {
        const left = needed - scen.meta.streak;
        scen.objective = `Win ${left} more promotion${left > 1 ? 's' : ''} in a row to reach the top flight.`;
        msg = { title: 'Another promotion!', body: `Promotion #${scen.meta.streak} in a row. ${left} more to go.` };
      }
    } else {
      scen.status = 'failed';
      msg = relegated
        ? { title: 'The Hollywood ending falls apart', body: 'Relegated instead of promoted — the story ends here.' }
        : { title: 'The streak is over', body: 'No promotion this season — the run stops.' };
    }
  } else if (scen.id === 'takeover') {
    const deadline = scen.meta.deadlineSeason ?? s.seasonYear;
    if (promoted) {
      // Promotion achieved — now the objective becomes "stay up next season".
      scen.objective = 'Stay up next season to complete the project.';
      scen.meta.deadlineSeason = s.seasonYear + 1;
      msg = { title: 'Promotion won', body: 'The board is delighted — now prove it wasn\'t a fluke by staying up.' };
      if (s.seasonYear >= deadline && scen.meta.promosNeeded === undefined) {
        // Already promoted previously and just survived — success.
      }
    } else if (relegated) {
      scen.status = 'failed';
      msg = { title: 'Project collapses', body: 'Relegated — the takeover project has failed.' };
    } else if (scen.objective.startsWith('Stay up')) {
      scen.status = 'success';
      msg = { title: 'Project complete', body: `${clubName(s)} consolidated in the new division — the takeover has paid off.` };
    } else if (s.seasonYear >= deadline) {
      scen.status = 'failed';
      msg = { title: 'Time\'s up', body: 'No promotion within the window the board gave you — the project is over.' };
    }
  } else if (scen.id === 'underdog_title') {
    const deadline = scen.meta.deadlineSeason ?? s.seasonYear;
    if (summary.champions || pos === 1) {
      scen.status = 'success';
      msg = { title: 'Against all odds', body: `${clubName(s)} win the title — nobody believed it, and it happened anyway.` };
    } else if (s.seasonYear >= deadline) {
      scen.status = 'failed';
      msg = { title: 'The dream ends', body: 'No title within the window — the story falls just short.' };
    }
  } else if (scen.id === 'wonderkid_factory') {
    if ((scen.meta.academySales ?? 0) >= 3) {
      scen.status = 'success';
      msg = { title: 'Factory complete', body: '3 academy graduates sold for a profit — the project has done its job.' };
    } else if (s.seasonYear >= scen.startedSeason + 3) {
      scen.status = 'failed';
      msg = { title: 'Not enough graduates sold', body: `Only ${scen.meta.academySales ?? 0} of the 3 required sales landed in time.` };
    }
  } else if (scen.id === 'broke') {
    if (s.budget >= 0) {
      scen.status = 'success';
      msg = { title: 'Back in the black', body: `${clubName(s)}'s finances are balanced again.` };
    }
    // No failure condition/deadline for Broke — it just keeps running until solved.
  }

  return msg;
}

function clubName(s: GameState): string {
  return s.clubs.find((c) => c.id === s.userClubId)?.name ?? 'The club';
}

/**
 * Call from the sale-completion path (sellPlayer / completeIncomingSale) with
 * the player as he was BEFORE removal and the fee received. Only Wonderkid
 * Factory cares; every other scenario (or no scenario) is a no-op.
 */
export function recordScenarioSale(s: GameState, p: Player, fee: number): void {
  if (s.scenario?.id !== 'wonderkid_factory' || s.scenario.status !== 'active') return;
  if (p.nat === 'Academy' && fee > 0) {
    s.scenario.meta.academySales = (s.scenario.meta.academySales ?? 0) + 1;
    pushInbox(s, {
      category: 'transfer',
      title: 'Academy graduate sold for profit',
      body: `${p.name} came through the academy and has now been sold for ${moneyStr(fee)} — ${s.scenario.meta.academySales} of 3 required sales.`,
    });
  }
}
