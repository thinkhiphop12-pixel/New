/** Wage economy check: squad cost against revenue, per league.
 *  The SCR limit is 0.70 — a normally-run club must sit clearly under it once
 *  transfer amortization is added on top, so wages alone want to land ~40-55%.
 *    npx tsx scripts/wage-preview.ts */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData, Club } from '../engine/types';
import { newGame } from '../engine/seasonProgression';
import { LEAGUES } from '../engine/gameRules';
import { clubFootballRevenue, ensureFinances } from '../engine/finances';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data: GameData = JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', 'gamedata.json'), 'utf8'));
const m = (v: number) => (Math.abs(v) >= 1e6 ? `£${(v / 1e6).toFixed(1)}m` : `£${Math.round(v / 1000)}k`);
const s = newGame(data, data.clubs[0].id, 'Preview');
ensureFinances(s);
const wageYr = (c: Club) => c.playerIds.reduce((t, id) => t + (s.players[id]?.wage ?? 0), 0) * 52;
// The exact base the squad-cost ratio is measured against.
const rev = (c: Club) => clubFootballRevenue(s, c);

console.log('league                  lvl   med wage/yr   med rev/yr  wage:rev    worst club');
for (const lg of LEAGUES.filter((l) => !l.phantom)) {
  const peers = s.clubs.filter((c) => c.leagueId === lg.id && !c.dormant);
  if (!peers.length) continue;
  const rows = peers.map((c) => ({ n: c.name, w: wageYr(c), r: rev(c), pc: wageYr(c) / rev(c) }))
    .sort((a, b) => a.pc - b.pc);
  const md = rows[rows.length >> 1];
  const worst = rows[rows.length - 1];
  const flag = worst.pc > 0.70 ? '  <-- OVER SCR LIMIT' : '';
  console.log(
    `${lg.id.padEnd(24)}${String(lg.level).padStart(2)}   ${m(md.w).padStart(10)}   ${m(md.r).padStart(10)}   ${(md.pc*100).toFixed(0).padStart(5)}%    ${worst.n.slice(0,20).padEnd(20)} ${(worst.pc*100).toFixed(0).padStart(4)}%${flag}`
  );
}
