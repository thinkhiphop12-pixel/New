/**
 * Prints real computed odds and outright probabilities for Phase 12's odds
 * model, so the scoreline grid, markets and Monte Carlo outrights can be
 * checked against sane real numbers rather than trusted off a clean build.
 *
 * Run: npx tsx scripts/odds-preview.ts
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData } from '../engine/types';
import { newGame } from '../engine/seasonProgression';
import { computeMarkets, scoreGrid, seasonOutrights, toOdds } from '../engine/odds';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  readFileSync(join(here, '../public/data/gamedata.json'), 'utf8'),
) as GameData;

const state = newGame(data, data.clubs.find((c) => c.name === 'Liverpool')!.id, 'Preview');
const liverpool = state.clubs.find((c) => c.name === 'Liverpool')!;
const burnley = state.clubs.find((c) => c.name === 'Burnley')!;

console.log('=== Scoreline grid + markets: Liverpool (H) vs Burnley (A) ===\n');
const sg = scoreGrid(state, liverpool.id, burnley.id);
console.log(`xG: home=${sg.homeXG.toFixed(2)} away=${sg.awayXG.toFixed(2)}`);
let gridSum = 0;
for (const row of sg.grid) for (const p of row) gridSum += p;
console.log(`Grid sums to ${gridSum.toFixed(4)} (must be ~1.0000)`);

const top5 = [];
for (let h = 0; h < sg.grid.length; h++) {
  for (let a = 0; a < sg.grid[h].length; a++) top5.push({ h, a, p: sg.grid[h][a] });
}
top5.sort((x, y) => y.p - x.p);
console.log('Most likely scorelines:');
for (const s of top5.slice(0, 5)) console.log(`  ${s.h}-${s.a}: ${(s.p * 100).toFixed(1)}%`);

const markets = computeMarkets(sg);
console.log(`\n1X2 sums to ${(markets.homeWin + markets.draw + markets.awayWin).toFixed(4)} (must be ~1.0000)`);
console.log(`Home win ${(markets.homeWin * 100).toFixed(1)}% -> ${toOdds(markets.homeWin)}`);
console.log(`Draw     ${(markets.draw * 100).toFixed(1)}% -> ${toOdds(markets.draw)}`);
console.log(`Away win ${(markets.awayWin * 100).toFixed(1)}% -> ${toOdds(markets.awayWin)}`);
console.log(`BTTS Yes ${(markets.bttsYes * 100).toFixed(1)}% -> ${toOdds(markets.bttsYes)}`);
console.log(`Over 2.5 ${(markets.over25 * 100).toFixed(1)}% -> ${toOdds(markets.over25)}`);

console.log('\n=== Reverse fixture: Burnley (H) vs Liverpool (A) ===\n');
const sg2 = scoreGrid(state, burnley.id, liverpool.id);
const markets2 = computeMarkets(sg2);
console.log(`xG: home=${sg2.homeXG.toFixed(2)} away=${sg2.awayXG.toFixed(2)}`);
console.log(`Home win (Burnley) ${(markets2.homeWin * 100).toFixed(1)}% -> ${toOdds(markets2.homeWin)}`);
console.log(`Away win (Liverpool) ${(markets2.awayWin * 100).toFixed(1)}% -> ${toOdds(markets2.awayWin)}`);
console.log(`  (home advantage: Liverpool at home ${(markets.homeWin * 100).toFixed(1)}% > Liverpool away ${(markets2.awayWin * 100).toFixed(1)}%: ${markets.homeWin > markets2.awayWin ? 'YES, expected' : 'NO, unexpected'})`);

console.log('\n=== Season outrights (Monte Carlo, Liverpool) ===\n');
const t0 = Date.now();
const out = seasonOutrights(state);
console.log(`title=${(out.title * 100).toFixed(1)}%, top4=${(out.topFour * 100).toFixed(1)}%, relegation=${(out.relegation * 100).toFixed(1)}%`);
console.log(`(default run count took ${Date.now() - t0}ms)`);
