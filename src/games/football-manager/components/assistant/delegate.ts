import type { GameState } from '@/engine/types';
import { getSquad, autoPickLineup, contextualizeTactics } from '@/engine/teamManagement';
import { contractMonthsLeft } from '@/engine/negotiation';
import { renewContract, saleValue, acceptIncomingOffer, rejectIncomingOffer } from '@/engine/transferMarket';
import { acceptTrialist, rejectTrialist } from '@/engine/youthAcademy';
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

export function renewExpiringContracts(state: GameState): DelegateResult {
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
  const pool = state.trialistPool ?? [];
  if (pool.length === 0) {
    return { state, report: ['No trialists waiting on a decision.'] };
  }

  let s = state;
  const report: string[] = [];
  for (const t of pool) {
    const name = s.players[t.playerId]?.name ?? 'A trialist';
    if (t.starRating >= 3.5) {
      s = acceptTrialist(s, t.playerId);
      report.push(`Signed ${name} (${t.starRating}★ potential) to the youth squad.`);
    } else {
      s = rejectTrialist(s, t.playerId);
      report.push(`Let ${name} go — not enough potential.`);
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
