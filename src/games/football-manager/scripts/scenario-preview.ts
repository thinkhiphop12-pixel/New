/**
 * Prints real numbers for the Phase 11 starting scenarios: what applyScenario
 * actually does to budget/points/board confidence on day one, and whether
 * evalScenarioAtSeasonEnd correctly fires success/failure across a simulated
 * season for a couple of the trickier ones.
 *
 * Run: npx tsx scripts/scenario-preview.ts
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData, GameState, ScenarioId } from '../engine/types';
import { newGame, playRound, seasonOver, endSeason } from '../engine/seasonProgression';
import { simulateMatch } from '../engine/matchSimulation';
import { applyScenario, isBottomHalfClub, SCENARIOS } from '../engine/scenarios';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  readFileSync(join(here, '../public/data/gamedata.json'), 'utf8'),
) as GameData;

function moneyStr(v: number): string {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  return `${sign}£${abs >= 1_000_000 ? (abs / 1_000_000).toFixed(1) + 'M' : Math.round(abs / 1000) + 'K'}`;
}

function pickClub(filterFn?: (club: GameData['clubs'][number]) => boolean): GameData['clubs'][number] {
  const candidates = filterFn ? data.clubs.filter(filterFn) : data.clubs;
  return candidates[0] ?? data.clubs[0];
}

function playToSeasonEnd(state: GameState): { state: GameState; summary: ReturnType<typeof endSeason>['summary'] } {
  let s = state;
  let guard = 0;
  while (!seasonOver(s) && guard < 60) {
    const fx = Object.values(s.fixtures).flat().find(
      (f) => f.round === s.week && (f.homeId === s.userClubId || f.awayId === s.userClubId),
    );
    const report = fx
      ? simulateMatch(s, fx.homeId, fx.awayId)
      : ({ homeId: 0, awayId: 0, homeGoals: 0, awayGoals: 0, events: [] } as unknown as Parameters<typeof playRound>[1]);
    s = playRound(s, report);
    guard++;
  }
  return endSeason(s);
}

console.log('=== Phase 11: Starting scenario day-one effects ===\n');

for (const def of SCENARIOS) {
  let club = data.clubs[0];
  if (def.id === 'relegation_battle' || def.id === 'underdog_title') {
    // isBottomHalfClub needs a live GameState; approximate here by picking any
    // club and checking after newGame, retrying a few candidates.
    for (const c of data.clubs) {
      const probe = newGame(data, c.id, 'Preview');
      const probeClub = probe.clubs.find((x) => x.id === probe.userClubId)!;
      if (isBottomHalfClub(probeClub, probe)) { club = c; break; }
    }
  } else if (def.id === 'hollywood' || def.id === 'takeover') {
    club = pickClub((c) => c.division !== 1) ?? data.clubs[0];
  }

  const before = newGame(data, club.id, 'Preview');
  const beforeBudget = before.budget;
  const after = applyScenario(before, def.id as ScenarioId);

  console.log(`${def.icon}  ${def.name} — ${after.clubs.find((c) => c.id === after.userClubId)!.name}`);
  console.log(`  objective: ${after.scenario!.objective}`);
  console.log(`  budget: ${moneyStr(beforeBudget)} -> ${moneyStr(after.budget)}`);
  console.log(`  board confidence: ${before.board.confidence} -> ${after.board.confidence}`);
  if (after.scenario!.meta.deduction != null) {
    console.log(`  points deduction: ${after.scenario!.meta.deduction}`);
  }
  console.log();
}

console.log('=== Season-end evaluation: simulated full seasons ===\n');

// Relegation Battle: verify a real season simulates through and produces a
// scenario status change (success or failure), not silence.
{
  let club = data.clubs[0];
  for (const c of data.clubs) {
    const probe = newGame(data, c.id, 'Preview');
    const probeClub = probe.clubs.find((x) => x.id === probe.userClubId)!;
    if (isBottomHalfClub(probeClub, probe)) { club = c; break; }
  }
  let state = newGame(data, club.id, 'Preview');
  state = applyScenario(state, 'relegation_battle');
  const before = state.scenario!.status;
  const { state: after, summary } = playToSeasonEnd(state);
  console.log(`Relegation Battle full-season sim — ${club.name}`);
  console.log(`  final position: ${summary.position}, relegated: ${!!summary.relegated}`);
  console.log(`  scenario status: ${before} -> ${after.scenario?.status}`);
  const resultInboxTitle = after.inbox.find((i) => i.title === 'The Great Escape' || i.title === 'Relegated')?.title;
  console.log(`  season-end inbox message: ${resultInboxTitle ?? '(none found)'}`);
  console.log();
}

// Broke: verify success condition (budget >= 0) actually flips status without
// a deadline forcing failure.
{
  const club = data.clubs[0];
  let state = newGame(data, club.id, 'Preview');
  state = applyScenario(state, 'broke');
  console.log(`Broke scenario — ${club.name}`);
  console.log(`  starting budget after scenario: ${moneyStr(state.budget)} (must be negative)`);
  state.budget = 500_000; // simulate recovery directly, this is a pure evaluation check
  const { state: after, summary } = playToSeasonEnd(state);
  console.log(`  after forcing budget positive and simulating a season, status: ${after.scenario?.status}`);
  console.log(`  (season position for reference: ${summary.position})`);
}
