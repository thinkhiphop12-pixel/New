/**
 * Standalone engine smoke test for the league pyramid. Not part of the build — run manually with:
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
import {
  newGame, playRound, seasonOver, computeTable, userLeagueId, endSeason, activeLeagueIds,
  leagueFixtures, leagueClubs, generateLeagueFixtures, splitFixtures,
} from '../engine/seasonProgression';
import { simulateMatch } from '../engine/matchSimulation';
import { needsDrilling, styleFamiliarity, weeksToDrill } from '../engine/familiarity';
import { cornerRoutineOf, setPieceTaker, setPieceXG, spDefenseMult } from '../engine/setPieces';
import { simulateTickMatch } from '../engine/tickEngine/sim';
import {
  CLUBS_PER_DIVISION, LEAGUES, SEASON_ROUNDS, WINTER_BREAK, getLeague, isPhantomLeague,
  leagueAbove, leagueIdForDivision, leagueName,
} from '../engine/gameRules';

const __dirname = dirname(fileURLToPath(import.meta.url));

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error('SMOKE TEST FAILED: ' + msg);
}

// --- Build gamedata fresh from the (possibly just-regenerated) source -------
const gamedataPath = join(__dirname, '..', 'public', 'data', 'gamedata.json');
const data: GameData = JSON.parse(readFileSync(gamedataPath, 'utf8'));

console.log(`Loaded ${data.clubs.length} clubs, ${data.players.length} players.`);
assert(data.clubs.length === CLUBS_PER_DIVISION * 10, `expected ${CLUBS_PER_DIVISION * 10} clubs total, got ${data.clubs.length}`);

for (const d of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  const lid = leagueIdForDivision(d);
  const count = data.clubs.filter((c) => c.division === d).length;
  console.log(`  ${leagueName(lid)}: ${count} clubs`);
  assert(count === CLUBS_PER_DIVISION, `${lid} has ${count} clubs, expected ${CLUBS_PER_DIVISION}`);
}

// --- The pyramid itself is internally consistent ---------------------------
// Every league that promotes into another must send up exactly as many clubs
// as that league relegates, or division sizes drift season on season.
console.log('\nPyramid:');
for (const lg of LEAGUES) {
  const above = leagueAbove(lg.id);
  if (!above) continue;
  const up = lg.autoPromotion + (lg.playoffSpots >= 4 && lg.autoPromotion > 0 ? 1 : 0);
  const down = above.relegation;
  console.log(
    `  ${above.name} (L${above.level}) <- ${lg.name} (L${lg.level}): ${up} up / ${down} down` +
    `${above.interPlayoff === lg.id ? ' + relegation play-off' : ''}${lg.phantom ? ' [pool]' : ''}`
  );
  if (!lg.phantom) {
    assert(up === down, `${lg.name} sends ${up} up but ${above.name} relegates ${down}`);
  }
}
const countries = new Set(LEAGUES.map((l) => l.country));
console.log(`  ${LEAGUES.length} leagues across ${countries.size} countries; England is ${LEAGUES.filter((l) => l.country === 'England').length} tiers deep.`);

// --- The Scottish split and multi-round leagues schedule correctly ---------
// No Scottish clubs ship in the dataset, so exercise the machinery directly.
{
  const ids = Array.from({ length: 12 }, (_, i) => i + 1);
  const pre = generateLeagueFixtures(ids, 3);
  assert(pre.length === 3 * 6 * 11, `Scottish pre-split programme is ${pre.length} matches, expected 198`);
  const perClub = ids.map((id) => pre.filter((f) => f.homeId === id || f.awayId === id).length);
  assert(perClub.every((n) => n === 33), `pre-split games per club: ${perClub.join(',')} (expected 33)`);
  const post = splitFixtures(ids.slice(0, 6), ids.slice(6), 40);
  const perClubPost = ids.map((id) => post.filter((f) => f.homeId === id || f.awayId === id).length);
  assert(perClubPost.every((n) => n === 5), 'post-split half should play 5 more games each');
  // Nobody crosses the split.
  assert(
    post.every((f) => (f.homeId <= 6) === (f.awayId <= 6)),
    'a post-split fixture crossed the top-six split'
  );
  console.log('  Scottish split: 33 pre-split + 5 post-split games per club, no crossing. ✓');
}

// --- The winter break leaves its calendar weeks empty ----------------------
// --- Start a career as a top-flight club and simulate every week -----------
const userClub = data.clubs.find((c) => c.division === 1)!;
let state = newGame(data, userClub.id, 'Smoke Test');
console.log(`\nStarted career at ${userClub.name} (${leagueName(userLeagueId(state))}).`);

for (const week of WINTER_BREAK) {
  const played = Object.values(state.fixtures).flat().filter((f) => f.round === week);
  assert(played.length === 0, `winter break week ${week} has ${played.length} league fixtures scheduled`);
}
console.log(`Winter break weeks ${WINTER_BREAK.join(', ')} carry no league fixtures. ✓`);

let weeksPlayed = 0;
while (!seasonOver(state)) {
  const userFixture = leagueFixtures(state, userLeagueId(state)).find(
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

// --- Every league's fixture list must be fully played ----------------------
for (const id of activeLeagueIds(state)) {
  const fixtures = leagueFixtures(state, id);
  const clubs = leagueClubs(state, id).length;
  const unplayed = fixtures.filter((f) => !f.played);
  console.log(`  ${leagueName(id)}: ${clubs} clubs, ${fixtures.length} fixtures, ${unplayed.length} unplayed`);
  assert(unplayed.length === 0, `${id} has ${unplayed.length} unplayed fixtures at season end`);
  const expected = getLeague(id).rounds * (clubs - 1) * (clubs / 2);
  assert(fixtures.length === expected, `${id} fixture count is ${fixtures.length}, expected ${expected}`);
}

// --- Domestic cup must have reached a winner --------------------------------
console.log(`\nDomestic cup (${state.cup.name}): round=${state.cup.round}, winner=${state.cup.winnerId}`);
assert(state.cup.winnerId !== null, 'domestic cup never produced a winner — bracket/CUP_WEEKS mismatch likely');

console.log(`Continental cup (${state.continental.name}): round=${state.continental.round}, winner=${state.continental.winnerId}`);
assert(state.continental.winnerId !== null, 'continental cup never produced a winner');

// --- Table sanity for every league -----------------------------------------
for (const id of activeLeagueIds(state)) {
  const clubs = leagueClubs(state, id).length;
  const table = computeTable(state, id);
  assert(table.length === clubs, `${id} table has ${table.length} rows, expected ${clubs}`);
  const totalPlayed = table.reduce((s, r) => s + r.played, 0);
  const expected = clubs * getLeague(id).rounds * (clubs - 1);
  assert(totalPlayed === expected, `${id} table games-played total is ${totalPlayed}, expected ${expected}`);
}

// --- Phase 2: promotion and relegation move exactly the right clubs ---------
// Snapshot every club's league, run the season end, and check that each league
// gained and lost exactly what its LeagueDef promises — and that no club came
// out of it registered anywhere but in exactly one league.
{
  const before = new Map(state.clubs.map((c) => [c.id, c.leagueId]));
  const sizesBefore = new Map(activeLeagueIds(state).map((id) => [id, leagueClubs(state, id).length]));
  const rolled = endSeason(state).state;

  const seen = new Map<number, string[]>();
  for (const c of rolled.clubs) {
    seen.set(c.id, [...(seen.get(c.id) ?? []), c.leagueId]);
  }
  for (const [id, leagues] of seen) {
    assert(leagues.length === 1, `club ${id} ends the season registered in ${leagues.length} leagues (${leagues.join(', ')})`);
  }

  console.log('\nPromotion / relegation:');
  for (const [id, size] of sizesBefore) {
    const lg = getLeague(id);
    const now = leagueClubs(rolled, id).length;
    const arrived = rolled.clubs.filter((c) => c.leagueId === id && !c.dormant && before.get(c.id) !== id);
    const left = [...before].filter(([cid, lid]) => lid === id && rolled.clubs.find((c) => c.id === cid)?.leagueId !== id);
    const up = arrived.filter((c) => getLeague(before.get(c.id) ?? id).level > lg.level).length;
    const down = left.filter(([cid]) => {
      const to = rolled.clubs.find((c) => c.id === cid)!.leagueId;
      return getLeague(to).level > lg.level;
    }).length;
    console.log(`  ${leagueName(id)}: ${size} -> ${now} clubs, ${up} promoted in, ${down} relegated out`);
    assert(now === size, `${id} changed size from ${size} to ${now}`);
    // Relegation is `relegation` clubs, plus one more if this league's lowest
    // safe place lost its inter-league play-off.
    const maxDown = lg.relegation + (lg.interPlayoff ? 1 : 0);
    assert(down >= lg.relegation && down <= maxDown,
      `${id} relegated ${down} clubs, expected ${lg.relegation}${maxDown !== lg.relegation ? `-${maxDown}` : ''}`);
    assert(up === down, `${id} took in ${up} promoted clubs but sent ${down} down`);
  }

  // Every phantom pool still has dormant clubs queued for next season.
  for (const lg of LEAGUES.filter((l) => l.phantom)) {
    const pool = rolled.phantomPools?.[lg.id] ?? [];
    assert(pool.length > 0, `${lg.id} pool ran dry — promotion churn would stall`);
    assert(pool.every((cid) => rolled.clubs.find((c) => c.id === cid)?.dormant),
      `${lg.id} pool holds a club that is not dormant`);
  }
  assert(
    rolled.clubs.every((c) => c.dormant === isPhantomLeague(c.leagueId) || !c.dormant),
    'a dormant club is sitting in a simulated league'
  );
  console.log('  Every league promoted and relegated the right count; no club in two leagues. ✓');
}

// --- Phase 1: development converges on potential, and players retire --------
// Five seasons is long enough for the youngest prospects to close a real slice
// of their gap and for the oldest pros to reach their rolled retirement age.
const idsAtStart = new Set(Object.keys(state.players).map(Number));
for (let season = 2; season <= 5; season++) {
  state = endSeason(state).state;
  while (!seasonOver(state)) {
    const fx = leagueFixtures(state, userLeagueId(state)).find(
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

// --- Phase 4: the match engine core ----------------------------------------
// Three assertions from the plan: goals/game in the 2.4–3.2 band, no single
// shot ever worth more than a certain goal, and no NaN rating anywhere after a
// full simulated season.
{
  let goals = 0;
  let matches = 0;
  let maxShotXG = 0;
  let shots = 0;
  const clubIds = state.clubs.filter((c) => !c.dormant).map((c) => c.id);
  for (let i = 0; i < 400; i++) {
    const homeId = clubIds[(i * 7) % clubIds.length];
    const awayId = clubIds[(i * 13 + 3) % clubIds.length];
    if (homeId === awayId) continue;
    const rep = simulateMatch(state, homeId, awayId);
    goals += rep.homeGoals + rep.awayGoals;
    matches++;
    assert(Number.isFinite(rep.homeXG) && Number.isFinite(rep.awayXG), `non-finite team xG in ${homeId} v ${awayId}`);
    for (const e of rep.events) {
      if (e.xg === undefined) continue;
      shots++;
      assert(Number.isFinite(e.xg), `non-finite shot xG at minute ${e.minute}`);
      assert(e.xg <= 1.0, `shot xG ${e.xg} exceeds 1.0 (${e.archetype} at ${e.gx}m)`);
      maxShotXG = Math.max(maxShotXG, e.xg);
    }
  }
  // Headless reports only carry goal events; run a handful of full
  // (visualised) matches too so every shot's coordinates and xG are checked.
  for (let i = 0; i < 20; i++) {
    const homeId = clubIds[(i * 5) % clubIds.length];
    const awayId = clubIds[(i * 11 + 1) % clubIds.length];
    if (homeId === awayId) continue;
    const tl = simulateTickMatch(state, homeId, awayId);
    for (const e of tl.events) {
      if (e.xg === undefined) continue;
      shots++;
      assert(Number.isFinite(e.xg), `non-finite shot xG at minute ${e.minute}`);
      assert(e.xg <= 1.0, `shot xG ${e.xg} exceeds 1.0 (${e.archetype})`);
      assert(Number.isFinite(e.gx!) && Number.isFinite(e.gy!), 'shot event is missing pitch coordinates');
      assert(e.gx! >= 0 && e.gx! <= 40 && Math.abs(e.gy!) <= 25, `shot coordinates off the pitch: ${e.gx}, ${e.gy}`);
      maxShotXG = Math.max(maxShotXG, e.xg);
    }
  }
  const perGame = goals / matches;
  console.log(`\nMatch engine: ${matches} matches, ${perGame.toFixed(2)} goals/game, ${shots} shots logged, max shot xG ${maxShotXG.toFixed(3)}.`);
  assert(perGame >= 2.4 && perGame <= 3.2, `goals/game ${perGame.toFixed(2)} is outside the 2.4–3.2 band`);
  assert(maxShotXG <= 1.0, `a shot was worth ${maxShotXG} xG — above a certain goal`);
}

// No NaN in any player rating (or the season rating average) after five seasons.
{
  const bad = Object.values(state.players).filter(
    (p) => !Number.isFinite(p.rating) || !Number.isFinite(p.potential) || !Number.isFinite(p.fitness)
      || !Number.isFinite(p.sharpness) || !Number.isFinite(p.seasonRatingSum ?? 0)
  );
  assert(bad.length === 0, `${bad.length} player(s) carry a non-finite rating/condition value, e.g. ${bad[0]?.name}`);
  const avgBad = Object.values(state.players).filter((p) => {
    const c = p.seasonRatingCount ?? 0;
    return c > 0 && !Number.isFinite((p.seasonRatingSum ?? 0) / c);
  });
  assert(avgBad.length === 0, `${avgBad.length} player(s) have a NaN season average rating`);
  console.log(`  No NaN in any of ${Object.keys(state.players).length} player ratings after a full simulated season.`);
}

/* --- Phase 5: tactical familiarity ------------------------------------- */
{
  const drilled = state.clubs.filter((c) => c.playStyle && needsDrilling(c.playStyle));
  if (!drilled.length) throw new Error('no club was assigned a drilled play-style');

  // Every club should have accrued familiarity in the style it actually plays.
  const undrilled = drilled.filter((c) => styleFamiliarity(c, c.playStyle!) < 40);
  if (undrilled.length) {
    throw new Error(`${undrilled.length} clubs played a style all season without drilling it`);
  }

  // Switching to a distant style must cost real time; switching to a near
  // neighbour must not. This is the whole point of the kinship model.
  const club = state.clubs.find((c) => c.playStyle === 'possession')
    ?? state.clubs.find((c) => needsDrilling(c.playStyle ?? 'balanced'))!;
  const near = weeksToDrill(club, 'tiki-taka');
  const far = weeksToDrill(club, 'catenaccio');
  if (far <= near) {
    throw new Error(`kinship broken: ${club.playStyle} -> catenaccio (${far}w) should cost more than -> tiki-taka (${near}w)`);
  }
  console.log(`\nTactical familiarity: ${drilled.length} clubs drilled in a named style.`);
  console.log(`  ${club.name} (${club.playStyle}) would need ${near}w to drill tiki-taka, ${far}w for catenaccio. ✓`);
}

/* --- Phase 5: set pieces ------------------------------------------------ */
{
  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const xi = state.lineup
    .map((id) => (id == null ? null : state.players[id]))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const corner = setPieceTaker(xi, state.tactics, 'corner');
  const pen = setPieceTaker(xi, state.tactics, 'penalty');
  if (!corner || !pen) throw new Error('set-piece takers not resolved');
  // The corner must go to a passer and the penalty to a finisher. One man can
  // legitimately do both — plenty of sides work that way — so this checks the
  // relevant attribute for each job rather than that they differ.
  if (corner.pas < 60) throw new Error(`corner taker ${corner.name} has pas ${corner.pas}`);
  if (pen.sho < 60) throw new Error(`penalty taker ${pen.name} has sho ${pen.sho}`);

  // Routines must be ordered as designed, and a real side must sit near 1.0 —
  // an earlier aerial-threat bug put every club below neutral, which silently
  // nerfed set pieces everywhere while still looking plausible in isolation.
  const mult = (r: Parameters<typeof cornerRoutineOf>[0]['setPieces'] extends undefined ? never : string) =>
    setPieceXG(xi, { ...state.tactics, setPieces: { cornerRoutine: r as 'far-post' } });
  const far = mult('far-post');
  const short = mult('short');
  if (far <= short) throw new Error(`far-post (${far.toFixed(2)}) should out-threaten short (${short.toFixed(2)})`);
  if (far < 0.75 || far > 1.6) throw new Error(`far-post multiplier ${far.toFixed(2)} is off-scale`);

  // Defensive schemes must be ordered zonal < mixed < man.
  const dm = (d: 'zonal' | 'man' | 'mixed') =>
    spDefenseMult(xi, { ...state.tactics, setPieces: { cornerDefense: d } });
  if (!(dm('zonal') < dm('mixed') && dm('mixed') < dm('man'))) {
    throw new Error('corner defence schemes are not ordered zonal < mixed < man');
  }

  console.log(`\nSet pieces: corners ${corner.name} (pas ${corner.pas}), penalties ${pen.name} (sho ${pen.sho}).`);
  console.log(`  far-post ${far.toFixed(2)}x vs short ${short.toFixed(2)}x; defence zonal ${dm('zonal').toFixed(2)} < man ${dm('man').toFixed(2)}. ✓`);
}

console.log('\n✓ ALL SMOKE TESTS PASSED');
