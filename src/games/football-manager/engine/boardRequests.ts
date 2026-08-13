import type { BoardRequest, BoardRequestKind, Coach, GameState } from './types';
import { pushInbox } from './inbox';
import { formatMoney, MONEY_SCALE } from './utils';
import {
  ACADEMY_PROJECT_COST, MEDICAL_UPGRADE_COST, TRAINING_UPGRADE_COST, newFacilities,
} from './facilities';

/**
 * Board sanctions.
 *
 * Staff hires and facility projects used to be things the manager simply
 * bought — three `Hire (Q40/Q60/Q80)` buttons and a `Start project` button,
 * each spending club money with nobody to answer to. Neither read as a
 * decision, and neither had any relationship to the board confidence the
 * rest of the game is built around.
 *
 * Now both are *requests*. You ask; the chairman answers on the spot, with a
 * reason, and an approval is a one-shot licence to spend (`used`). Rejection
 * puts that specific ask on ice for a few weeks, so a "no" costs you
 * something rather than being a button you mash until it works.
 *
 * Pure engine module — no React, no imports from seasonProgression (which
 * imports facilities, which this imports; going the other way would close a
 * cycle). Everything it needs is on `state` already.
 */

/** Weeks a refusal stands before the same thing can be asked for again. */
const REJECTION_COOLDOWN_WEEKS = 8;

/** Absolute week counter, so a cooldown can cross a season boundary. */
function tick(s: GameState): number {
  return s.seasonYear * 100 + s.week;
}

export const COACH_ROLE_LABEL: Record<Coach['role'], string> = {
  assistant: 'Assistant Manager',
  attack: 'Attack Coach',
  midfield: 'Midfield Coach',
  defense: 'Defence Coach',
  goalkeeping: 'Goalkeeping Coach',
  fitness: 'Fitness Coach',
  analyst: 'Performance Analyst',
  head: 'Head Coach',
};

export type FacilityKey = 'training' | 'medical' | 'academy';

export const FACILITY_LABEL: Record<FacilityKey, string> = {
  training: 'Training ground',
  medical: 'Medical centre',
  academy: 'Academy',
};

/** What the next step of a facility would cost, or `null` if it's maxed. */
export function facilityCost(state: GameState, key: FacilityKey): number | null {
  const fs = state.facilities ?? newFacilities(state);
  if (key === 'training') return fs.trainingLevel >= 5 ? null : TRAINING_UPGRADE_COST[fs.trainingLevel + 1];
  if (key === 'medical') return fs.medicalLevel >= 5 ? null : MEDICAL_UPGRADE_COST[fs.medicalLevel + 1];
  return fs.academyReputation >= 100 ? null : ACADEMY_PROJECT_COST;
}

/** Weekly wage a coach of this quality commands — same formula `hireCoach`
 *  pays, exposed so the request screen can quote it before you ask. */
export function coachWageFor(quality: number): number {
  return Math.round((400 + quality * 45) * MONEY_SCALE);
}

/* ------------------------------------------------------------- lookups */

function requests(s: GameState): BoardRequest[] {
  return s.boardRequests ?? [];
}

/** The live, unspent approval for this exact thing, if there is one. */
export function approvalFor(state: GameState, kind: BoardRequestKind, key: string): BoardRequest | null {
  return requests(state).find((r) => r.kind === kind && r.key === key && r.status === 'approved' && !r.used) ?? null;
}

/** The most recent answer of any kind, for showing the chairman's last word. */
export function lastAnswerFor(state: GameState, kind: BoardRequestKind, key: string): BoardRequest | null {
  return requests(state).find((r) => r.kind === kind && r.key === key) ?? null;
}

/** Weeks left before a refused request can be put to the board again. */
export function cooldownWeeksLeft(state: GameState, kind: BoardRequestKind, key: string): number {
  const last = lastAnswerFor(state, kind, key);
  if (!last || last.status !== 'rejected') return 0;
  const until = last.seasonYear * 100 + last.week + REJECTION_COOLDOWN_WEEKS;
  return Math.max(0, until - tick(state));
}

/** Whether the board will even take the meeting. */
export function canAsk(state: GameState, kind: BoardRequestKind, key: string): boolean {
  if (approvalFor(state, kind, key)) return false;
  return cooldownWeeksLeft(state, kind, key) === 0;
}

/* ------------------------------------------------------------ decision */

/** How many sanctions the board has already granted this season. Each one
 *  makes the next ask harder — a chairman who has just signed off two
 *  projects is a harder sell than one who has signed off none. */
function approvalsThisSeason(s: GameState): number {
  return requests(s).filter((r) => r.status === 'approved' && r.seasonYear === s.seasonYear).length;
}

/**
 * The chairman's disposition, 0-100. Board confidence is the spine of it;
 * the fans and the club's cash position move it either side. Deliberately
 * built only from state this module can see without reaching into the
 * league table.
 */
function goodwill(s: GameState): number {
  const cash = s.budget > 0 ? 8 : -18;
  const fans = (s.fanConfidence - 50) * 0.2;
  return s.board.confidence + cash + fans - approvalsThisSeason(s) * 9;
}

function record(
  s: GameState,
  req: Omit<BoardRequest, 'id' | 'week' | 'seasonYear'>,
): BoardRequest {
  const full: BoardRequest = {
    ...req,
    id: s.nextBoardRequestId ?? 1,
    week: s.week,
    seasonYear: s.seasonYear,
  };
  s.nextBoardRequestId = full.id + 1;
  s.boardRequests = [full, ...requests(s)].slice(0, 40);
  return full;
}

/* --------------------------------------------------------------- staff */

/**
 * Ask the board to fund a coaching appointment. They answer with a quality
 * ceiling rather than a yes/no on the exact name you wanted: strong
 * goodwill buys you an established coach, a lukewarm board funds a
 * promising one, and a board that has lost faith funds nobody.
 */
export function requestStaffSanction(
  state: GameState,
  role: Coach['role'],
  rng: () => number = Math.random,
): GameState {
  if (!canAsk(state, 'staff', role)) return state;
  const s: GameState = structuredClone(state);
  const label = COACH_ROLE_LABEL[role];
  const g = goodwill(s) + (rng() * 16 - 8);

  // The wage has to clear the week's books too — a board in the red says no
  // to a salary however much it likes you.
  const brokeClub = s.budget < 0;

  let tier: number | null;
  if (brokeClub || g < 30) tier = null;
  else if (g >= 72) tier = 80;
  else if (g >= 48) tier = 60;
  else tier = 40;

  if (tier === null) {
    // Plain words. This is the only sentence on the Staff card that changes
    // anything, so it is the one sentence that has to land first time.
    const reason = brokeClub
      ? 'No. The club is losing money — we cannot pay anyone else right now.'
      : 'No. We do not think you need another coach at the moment.';
    record(s, { kind: 'staff', key: role, label: `${label} — appointment`, status: 'rejected', reason });
    pushInbox(s, {
      category: 'board',
      title: `Board turns down your ${label.toLowerCase()} request`,
      body: `${reason}\n\nYou can ask about a ${label.toLowerCase()} again in ${REJECTION_COOLDOWN_WEEKS} weeks.`,
    });
    return s;
  }

  const wage = coachWageFor(tier);
  const reason =
    tier >= 80 ? 'Yes — pick whoever you like. We will pay for a top coach.'
      : tier >= 60 ? 'Yes. We will pay for a good coach, but not the very best.'
        : 'Yes, but keep it cheap. Find someone young who is still learning.';
  record(s, { kind: 'staff', key: role, label: `${label} — appointment`, status: 'approved', tier, reason });
  pushInbox(s, {
    category: 'board',
    title: `Board sanctions a ${label.toLowerCase()}`,
    body: `${reason}\n\nWe will pay up to about ${formatMoney(wage)} a week. Go to the Staff screen to hire them.`,
  });
  return s;
}

/* ---------------------------------------------------------- facilities */

/**
 * Ask the board to fund the next step of a facility. Unlike a coach, this
 * is one number they either sign off or don't: the whole cost, out of club
 * funds, up front.
 */
export function requestFacilitySanction(
  state: GameState,
  key: FacilityKey,
  rng: () => number = Math.random,
): GameState {
  if (!canAsk(state, 'facility', key)) return state;
  const cost = facilityCost(state, key);
  if (cost == null) return state;

  const s: GameState = structuredClone(state);
  const label = FACILITY_LABEL[key];
  // How big an ask this is relative to what the club has to hand. Anything
  // over the balance is an automatic no whatever the mood in the boardroom.
  const strain = s.budget > 0 ? cost / s.budget : Infinity;
  const g = goodwill(s) + (rng() * 16 - 8) - Math.min(45, strain * 45);

  if (cost > s.budget) {
    const reason = `We do not have ${formatMoney(cost)} to put into the ${label.toLowerCase()}. Bring the balance up first.`;
    record(s, { kind: 'facility', key, label: `${label} — investment`, status: 'rejected', amount: cost, reason });
    pushInbox(s, {
      category: 'board',
      title: `Board rejects ${label.toLowerCase()} investment`,
      body: `${reason}\n\nThe board will hear the case again in ${REJECTION_COOLDOWN_WEEKS} weeks.`,
    });
    return s;
  }

  if (g < 42) {
    const reason =
      s.board.confidence < 40
        ? 'Results first. Show us this squad is going somewhere and we will talk about building.'
        : 'Not this year. That money is doing more good where it is.';
    record(s, { kind: 'facility', key, label: `${label} — investment`, status: 'rejected', amount: cost, reason });
    pushInbox(s, {
      category: 'board',
      title: `Board rejects ${label.toLowerCase()} investment`,
      body: `${reason}\n\nThe board will hear the case again in ${REJECTION_COOLDOWN_WEEKS} weeks.`,
    });
    return s;
  }

  const reason = 'Long-term thinking — we like it. The money is released.';
  record(s, { kind: 'facility', key, label: `${label} — investment`, status: 'approved', amount: cost, reason });
  pushInbox(s, {
    category: 'board',
    title: `Board approves ${formatMoney(cost)} for the ${label.toLowerCase()}`,
    body: `${reason}\n\nStart the work from the Facilities screen whenever you are ready.`,
  });
  return s;
}

/* ------------------------------------------------------------ spending */

/**
 * Burn an approval. Called by whatever actually performs the spend, on the
 * state that spend produced, so an approval and the thing it paid for can
 * never come apart.
 */
export function consumeApproval(state: GameState, kind: BoardRequestKind, key: string): GameState {
  const list = requests(state);
  const target = list.find((r) => r.kind === kind && r.key === key && r.status === 'approved' && !r.used);
  if (!target) return state;
  return {
    ...state,
    boardRequests: list.map((r) => (r.id === target.id ? { ...r, used: true } : r)),
  };
}
