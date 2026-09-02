import type { GameState, Player, RenewalTalk, SquadStatusKey } from './types';
import {
  SQUAD_STATUS, clubStature, newSigningWageDemand, playerAmbition, projectedRole, roundWage,
} from './negotiation';
import { clubWageBill, getSquad, squadAvgRating, wageCeiling } from './teamManagement';
import { contractEndFor, formatMoney, clamp } from './utils';
import { pushInbox } from './inbox';

/**
 * Contract renegotiation, as a conversation.
 *
 * The old flow was a five-field form with a hard-coded "assistant advice"
 * string and an *Accept Offer* button that threw every number away and
 * called `renewContract(state, playerId)` — the engine's own one-shot
 * auto-renewal, which quotes its own wage and rolls its own dice. Nothing
 * the manager typed reached the engine, and the player never answered.
 *
 * Now an offer is put to the player and he answers it:
 *
 * - **Accept** — the terms meet what he's holding out for.
 * - **Counter** — he's interested, but not at that. He names his own number
 *   and the talk stays open.
 * - **Reject** — the offer insults him, or the club is too small to keep a
 *   player of his standing whatever it pays. The talk *ends* and the
 *   existing renewal cooling-off period (`renewalCooldowns`) starts.
 *
 * Everything the player says is derived from the same negotiation model the
 * transfer market already uses (engine/negotiation.ts), so a renewal and a
 * transfer price the same player consistently.
 */

/** Offers a manager can put on the table in one round. */
export interface RenewalOffer {
  wage: number;
  years: number;
  status: SquadStatusKey | null;
}

export type RenewalVerdict = 'accept' | 'counter' | 'reject';

export interface RenewalResponse {
  verdict: RenewalVerdict;
  /** What he'd sign for instead — present on a counter. */
  counter?: RenewalOffer;
  /** What he actually says, in his own voice. Shown verbatim in the panel. */
  message: string;
  /** Set on a reject when the club itself is the problem rather than the
   *  money, so the UI can say so instead of suggesting a bigger bid. */
  walkedAway?: boolean;
}

/** Rounds a manager gets before the player stops taking meetings. */
export const MAX_RENEWAL_ROUNDS = 3;

function tick(s: GameState): number {
  return s.seasonYear * 100 + s.week;
}

export function isRenewalCoolingDown(state: GameState, playerId: number): boolean {
  const until = (state.renewalCooldowns ?? {})[playerId];
  return until != null && tick(state) < until;
}

export function renewalCooldownWeeks(state: GameState, playerId: number): number {
  const until = (state.renewalCooldowns ?? {})[playerId];
  return until == null ? 0 : Math.max(0, until - tick(state));
}

export function getTalk(state: GameState, playerId: number): RenewalTalk | null {
  return (state.renewalTalks ?? {})[playerId] ?? null;
}

/* ------------------------------------------------------------- demands */

/**
 * What he's holding out for right now: a wage, a length, and the squad role
 * he thinks he's earned.
 *
 * The wage is the same "renewal costs more than a fresh signing" rule the
 * engine already applies — he's here, he knows you need him, and that
 * leverage has a price. Unlike the old `renewContract`, the number is
 * deterministic, because the manager is about to be shown it and then judged
 * against it.
 */
export function renewalDemand(state: GameState, playerId: number): RenewalOffer {
  const p = state.players[playerId];
  if (!p) return { wage: 0, years: 2, status: null };

  const squad = getSquad(state, state.userClubId);
  const avg = squadAvgRating(state, state.userClubId);
  const role = projectedRole(p, squad, avg);

  // Base: the leverage floor from the negotiation model, plus what he has
  // *improved by* since signing — not how good he already is.
  //
  // This used to read `p.rating - 60` (his standing above replacement level)
  // as a stand-in for improvement. It is not one. His current wage already
  // prices his quality, so multiplying it by his quality again charged for the
  // same thing twice: an 88-rated man on £350k/wk asked for £1,003,333/wk, a
  // 2.87x rise, and got the same multiple again at the next renewal. Players
  // reported it as "demanding a rise from £350k to £1M".
  const signedAt = p.contractRating ?? p.rating;
  const overallIncrease = clamp(p.rating - signedAt, 0, 30);
  const fromCurrent = p.wage * (1 + overallIncrease / 15);
  const leverageFloor = newSigningWageDemand(p, 1) * 1.2;
  let wage = Math.max(fromCurrent, leverageFloor);

  // A player in the last months of his deal has all the leverage there is;
  // one with years left is only talking because you asked.
  if (p.contractYears <= 1) wage *= 1.08;
  else if (p.contractYears >= 3) wage *= 0.94;

  // Form and standing in the side.
  if (role.starter) wage *= 1.05;
  if (p.unhappy || p.wantsMove) wage *= 1.12;
  if (p.loyal) wage *= 0.95;

  // Length: the young want short deals to renegotiate from, the old want
  // security, and everyone in between wants the standard three.
  const years = p.age <= 22 ? 4 : p.age >= 32 ? 1 : p.age >= 29 ? 2 : 3;

  return { wage: roundWage(wage), years, status: role.status };
}

/**
 * Does this club still deserve him? Compares his own standing against the
 * club's, the way `evaluateMove` does for a transfer. Above ~1 he is
 * comfortably beyond this level and money will not fix it.
 */
export function stayingGap(state: GameState, playerId: number): number {
  const p = state.players[playerId];
  const club = state.clubs.find((c) => c.id === state.userClubId);
  if (!p || !club) return 0;
  const avg = squadAvgRating(state, state.userClubId);
  const stature = clubStature(club, avg);
  // What a player of his calibre expects a club to be worth. The constants
  // put a 70-rated player at roughly a mid-table second-tier side.
  const expected = (p.rating - 52) * 2.35;
  const ambition = playerAmbition(p, avg);
  return ((expected - stature) / 26) * (0.55 + ambition);
}

/* ------------------------------------------------------------ evaluate */

/**
 * How the player answers an offer. Pure — no state change, so the panel can
 * preview a verdict as the manager drags the wage slider if it ever wants to.
 */
export function evaluateRenewalOffer(
  state: GameState,
  playerId: number,
  offer: RenewalOffer,
  round = 1,
): RenewalResponse {
  const p = state.players[playerId];
  if (!p) return { verdict: 'reject', message: 'There is nobody here to talk to.' };

  const demand = renewalDemand(state, playerId);
  const gap = stayingGap(state, playerId);

  // --- The club itself is the problem -------------------------------------
  // He is too big for this club and knows it. A veteran winding down doesn't
  // care, and a player who is loyal or already central to the side gives you
  // more rope; nobody else does.
  const tolerance = 1 + (p.loyal ? 0.35 : 0) + (p.age >= 31 ? 0.6 : 0);
  if (gap > tolerance) {
    return {
      verdict: 'reject',
      walkedAway: true,
      message:
        `${p.name} isn't interested in signing an extension here. He believes he's playing below ` +
        `his level, and no wage you can offer changes that. He'll see out his deal — or leave.`,
    };
  }

  // --- The money ----------------------------------------------------------
  const ratio = demand.wage > 0 ? offer.wage / demand.wage : 1;

  // A role downgrade is its own insult, and it costs the offer 15% of its
  // apparent value before the money is even weighed.
  const currentStatus = (p.promisedStatus as SquadStatusKey | null) ?? null;
  const downgrade =
    currentStatus != null && offer.status != null &&
    SQUAD_STATUS[offer.status].rank < SQUAD_STATUS[currentStatus].rank;
  const effective = ratio * (downgrade ? 0.85 : 1);

  // Length matters least, but a deal far off what he wants still needs a
  // little more money to swallow.
  const lengthMiss = Math.abs(offer.years - demand.years);
  const lengthPenalty = lengthMiss >= 2 ? 0.04 : lengthMiss === 1 ? 0.015 : 0;

  const score = effective - lengthPenalty;

  if (score >= 1) {
    return {
      verdict: 'accept',
      message: `${p.name} is delighted. He'll sign — ${offer.years} year${offer.years === 1 ? '' : 's'} at ${formatMoney(offer.wage)} a week.`,
    };
  }

  // Insulting, or the last chance has been used up.
  if (score < 0.72 || round >= MAX_RENEWAL_ROUNDS) {
    return {
      verdict: 'reject',
      message:
        score < 0.72
          ? `${p.name} is offended by that. He wanted ${formatMoney(demand.wage)} a week and you came in nowhere near it. The talks are over.`
          : `${p.name} has heard enough. You've had your say and it isn't close enough. The talks are over.`,
    };
  }

  // --- Counter ------------------------------------------------------------
  // He softens a little each round rather than repeating the same figure,
  // so a negotiation actually converges instead of being a guessing game.
  const softening = 1 - (round - 1) * 0.04;
  const counterWage = roundWage(Math.max(offer.wage, demand.wage * softening));
  const counter: RenewalOffer = {
    wage: counterWage,
    years: demand.years,
    status: downgrade ? currentStatus : (offer.status ?? demand.status),
  };
  const message = downgrade
    ? `${p.name} won't accept a lesser role. Keep him as a ${SQUAD_STATUS[currentStatus!].label.toLowerCase()} and he'll sign for ${formatMoney(counterWage)} a week over ${counter.years} year${counter.years === 1 ? '' : 's'}.`
    : `${p.name} isn't far off. He'll sign for ${formatMoney(counterWage)} a week over ${counter.years} year${counter.years === 1 ? '' : 's'}.`;
  return { verdict: 'counter', counter, message };
}

/* --------------------------------------------------------------- apply */

export interface RenewalOutcome {
  state: GameState;
  response: RenewalResponse;
}

/** Reasons an offer can't even be put to the player. */
export function canOpenTalks(state: GameState, playerId: number): { ok: true } | { ok: false; error: string } {
  const p = state.players[playerId];
  if (!p || p.clubId !== state.userClubId) return { ok: false, error: 'Not your player.' };
  const weeks = renewalCooldownWeeks(state, playerId);
  if (weeks > 0) {
    return { ok: false, error: `${p.name} won't discuss terms for another ${weeks} week${weeks === 1 ? '' : 's'}.` };
  }
  return { ok: true };
}

function affordability(state: GameState, p: Player, wage: number): string | null {
  const ceiling = wageCeiling(state);
  const billAfter = clubWageBill(state, state.userClubId) - p.wage + wage;
  if (billAfter > ceiling) {
    return `That deal would push the wage bill to ${formatMoney(billAfter)}, over the board's ${formatMoney(ceiling)} ceiling.`;
  }
  return null;
}

/**
 * Put an offer to the player and record what happens. The single entry
 * point the UI calls — it evaluates, applies, and leaves the talk in a state
 * the panel can render without holding any of its own.
 */
export function submitRenewalOffer(
  state: GameState,
  playerId: number,
  offer: RenewalOffer,
): RenewalOutcome {
  const open = canOpenTalks(state, playerId);
  if (!open.ok) return { state, response: { verdict: 'reject', message: open.error } };

  const p = state.players[playerId];
  const overBill = affordability(state, p, offer.wage);
  if (overBill) {
    // Not a rejection by the player — the club can't table the offer in the
    // first place, so no round is used up and the talk is untouched.
    return { state, response: { verdict: 'counter', message: overBill } };
  }

  const prior = getTalk(state, playerId);
  const round = (prior?.round ?? 0) + 1;
  const response = evaluateRenewalOffer(state, playerId, offer, round);

  const s: GameState = structuredClone(state);
  const sp = s.players[playerId];
  s.renewalTalks = { ...(s.renewalTalks ?? {}) };

  if (response.verdict === 'accept') {
    sp.wage = offer.wage;
    // Baseline for the *next* renewal: what he was rated when he signed this
    // deal. Without stamping it here the delta is always zero and a player who
    // genuinely improves never earns a rise.
    sp.contractRating = sp.rating;
    sp.contractYears = offer.years;
    sp.contractEnd = contractEndFor(s.seasonYear, offer.years);
    sp.contractWarned = false;
    if (offer.status !== undefined) sp.promisedStatus = offer.status;
    // A new deal settles a man who was agitating about his future.
    sp.unhappy = false;
    sp.wantsMove = false;
    sp.morale = clamp(sp.morale + 8, 0, 100);
    delete s.renewalTalks[playerId];
    s.news.unshift(`${sp.name} signs a new ${offer.years}-year deal (${formatMoney(offer.wage)}/w).`);
    pushInbox(s, {
      category: 'contract',
      title: `${sp.name} signs a new contract`,
      body:
        `${sp.name} has committed to the club until ${s.seasonYear + offer.years}.\n\n` +
        `Terms: ${formatMoney(offer.wage)} per week over ${offer.years} year${offer.years === 1 ? '' : 's'}` +
        `${offer.status ? `, as a ${SQUAD_STATUS[offer.status].label.toLowerCase()}` : ''}.`,
      playerId: sp.id,
    });
    return { state: s, response };
  }

  if (response.verdict === 'reject') {
    delete s.renewalTalks[playerId];
    // The existing cooling-off period: 2-4 weeks before he'll talk again.
    s.renewalCooldowns = { ...(s.renewalCooldowns ?? {}) };
    s.renewalCooldowns[playerId] = tick(s) + 2 + Math.floor(Math.random() * 3);
    s.news.unshift(`${sp.name} turns down the club's contract offer.`);
    pushInbox(s, {
      category: 'contract',
      title: `${sp.name} rejects new terms`,
      body: `${response.message}\n\nHe won't discuss a new deal again for a few weeks.`,
      playerId: sp.id,
      kind: 'contractExpiring',
    });
    return { state: s, response };
  }

  // Counter: keep the talk alive with his number on the table.
  const counter = response.counter!;
  s.renewalTalks[playerId] = {
    playerId,
    round,
    wantWage: counter.wage,
    wantYears: counter.years,
    wantStatus: counter.status,
    lastOfferWage: offer.wage,
    lastOfferYears: offer.years,
    state: 'open',
  };
  return { state: s, response };
}

/** Walk away yourself. Same cooling-off period as being turned down — you
 *  don't get to reopen the same conversation five minutes later. */
export function abandonRenewalTalks(state: GameState, playerId: number): GameState {
  const s: GameState = structuredClone(state);
  s.renewalTalks = { ...(s.renewalTalks ?? {}) };
  delete s.renewalTalks[playerId];
  s.renewalCooldowns = { ...(s.renewalCooldowns ?? {}) };
  s.renewalCooldowns[playerId] = tick(s) + 2;
  return s;
}
