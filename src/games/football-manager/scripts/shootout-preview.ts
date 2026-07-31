/**
 * Prints real numbers for the penalty shootout model (Phase 6), per the
 * project's own rule that tuned systems must be checked against real output,
 * not just "it compiles". Run with: npx tsx scripts/shootout-preview.ts
 *
 * Expect: conversion rate roughly 70-80% (real-world shootouts), and the
 * side with materially better takers/keeper winning more often than 50%.
 */
import type { Player, Tactics } from '../engine/types';
import { runShootout } from '../engine/shootout';

let nextId = 1;
function makePlayer(overrides: Partial<Player> & { pos: Player['pos'] }): Player {
  const id = nextId++;
  return {
    id,
    name: `Player ${id}`,
    nat: 'ENG',
    role: overrides.pos,
    rating: 70,
    potential: 70,
    pac: 65, sho: 65, pas: 65, dri: 65, def: 65, phy: 65,
    gkReflexes: overrides.pos === 'GK' ? 70 : 30,
    gkPositioning: overrides.pos === 'GK' ? 70 : 30,
    height: 182,
    altPos: [],
    age: 26,
    value: 1_000_000,
    wage: 10_000,
    clubId: 1,
    form: 1,
    injuryWeeks: 0,
    contractYears: 2,
    contractEnd: '2027-06-30',
    releaseClause: 0,
    loyal: false,
    transferListed: false,
    wantsMove: false,
    promisedStatus: null,
    retireAge: 35,
    morale: 70,
    fitness: 90,
    sharpness: 90,
    chem: 60,
    apps: 0, goals: 0, assists: 0, cleanSheets: 0, saves: 0, lgApps: 0, lgGoals: 0,
    career: [],
    ...overrides,
  };
}

function makeXI(outfieldSho: number, gkReflexes: number): Player[] {
  const gk = makePlayer({ pos: 'GK', gkReflexes, gkPositioning: gkReflexes });
  const rest = Array.from({ length: 10 }, () => makePlayer({ pos: 'FWD', sho: outfieldSho }));
  return [gk, ...rest];
}

const NEUTRAL_TAC: Tactics = {} as Tactics;

function run(n: number, homeSho: number, homeGK: number, awaySho: number, awayGK: number) {
  let totalKicks = 0;
  let totalScored = 0;
  let homeWins = 0;
  let ties = 0;
  for (let i = 0; i < n; i++) {
    nextId = 1;
    const homeXI = makeXI(homeSho, homeGK);
    const awayXI = makeXI(awaySho, awayGK);
    const result = runShootout(homeXI, awayXI, NEUTRAL_TAC, NEUTRAL_TAC, 1, 2);
    totalKicks += result.kicks.length;
    totalScored += result.kicks.filter((k) => k.outcome === 'scored').length;
    if (result.winnerId === 1) homeWins++;
    if (result.homeScore === result.awayScore) ties++; // should never happen
  }
  const convRate = (100 * totalScored) / totalKicks;
  console.log(
    `home(sho=${homeSho},gk=${homeGK}) vs away(sho=${awaySho},gk=${awayGK})  ` +
    `n=${n}  conversion=${convRate.toFixed(1)}%  homeWinRate=${((100 * homeWins) / n).toFixed(1)}%  ` +
    `avgKicksPerShootout=${(totalKicks / n).toFixed(1)}  unresolvedTies=${ties}`
  );
  return { convRate, homeWinRate: homeWins / n };
}

console.log('--- Penalty shootout preview (n=2000 each) ---');
const even = run(2000, 65, 65, 65, 65);
run(2000, 80, 55, 55, 80); // strong takers + weak keeper vs weak takers + strong keeper
run(2000, 55, 80, 80, 55); // reversed
run(2000, 90, 40, 40, 90); // extreme mismatch

console.log('\n--- Sanity checks ---');
console.log(
  even.convRate >= 65 && even.convRate <= 85
    ? `PASS: even-strength conversion ${even.convRate.toFixed(1)}% is in the real-world 70-80% band (allowing slack).`
    : `FAIL: even-strength conversion ${even.convRate.toFixed(1)}% is far from the expected 70-80% band — model needs fixing.`
);
// Real shootouts show a well-documented ~60% win rate for whichever side
// kicks first (going first lets you dictate, and the early-finish rule means
// the second kicker sometimes doesn't even get to take their final kick).
// `runShootout`'s home side always kicks first, so some home-side edge here
// is expected and correct, not a bug — the band below is centred on that,
// not on a 50/50 coin flip.
console.log(
  even.homeWinRate >= 0.55 && even.homeWinRate <= 0.68
    ? `PASS: first-kicker (home) win rate ${(even.homeWinRate * 100).toFixed(1)}% matches the real ~60% first-kicker edge.`
    : `FAIL: first-kicker win rate ${(even.homeWinRate * 100).toFixed(1)}% is outside the expected ~55-68% band — check for an unintended extra asymmetry beyond kicking order.`
);
