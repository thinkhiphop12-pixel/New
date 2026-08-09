/** Prints each club's starting transfer budget so the spread stays sane.
 *    npx tsx scripts/budget-preview.ts [leagueId] */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData } from '../engine/types';
import { newGame } from '../engine/seasonProgression';
import { clubBudget } from '../engine/jobMarket';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data: GameData = JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', 'gamedata.json'), 'utf8'));
const m = (v: number) => (Math.abs(v) >= 1e6 ? `£${(v / 1e6).toFixed(1)}m` : `£${Math.round(v / 1000)}k`);

const state = newGame(data, data.clubs[0].id, 'Preview');
const leagues = process.argv[2] ? [process.argv[2]] : ['premier_league', 'championship', 'league_one'];
for (const lg of leagues) {
  console.log(`\n=== ${lg} ===`);
  const rows = state.clubs.filter((c) => c.leagueId === lg && !c.dormant)
    .map((c) => ({ name: c.name, budget: clubBudget(state, c.id) }))
    .sort((a, b) => b.budget - a.budget);
  for (const r of rows) console.log(`  ${r.name.padEnd(28)} ${m(r.budget)}`);
}
