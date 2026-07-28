/**
 * Standalone engine smoke test for the 10-division / 24-club-per-division
 * expansion. Not part of the build — run manually with:
 *   node --experimental-strip-types scripts/smoke-test-season.ts
 *
 * Plays through an entire season (all 46 rounds) plus the domestic and
 * continental cups purely at the engine level, since clicking through 46
 * rounds in a browser would be impractically slow. Fails loudly (throws) on
 * the first inconsistency rather than silently producing a wrong table.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData } from '../engine/types';
import { newGame, playRound, seasonOver, computeTable, userDivision, endSeason, ALL_DIVISIONS, divisionFixtures } from '../engine/seasonProgression';
import { simulateMatch } from '../engine/matchSimulation';
import { CLUBS_PER_DIVISION, SEASON_ROUNDS, DIVISION_NAMES } from '../engine/gameRules';

const __dirname = dirname(fileURLToPath(import.meta.url));

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error('SMOKE TEST FAILED: ' + msg);
}

// --- Build gamedata fresh from the (possibly just-regenerated) source -------
const gamedataPath = join(__dirname, '..', 'public', 'data', 'gamedata.json');
const data: GameData = JSON.parse(readFileSync(gamedataPath, 'utf8'));

console.log(`Loaded ${data.clubs.length} clubs, ${data.players.length} players.`);
assert(data.clubs.length === CLUBS_PER_DIVISION * 10, `expected ${CLUBS_PER_DIVISION * 10} clubs total, got ${data.clubs.length}`);

for (const d of ALL_DIVISIONS) {
  const count = data.clubs.filter((c) => c.division === d).length;
  console.log(`  Division ${d} (${DIVISION_NAMES[d]}): ${count} clubs`);
  assert(count === CLUBS_PER_DIVISION, `division ${d} has ${count} clubs, expected ${CLUBS_PER_DIVISION}`);
}

// --- Start a career as a division-1 club and simulate every week -----------
const userClub = data.clubs.find((c) => c.division === 1)!;
let state = newGame(data, userClub.id, 'Smoke Test');
console.log(`\nStarted career at ${userClub.name} (Division 1).`);

let weeksPlayed = 0;
while (!seasonOver(state)) {
  const div = userDivision(state);
  const userFixture = divisionFixtures(state, div).find(
    (f) => f.round === state.week && (f.homeId === state.userClubId || f.awayId === state.userClubId)
  );
  // Bye week for the user (shouldn't happen with an even club count, but the
  // engine tolerates it) — just advance by simulating any AI report shape.
  const report = userFixture
    ? simulateMatch(state, userFixture.homeId, userFixture.awayId)
    : { homeId: 0, awayId: 0, homeGoals: 0, awayGoals: 0, events: [], playerRatings: {} };
  state = playRound(state, report as any);
  weeksPlayed++;
  if (weeksPlayed > SEASON_ROUNDS + 5) throw new Error('SMOKE TEST FAILED: season never ended — seasonOver() stuck');
}
console.log(`Season completed after ${weeksPlayed} weeks (SEASON_ROUNDS=${SEASON_ROUNDS}).`);
assert(weeksPlayed === SEASON_ROUNDS, `expected exactly ${SEASON_ROUNDS} weeks played, got ${weeksPlayed}`);

// --- Every division's fixture list must be fully played --------------------
for (const d of ALL_DIVISIONS) {
  const fixtures = divisionFixtures(state, d);
  const unplayed = fixtures.filter((f) => !f.played);
  console.log(`  Division ${d}: ${fixtures.length} fixtures, ${unplayed.length} unplayed`);
  assert(unplayed.length === 0, `division ${d} has ${unplayed.length} unplayed fixtures at season end`);
  const expectedRounds = 2 * (CLUBS_PER_DIVISION - 1);
  assert(fixtures.length === expectedRounds * (CLUBS_PER_DIVISION / 2), `division ${d} fixture count looks wrong: ${fixtures.length}`);
}

// --- Domestic cup must have reached a winner --------------------------------
console.log(`\nDomestic cup (${state.cup.name}): round=${state.cup.round}, winner=${state.cup.winnerId}`);
assert(state.cup.winnerId !== null, 'domestic cup never produced a winner — bracket/CUP_WEEKS mismatch likely');

console.log(`Continental cup (${state.continental.name}): round=${state.continental.round}, winner=${state.continental.winnerId}`);
assert(state.continental.winnerId !== null, 'continental cup never produced a winner');

// --- Table sanity for every division ---------------------------------------
for (const d of ALL_DIVISIONS) {
  const table = computeTable(state, d);
  assert(table.length === CLUBS_PER_DIVISION, `division ${d} table has ${table.length} rows, expected ${CLUBS_PER_DIVISION}`);
  const totalPlayed = table.reduce((s, r) => s + r.played, 0);
  assert(totalPlayed === CLUBS_PER_DIVISION * (2 * (CLUBS_PER_DIVISION - 1)), `division ${d} table games-played total looks wrong: ${totalPlayed}`);
}

// --- Phase 1: development converges on potential, and players retire --------
// Five seasons is long enough for the youngest prospects to close a real slice
// of their gap and for the oldest pros to reach their rolled retirement age.
const idsAtStart = new Set(Object.keys(state.players).map(Number));
for (let season = 2; season <= 5; season++) {
  state = endSeason(state).state;
  while (!seasonOver(state)) {
    const div = userDivision(state);
    const fx = divisionFixtures(state, div).find(
      (f) => f.round === state.week && (f.homeId === state.userClubId || f.awayId === state.userClubId)
    );
    const report = fx
      ? simulateMatch(state, fx.homeId, fx.awayId)
      : { homeId: 0, awayId: 0, homeGoals: 0, awayGoals: 0, events: [], playerRatings: {} };
    state = playRound(state, report as any);
  }
}
state = endSeason(state).state;

const overCeiling = Object.values(state.players).filter((p) => p.rating > p.potential);
console.log(`\nAfter 5 seasons: ${Object.keys(state.players).length} players in the pool, ${overCeiling.length} above their potential.`);
assert(
  overCeiling.length === 0,
  `${overCeiling.length} player(s) developed past their potential, e.g. ${overCeiling[0]?.name} ${overCeiling[0]?.rating}/${overCeiling[0]?.potential}`
);

const retiredCount = [...idsAtStart].filter((id) => !state.players[id]).length;
console.log(`  ${retiredCount} of the original ${idsAtStart.size} players have retired.`);
assert(retiredCount > 0, 'no player retired across 5 seasons — retirement is not firing');

// A retiree must be gone everywhere, not just from the players map.
for (const club of state.clubs) {
  const ghosts = club.playerIds.filter((id) => !state.players[id]);
  assert(ghosts.length === 0, `${club.name} still lists ${ghosts.length} retired player id(s) in its squad`);
}
assert(
  state.lineup.every((id) => id === null || !!state.players[id]),
  'the lineup still holds a retired player'
);

console.log('\n✓ ALL SMOKE TESTS PASSED');
