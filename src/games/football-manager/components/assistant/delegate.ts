import type { GameState } from '@/engine/types';
import {
  getSquad, autoPickLineup, contextualizeTactics, clubWageBill, wageCeiling,
} from '@/engine/teamManagement';
import { renewalDemand } from '@/engine/contractTalks';
import { contractMonthsLeft } from '@/engine/negotiation';
import { renewContract, saleValue, acceptIncomingOffer, rejectIncomingOffer } from '@/engine/transferMarket';
import { getIntake, signTrialist, releaseTrialist } from '@/engine/youthAcademy';
import { nextUserFixture } from '@/engine/seasonProgression';
import { getFormation } from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';

export interface DelegateResult {
  state: GameState;
  report: string[];
}

/** One-shot "handle it for me" actions for the Assistant Manager panel.
 *  Each takes the current state and returns a new state plus a plain-
 *  language report of what it did — the caller is responsible for
 *  presenting the report and logging it to the inbox. */

/**
 * The most he'll commit to a single renewal, in wages per week.
 *
 * Handing the whole job over used to mean handing over the chequebook with
 * it: he worked down the list paying whatever each man asked, and the first
 * you heard of it was the wage bill. So he sets himself a ceiling first,
 * says it out loud (`renewalBrief`), and anyone who wants more than it gets
 * left on the desk for the manager to decide personally.
 *
 * The number is the room the board has actually left — the wage ceiling
 * minus what is already committed — shared across the men who are out of
 * contract, never below what the cheapest of them already earns.
 */
export function renewalCap(state: GameState): number {
  const squad = getSquad(state, state.userClubId);
  const due = squad.filter((p) => contractMonthsLeft(p, state) <= 12);
  if (due.length === 0) return 0;
  const room = Math.max(0, wageCeiling(state) - clubWageBill(state, state.userClubId));
  const share = room / due.length;
  const floor = Math.min(...due.map((p) => p.wage));
  // Renewals always cost more than the deal they replace, so a cap below the
  // current wage would reject everybody and read as a broken feature.
  return Math.max(Math.round(share + floor), Math.round(floor * 1.25));
}

/** What he says before he starts — the sentence the manager approves. */
export function renewalBrief(state: GameState): { cap: number; due: number; line: string } {
  const squad = getSquad(state, state.userClubId);
  const due = squad.filter((p) => contractMonthsLeft(p, state) <= 12).length;
  const cap = renewalCap(state);
  if (due === 0) return { cap, due, line: 'Nothing due, boss. Nobody inside their last year.' };
  const over = squad
    .filter((p) => contractMonthsLeft(p, state) <= 12)
    .filter((p) => renewalDemand(state, p.id).wage > cap).length;
  return {
    cap,
    due,
    line:
      `${due} deal${due === 1 ? '' : 's'} to sort. Most I'd go to is ${formatMoney(cap)} a week each — ` +
      (over > 0
        ? `${over} of them want more than that, so I'll leave those to you.`
        : "the whole lot fits inside that, so I'll get them signed.") +
      ' Say the word and I\'ll get on with it.',
  };
}

export function renewExpiringContracts(state: GameState): DelegateResult {
  const cap = renewalCap(state);
  const candidateIds = getSquad(state, state.userClubId)
    .filter((p) => contractMonthsLeft(p, state) <= 12)
    .map((p) => p.id);

  if (candidateIds.length === 0) {
    return { state, report: ['Nothing needed doing, boss — no contracts due for renewal.'] };
  }

  let s = state;
  const report: string[] = [];
  for (const id of candidateIds) {
    const p = s.players[id];
    if (!p) continue;
    // The ceiling he stated in the brief. Anyone above it is reported as
    // left alone rather than quietly signed at whatever he was asked for.
    const want = renewalDemand(s, id).wage;
    if (want > cap) {
      report.push(`${p.name} wants ${formatMoney(want)}/wk — over what I'd sanction. Left him to you.`);
      continue;
    }
    if (p.wage * 10 > s.budget) {
      report.push(`Can't afford to offer ${p.name} new terms right now.`);
      continue;
    }
    const beforeEnd = p.contractEnd;
    s = renewContract(s, id);
    const after = s.players[id];
    report.push(
      after?.contractEnd !== beforeEnd ? `Renewed ${p.name}'s contract.` : `${p.name} turned down new terms.`
    );
  }
  return { state: s, report };
}

export function setLineupAndTactics(state: GameState): DelegateResult {
  const fixture = nextUserFixture(state);
  const opponentId = fixture ? (fixture.homeId === state.userClubId ? fixture.awayId : fixture.homeId) : undefined;
  // Keep the formation the manager already set up — only picks the
  // strongest available XI within it and matches tactics to the upcoming
  // opponent, rather than switching to a formation the squad hasn't
  // drilled (a formation change carries its own familiarity cost).
  const formation = getFormation(state.dualFormation?.inPossessionId || state.formationId);
  const lineup = autoPickLineup(state, state.userClubId, formation);
  const tactics = { ...contextualizeTactics(state, state.userClubId, opponentId), mentality: state.tactics.mentality };
  const s: GameState = { ...state, lineup, tactics };
  return { state: s, report: ['Picked the strongest available XI and set tactics for the next match.'] };
}

export function sortYouthIntake(state: GameState): DelegateResult {
  const intake = getIntake(state);
  if (intake.length === 0) {
    return { state, report: ['No trialists waiting on a decision.'] };
  }

  let s = state;
  const report: string[] = [];
  for (const { trialist, player } of intake) {
    // Trust the assistant's own read on each prospect ('sign' outright, or
    // 'maybe' when the upside is still strong) over a second-guessed
    // threshold — it's already factoring in academy reputation and his own
    // scouting quality.
    if (trialist.verdict === 'sign' || (trialist.verdict === 'maybe' && trialist.stars >= 4)) {
      s = signTrialist(s, trialist.playerId);
      report.push(`Signed ${player.name} (${trialist.stars}★ potential) to the youth squad.`);
    } else {
      s = releaseTrialist(s, trialist.playerId);
      report.push(`Let ${player.name} go — ${trialist.verdict === 'pass' ? "assistant's verdict was pass" : 'not enough potential'}.`);
    }
  }
  return { state: s, report };
}

export function answerIncomingBids(state: GameState): DelegateResult {
  const pending = (state.negotiations ?? []).filter((n) => n.type === 'incoming' && n.awaiting === 'user');
  if (pending.length === 0) {
    return { state, report: ['No bids waiting on a reply.'] };
  }

  let s = state;
  const report: string[] = [];
  for (const n of pending) {
    const p = s.players[n.playerId];
    if (!p) continue;
    const fee = n.lastCounter ?? n.fee ?? 0;
    const isStarter = s.lineup.includes(n.playerId);
    if (fee >= saleValue(p) && !isStarter) {
      const result = acceptIncomingOffer(s, n.id);
      s = result.state;
      report.push(
        result.ok
          ? `Accepted ${n.clubName}'s bid for ${p.name} (${formatMoney(fee)}).`
          : `Couldn't complete ${p.name}'s move: ${result.message}`
      );
    } else {
      const result = rejectIncomingOffer(s, n.id);
      s = result.state;
      report.push(`Turned down ${n.clubName}'s bid for ${p.name}.`);
    }
  }
  return { state: s, report };
}
