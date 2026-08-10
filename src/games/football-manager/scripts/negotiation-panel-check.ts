/**
 * Regression check for the bug that made every transfer impossible.
 *
 * `ContractNegotiationPanel` was wired into the Offers Sent tab and always
 * called `submitTermsOffer`, whatever stage the deal was at. A normal
 * transfer opens at stage `fee`, where that call returns
 * "No terms to negotiate." — so every bid for a rival club's player failed on
 * click, with the error the only thing to show for it.
 *
 * This walks the sequence the restored `NegotiationPanel` performs — open,
 * offer a fee, then offer personal terms — and asserts each one is accepted
 * by the engine. It also asserts the old panel's behaviour still fails, so a
 * future rewiring to a stage-blind panel is caught here rather than by a
 * player who cannot sign anybody.
 *
 * Run with:
 *   npx tsx scripts/negotiation-panel-check.ts
 */
import { readFileSync } from 'node:fs';
import type { GameData, GameState } from '../engine/types';
import { newGame } from '../engine/seasonProgression';
import { getSquad } from '../engine/teamManagement';
import {
  getTransferMarket, openNegotiation, submitFeeOffer, submitTermsOffer,
} from '../engine/transferMarket';
import { MAX_SQUAD_SIZE } from '../engine/gameRules';

const data = JSON.parse(readFileSync(new URL('../public/data/gamedata.json', import.meta.url), 'utf8')) as GameData;

let failures = 0;
function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// A second-tier side: a real budget, a real squad, no scenario. `division`
// is the field on the raw gamedata clubs — `leagueId` is assigned by newGame.
const club = data.clubs.find((c) => c.division === 2)!;
let state: GameState = newGame(data, club.id, 'Test Manager');

// Every club starts at the squad cap, which is itself why the market screen
// now disables its buy buttons instead of letting them fail on click. Free a
// slot the way selling one does, so the negotiation path can be exercised.
const squad = getSquad(state, state.userClubId);
const spare = squad[squad.length - 1];
state = {
  ...state,
  clubs: state.clubs.map((c) =>
    c.id === state.userClubId ? { ...c, playerIds: c.playerIds.filter((id) => id !== spare.id) } : c,
  ),
};
check('squad has room', getSquad(state, state.userClubId).length < MAX_SQUAD_SIZE,
  `${getSquad(state, state.userClubId).length}/${MAX_SQUAD_SIZE}`);

// Find someone this club can plausibly approach: affordable, and not a
// pre-contract case (those open at `terms`, which is the one stage the old
// panel happened to work at).
const market = getTransferMarket(state, { pos: 'ALL', avail: 'all', search: '' })
  .filter((p) => p.clubId !== 0 && p.askingGuide > 0 && p.askingGuide < state.budget);

let opened: GameState | null = null;
let negId = '';
for (const target of market.slice(0, 60)) {
  const res = openNegotiation(state, target.id);
  if (!res.ok) continue;
  const neg = (res.state.negotiations ?? []).find((n) => n.type === 'outgoing' && n.playerId === target.id);
  if (!neg || neg.stage !== 'fee') continue;
  opened = res.state;
  negId = neg.id;
  console.log(`\ntarget: ${target.name} (${target.rating}) — asking ${neg.neg.asking}, budget ${state.budget}\n`);
  break;
}

check('talks open at stage "fee"', !!opened);
if (!opened) {
  console.log('\nCould not open talks with any target — cannot verify the rest.');
  process.exit(1);
}

// --- The bug, asserted directly: terms-first is refused at the fee stage.
const termsFirst = submitTermsOffer(opened, negId, 260_000, { contractYears: 3 });
check('terms-at-fee-stage is refused (the old panel\'s only call)',
  !termsFirst.ok && /no terms/i.test(termsFirst.message), termsFirst.message);

// --- The restored panel's sequence.
const neg = (opened.negotiations ?? []).find((n) => n.id === negId)!;
const feeRes = submitFeeOffer(opened, negId, Math.min(neg.neg.asking, opened.budget), {});
check('fee offer is accepted by the engine', feeRes.ok, feeRes.message);

if (feeRes.ok) {
  // Force the reply the seller would give next week, so the terms stage can
  // be reached without simulating a week of football here.
  const afterFee: GameState = {
    ...feeRes.state,
    negotiations: (feeRes.state.negotiations ?? []).map((n) =>
      n.id === negId
        ? { ...n, stage: 'terms' as const, awaiting: 'user' as const, agreedFee: n.lastFee ?? 0 }
        : n,
    ),
  };
  const wage = afterFee.negotiations!.find((n) => n.id === negId)!.neg.wageDemand;
  const termsRes = submitTermsOffer(afterFee, negId, wage, { contractYears: 3 });
  check('terms offer is accepted once the fee stage is done', termsRes.ok, termsRes.message);
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
