/**
 * Phase 7 rehearsal — prints what the transfer model actually does.
 *
 * Tuned systems compile clean and are silently wrong; the only defence is
 * printing real values. Run with:
 *   npx tsx scripts/transfer-preview.ts
 *
 * What to look at:
 *  - asking prices should sit ~1.4-1.9x value for a settled star and BELOW
 *    value for a man agitating for a move;
 *  - a star must actually refuse a step down (refusal rate near 100% for an
 *    88-rated Premier League player asked to drop to League Two);
 *  - fee negotiations must terminate — no infinite counters;
 *  - loan clauses must fire when a borrower benches a regular-starter loanee.
 */
import { readFileSync } from 'node:fs';
import type { GameData, GameState, Player } from '../engine/types';
import { newGame } from '../engine/seasonProgression';
import { squadAvgRating } from '../engine/teamManagement';
import {
  askingMultiplier, contractMonthsLeft, evaluateFeeOffer, evaluateMove, evaluateTermsOffer,
  LOAN_PLAYTIME, marketStatus, roundFee, startNegotiation,
} from '../engine/negotiation';
import {
  assessMove, getLoanMarket, getTransferMarket, openNegotiation, submitFeeOffer,
  tickTransferWeek, listForSale, requestLoanIn, toggleLoanList,
} from '../engine/transferMarket';

const data = JSON.parse(readFileSync(new URL('../public/data/gamedata.json', import.meta.url), 'utf8')) as GameData;
const M = (v: number) => (Math.abs(v) >= 1e6 ? `£${(v / 1e6).toFixed(1)}M` : `£${Math.round(v / 1000)}K`);

let state: GameState = newGame(data, 1);
const clubOf = (id: number) => state.clubs.find((c) => c.id === id)!;
const myClub = clubOf(state.userClubId);
console.log(`Managing ${myClub.name} (${myClub.leagueId}), budget ${M(state.budget)}, squad rating ${squadAvgRating(state, myClub.id).toFixed(1)}\n`);

/* --- 1. Asking prices by availability ----------------------------------- */
console.log('=== 1. Asking multiplier by availability (should be <1 for unrest, >1.3 for a settled key man)');
{
  const sample = Object.values(state.players).filter((p) => p.clubId && p.clubId !== state.userClubId);
  const pick = (f: (p: Player) => boolean) => sample.find(f);
  const star = [...sample].sort((a, b) => b.rating - a.rating)[0];
  const sellerRating = squadAvgRating(state, star.clubId);
  const rows: [string, Player, Partial<Player>][] = [
    ['settled star', star, {}],
    ['transfer listed', star, { transferListed: true }],
    ['wants move', star, { wantsMove: true }],
    ['listed + wants move', star, { transferListed: true, wantsMove: true }],
    ['expiring (6mo)', star, { contractEnd: `${state.seasonYear}-06-30` }],
  ];
  for (const [label, base, patch] of rows) {
    const p = { ...base, ...patch } as Player;
    const st = marketStatus(p, state);
    const mult = askingMultiplier(p, sellerRating, st);
    console.log(`  ${label.padEnd(20)} value ${M(p.value).padStart(8)}  ×${mult.toFixed(2)}  asking ~${M(roundFee(p.value * mult))}`);
  }
  void pick;
}

/* --- 2. Market view sanity ---------------------------------------------- */
console.log('\n=== 2. Market list (top 5 by rating) — askingGuide should track value × multiplier');
{
  const market = getTransferMarket(state, {});
  console.log(`  ${market.length} signable players in the market.`);
  for (const p of market.slice(0, 5)) {
    console.log(`  ${p.name.padEnd(24)} ${p.rating} ${p.clubName.padEnd(22)} value ${M(p.value).padStart(8)} asking ${M(p.askingGuide).padStart(8)}${p.releaseClauseFee ? ` clause ${M(p.releaseClauseFee)}` : ''}`);
  }
  const ratios = market.map((p) => p.askingGuide / Math.max(1, p.value));
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  console.log(`  mean asking/value ratio across the whole market: ${avg.toFixed(2)} (expect ~1.3-1.6)`);
  const under = getTransferMarket(state, { priceMode: 'under', priceVal: 5e6, ratingMode: 'over', ratingVal: 75 });
  console.log(`  filter <${M(5e6)} and >75 rated: ${under.length} players (top: ${under[0]?.name ?? 'none'} ${under[0]?.rating ?? ''})`);
}

/* --- 3. Player agency: does a star refuse a step down? ------------------- */
console.log('\n=== 3. Player agency — verdict distribution for moves INTO clubs at each level');
{
  const byLevel = new Map<string, number>();
  for (const c of state.clubs) byLevel.set(c.leagueId, (byLevel.get(c.leagueId) ?? 0) + 1);
  const topClub = [...state.clubs]
    .filter((c) => c.leagueId === 'premier_league')
    .sort((a, b) => squadAvgRating(state, b.id) - squadAvgRating(state, a.id))[0];
  const star = topClub.playerIds.map((id) => state.players[id]).sort((a, b) => b.rating - a.rating)[0];
  console.log(`  Test subject: ${star.name}, ${star.rating} rated, age ${star.age}, at ${topClub.name}`);
  for (const lid of ['premier_league', 'championship', 'league_one', 'league_two', 'national_league']) {
    const targets = state.clubs.filter((c) => c.leagueId === lid);
    if (!targets.length) continue;
    const counts: Record<string, number> = { keen: 0, open: 0, reluctant: 0, refuses: 0 };
    for (const c of targets) {
      const a = evaluateMove(star, topClub, c, {
        toRating: squadAvgRating(state, c.id),
        fromRating: squadAvgRating(state, topClub.id),
        toSquad: c.playerIds.map((id) => state.players[id]),
        monthsLeft: contractMonthsLeft(star, state),
      }, { offeredWage: star.wage * 1.4 });
      counts[a.verdict]++;
    }
    const n = targets.length;
    console.log(`    → ${lid.padEnd(18)} keen ${String(counts.keen).padStart(2)}  open ${String(counts.open).padStart(2)}  reluctant ${String(counts.reluctant).padStart(2)}  REFUSES ${String(counts.refuses).padStart(2)}  (${((counts.refuses / n) * 100).toFixed(0)}% refusal of ${n})`);
  }

  // And the reverse: a fringe lower-league player offered a step up.
  const lowClub = state.clubs.filter((c) => c.leagueId === 'league_two')[0];
  const fringe = lowClub.playerIds.map((id) => state.players[id]).sort((a, b) => a.rating - b.rating)[0];
  const up = evaluateMove(fringe, lowClub, topClub, {
    toRating: squadAvgRating(state, topClub.id),
    fromRating: squadAvgRating(state, lowClub.id),
    toSquad: topClub.playerIds.map((id) => state.players[id]),
    monthsLeft: 24,
  }, { offeredWage: fringe.wage * 2 });
  console.log(`  Reverse check: ${fringe.name} (${fringe.rating}, ${lowClub.name}) offered ${topClub.name}: ${up.verdict} (score ${up.score})`);
  console.log(`    biggest pull: ${up.factors.filter((f) => f.delta > 0).sort((a, b) => b.delta - a.delta)[0]?.label ?? '—'}; biggest drag: ${up.factors.filter((f) => f.delta < 0).sort((a, b) => a.delta - b.delta)[0]?.label ?? '—'}`);
}

/* --- 4. Fee negotiation outcomes ---------------------------------------- */
console.log('\n=== 4. Fee negotiation — accept rate by bid size, over 2000 trials each');
{
  const base = getTransferMarket(state, {}).find((p) => p.rating >= 78 && !p.status.listed)!;
  const sellerRating = squadAvgRating(state, base.clubId);
  const run = (label: string, target: Player) => {
    console.log(`  ${label}: ${target.name} ${target.rating}, value ${M(target.value)} — availability ×${askingMultiplier(target, sellerRating, marketStatus(target, state)).toFixed(2)}`);
    for (const mult of [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2]) {
      let accept = 0, walk = 0, holdOuts = 0, rounds = 0;
      const TRIALS = 2000;
      for (let i = 0; i < TRIALS; i++) {
        const st = marketStatus(target, state);
        const neg = startNegotiation(target, sellerRating, st);
        const bid = roundFee(target.value * mult);
        // Keep bidding the same number until the machine terminates. A model
        // that never terminates would show avg rounds pinned at the cap.
        for (let r = 0; r < 8; r++) {
          const res = evaluateFeeOffer(neg, bid);
          rounds++;
          if (res.decision === 'accept') { accept++; break; }
          if (res.decision === 'walk') { walk++; break; }
          if (res.decision === 'counter' && res.holdOut) holdOuts++;
          if (r === 7) walk++;
        }
      }
      console.log(`    bid ${String(mult.toFixed(1)).padStart(4)}× value (${M(roundFee(target.value * mult)).padStart(8)}): accept ${((accept / TRIALS) * 100).toFixed(0).padStart(3)}%  walked ${((walk / TRIALS) * 100).toFixed(0).padStart(3)}%  hold-outs ${holdOuts}  avg rounds ${(rounds / TRIALS).toFixed(2)}`);
    }
  };
  run('Settled, not for sale', base as unknown as Player);
  run('Transfer listed', { ...base, transferListed: true } as unknown as Player);
  run('Agitating for a move', { ...base, wantsMove: true } as unknown as Player);
}

/* --- 5. Personal terms and the persuasion package ----------------------- */
console.log('\n=== 5. Personal terms — a package should rescue an offer that is slightly short');
{
  const target = getTransferMarket(state, {}).find((p) => p.rating >= 75)!;
  const sellerRating = squadAvgRating(state, target.clubId);
  const trial = (offerMult: number, pkg: Parameters<typeof evaluateTermsOffer>[2]) => {
    let accept = 0;
    for (let i = 0; i < 2000; i++) {
      const neg = startNegotiation(target, sellerRating, marketStatus(target, state));
      neg.wageHoldOut = 0; // isolate the package effect from the agent's hold-out
      if (evaluateTermsOffer(neg, neg.minWage * offerMult, pkg).decision === 'accept') accept++;
    }
    return ((accept / 2000) * 100).toFixed(0) + '%';
  };
  console.log(`  Target: ${target.name}, wage ${M(target.wage)}/wk`);
  console.log(`  offer 1.00× his demand, bare       : ${trial(1.0, {})}`);
  console.log(`  offer 0.96× his demand, bare       : ${trial(0.96, {})}`);
  console.log(`  offer 0.96× + release clause       : ${trial(0.96, { releaseClause: 20e6 })}`);
  console.log(`  offer 0.94× + star-status promise  : ${trial(0.94, { promisedStatus: 'star', projectedStatus: 'rotation' })}`);
  console.log(`  offer 0.90× + everything           : ${trial(0.90, { promisedStatus: 'star', projectedStatus: 'fringe', releaseClause: 20e6, signingBonus: target.wage * 52 * 0.15, contractYears: 5 })}`);
  console.log(`  offer 0.60× + everything (too low) : ${trial(0.60, { promisedStatus: 'star', projectedStatus: 'fringe', releaseClause: 20e6, signingBonus: target.wage * 52 * 0.15, contractYears: 5 })}`);
}

/* --- 6. A live negotiation, end to end ---------------------------------- */
console.log('\n=== 6. End-to-end: open talks, bid, let the week tick, read the reply');
{
  let opened = 0, refusedAtDoor = 0;
  let s2 = state;
  // Aim at players we could plausibly afford, so the reply is a real
  // accept/counter rather than "not enough funds".
  const candidates = getTransferMarket(s2, { ratingMode: 'over', ratingVal: 70, priceMode: 'under', priceVal: s2.budget / 2 }).slice(0, 40);
  for (const c of candidates) {
    const r = openNegotiation(s2, c.id);
    if (r.ok) { opened++; s2 = r.state; } else { refusedAtDoor++; s2 = r.state; }
  }
  console.log(`  Approached 40 targets rated 70+: ${opened} opened talks, ${refusedAtDoor} refused/banned at the door.`);
  // Pick one we can actually afford, so the reply is a real accept/counter and
  // not just "not enough funds".
  const live = (s2.negotiations ?? []).filter((n) => n.type === 'outgoing' && n.neg.asking <= s2.budget);
  if (live.length) {
    const N = live[0];
    console.log(`  Example: ${N.playerName} at ${N.clubName} — stance ${N.stance} (${N.stanceScore}), asking ${M(N.neg.asking)}, min ${M(N.neg.minFee)}, wants ${M(N.neg.wageDemand)}/wk, holdOut ${N.neg.holdOut}`);
    console.log(`    demands: ${N.demands.join(', ') || 'none'} · projected role ${N.projectedStatus}`);
    const bidRes = submitFeeOffer(s2, N.id, N.neg.asking);
    console.log(`    bid ${M(N.neg.asking)}: ${bidRes.message}`);
    s2 = bidRes.state;
    s2.week += 1;
    const news = tickTransferWeek(s2);
    const after = (s2.negotiations ?? []).find((n) => n.id === N.id);
    console.log(`    after the tick: stage=${after?.stage ?? 'closed'} awaiting=${after?.awaiting ?? '-'} log="${after?.log.at(-1)?.text ?? news.join(' | ')}"`);
  }
}

/* --- 7. Loans and clause triggers --------------------------------------- */
console.log('\n=== 7. Loans — market, clause terms, and the recall trigger');
{
  const loans = getLoanMarket(state);
  console.log(`  ${loans.length} players listed for loan across the game.`);
  for (const p of loans.slice(0, 4)) {
    console.log(`    ${p.name.padEnd(24)} ${p.rating} age ${p.age} ${p.clubName.padEnd(22)} fee ${M(p.fee)} ${p.devLoan ? '[development]' : '[surplus]'}`);
  }
  // Actually borrow one, then bench him and tick until the parent recalls.
  let s3 = state;
  let borrowed: Player | null = null;
  for (const cand of loans) {
    const r = requestLoanIn(s3, cand.id);
    s3 = r.state;
    if (r.ok) { borrowed = s3.players[cand.id]; console.log(`  Borrowed: ${r.message}`); break; }
  }
  if (borrowed) {
    const L = s3.players[borrowed.id].loan!;
    console.log(`    clause: ${L.playingTime} (needs ${(LOAN_PLAYTIME[L.playingTime!].ratio * 100).toFixed(0)}% of games), parent pays ${(L.wageShare * 100).toFixed(0)}% of wages, option to buy ${M(L.optionToBuy)}`);
    // Play our league fixtures out one per week with the loanee never picked,
    // so the clause first warns and then — four fixtures later — actually fires.
    const lid = clubOf(s3.userClubId).leagueId;
    const myFixtures = (s3.fixtures[lid] ?? []).filter((f) => f.homeId === s3.userClubId || f.awayId === s3.userClubId);
    s3.players[borrowed.id].apps = L.startApps; // never picked
    let recalled = false;
    for (let w = 0; w < 20 && !recalled; w++) {
      if (myFixtures[w]) myFixtures[w].played = true;
      s3.week += 1;
      const news = tickTransferWeek(s3);
      for (const n of news) if (n.includes(borrowed.name)) console.log(`    after ${w + 1} games: ${n}`);
      if (!s3.players[borrowed.id].loan) recalled = true;
    }
    console.log(`    recalled by parent after being benched all season: ${recalled ? 'YES' : 'NO — clause never fired'}`);
    // And the mirror case: a loanee who IS played must never be recalled.
    let s3b = state;
    const r2 = requestLoanIn(s3b, borrowed.id);
    if (r2.ok) {
      s3b = r2.state;
      const fx = (s3b.fixtures[lid] ?? []).filter((f) => f.homeId === s3b.userClubId || f.awayId === s3b.userClubId);
      const L2 = s3b.players[borrowed.id].loan!;
      for (let w = 0; w < 20; w++) {
        if (fx[w]) fx[w].played = true;
        s3b.players[borrowed.id].apps = L2.startApps + w + 1; // played every week
        s3b.week += 1;
        tickTransferWeek(s3b);
      }
      console.log(`    control: a loanee who plays every game is ${s3b.players[borrowed.id].loan ? 'still on loan (correct)' : 'WRONGLY RECALLED'}`);
    }
  } else {
    console.log('  (no loan was agreed — every candidate said no)');
  }
}

/* --- 8. A full season of AI transfer activity --------------------------- */
console.log('\n=== 8. One season of weekly ticks with two players listed — do offers arrive?');
{
  let s4 = state;
  const mine = getSquad(s4).sort((a, b) => b.rating - a.rating);
  for (const p of mine.slice(2, 4)) s4 = listForSale(s4, p.id, p.value).state;
  // Loan-list a couple of fringe men so the loan-enquiry path is exercised too.
  for (const p of mine.slice(-3)) s4 = toggleLoanList(s4, p.id).state;
  console.log(`  Listed for sale: ${mine.slice(2, 4).map((p) => `${p.name} at ${M(p.value)}`).join(', ')}`);
  console.log(`  Listed for loan: ${mine.slice(-3).map((p) => `${p.name} (${p.rating})`).join(', ')}`);
  let bids = 0, loanEnquiries = 0;
  for (let w = 1; w <= 40; w++) {
    s4.week = w;
    const news = tickTransferWeek(s4);
    for (const n of news) {
      if (n.includes('have bid') || n.includes('opportunistic bid')) bids++;
      if (n.includes('on loan for the season')) loanEnquiries++;
    }
    s4.news = [];
  }
  const unhappy = getSquad(s4).filter((p) => p.wantsMove);
  const benched = getSquad(s4).filter((p) => (p.benchWeeks ?? 0) >= 6);
  console.log(`  Over 40 weeks: ${bids} incoming bids, ${loanEnquiries} loan enquiries.`);
  console.log(`  ${benched.length} players went 6+ weeks unpicked; ${unhappy.length} handed in transfer requests (${unhappy.map((p) => `${p.name}/${p.wantsMoveReason}`).join(', ') || 'none'}).`);
  const live = s4.negotiations ?? [];
  console.log(`  ${live.length} negotiations still live at the end (should be a handful, not hundreds).`);
  if (live.length) {
    const o = live[0];
    console.log(`    e.g. ${o.clubName} bid ${M(o.fee ?? 0)} for ${o.playerName} (max willing ${M(o.maxWilling ?? 0)})`);
  }
}

function getSquad(s: GameState): Player[] {
  return clubOf(s.userClubId).playerIds.map((id) => s.players[id]).filter(Boolean);
}

console.log('\nDone. Read the numbers above before trusting any of this.');
// The stance API the UI reads must agree with the raw model.
{
  const t = getTransferMarket(state, { ratingMode: 'over', ratingVal: 80 })[0];
  const a = assessMove(state, t.id, state.userClubId)!;
  console.log(`Sanity: assessMove(${t.name} -> ${myClub.name}) = ${a.verdict} (${a.score}), demands [${a.demands.join(', ')}], projected ${a.projectedStatus}`);
}
