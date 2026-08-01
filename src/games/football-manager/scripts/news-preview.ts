/**
 * Prints real news headlines generated mid-season, so the weekly press desk
 * (Phase 12) can be checked against actual output rather than trusted off a
 * clean build. Checked BEFORE endSeason(), which intentionally resets
 * state.news for the new season (same pattern as the weekly 14-item cap) —
 * checking after would only ever show the season-end reset content.
 *
 * Run: npx tsx scripts/news-preview.ts
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData } from '../engine/types';
import { newGame, playRound, seasonOver } from '../engine/seasonProgression';
import { simulateMatch } from '../engine/matchSimulation';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '../public/data/gamedata.json'), 'utf8')) as GameData;

let state = newGame(data, data.clubs.find((c) => c.name === 'Liverpool')!.id, 'Preview');
let guard = 0;
while (!seasonOver(state) && guard < 60) {
  const fx = Object.values(state.fixtures).flat().find((f) => f.round === state.week && (f.homeId === state.userClubId || f.awayId === state.userClubId));
  const report = fx ? simulateMatch(state, fx.homeId, fx.awayId) : ({ homeId: 0, awayId: 0, homeGoals: 0, awayGoals: 0, events: [] } as any);
  state = playRound(state, report);
  guard++;
}

console.log(`Mid/end-of-season-but-pre-endSeason(), week ${state.week}: ${state.news.length} news headlines, cooldowns fired:`);
console.log(JSON.stringify(state.newsCooldowns));
console.log('\nHeadlines:');
for (const n of state.news) console.log(`  - ${n}`);

const fromPhase12 = state.news.filter((n) =>
  /Title race goes to the wire|Relegation dogfight|Golden Boot race hots up|Breakout season|Pressure mounting/.test(n)
);
console.log(`\n${fromPhase12.length} headline(s) from the new Phase 12 generators specifically:`);
for (const n of fromPhase12) console.log(`  - ${n}`);
