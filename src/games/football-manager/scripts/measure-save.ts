/**
 * Measures the serialized size of a GameState, which is exactly what
 * lib/storage.ts writes into a single localStorage key.
 *
 * Browsers cap localStorage at roughly 5 MB per origin, and the setItem call in
 * storage.ts swallows the resulting QuotaExceededError, so a save that crosses
 * the cap fails invisibly — the session keeps playing and silently stops
 * persisting. This script exists to keep that number visible.
 *
 * Run: npx tsx scripts/measure-save.ts
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData } from '../engine/types';
import { newGame, playRound, seasonOver, nextUserFixture, endSeason } from '../engine/seasonProgression';
import { simulateMatch } from '../engine/matchSimulation';
import { compressToUTF16, decompressFromUTF16 } from '../lib/lz';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  readFileSync(join(here, '../public/data/gamedata.json'), 'utf8'),
) as GameData;

const state = newGame(data, data.clubs[0].id, 'Measurement', 2026);
const json = JSON.stringify(state);
const mb = json.length / 1048576;

console.log(`players in data:      ${data.players.length}`);
console.log(`clubs in data:        ${data.clubs.length}`);
console.log(`gamedata.json:        ${(JSON.stringify(data).length / 1048576).toFixed(2)} MB`);
console.log(`serialized GameState: ${json.length.toLocaleString()} bytes = ${mb.toFixed(2)} MB`);
console.log(`localStorage cap:     ~5.00 MB (varies 5-10 by browser)`);
console.log(
  mb > 4
    ? `\nOVER BUDGET - saves are at or past the localStorage limit.`
    : `\nWithin budget at kickoff, ${(5 - mb).toFixed(2)} MB headroom.`,
);

/* A fresh save is the best case. Growth is what actually breaks it: the ledger,
 * inbox, career history and per-player season stats all accumulate as a career
 * runs. Play forward and report the trend so the headroom above isn't mistaken
 * for a safety margin. */
console.log(`\nGrowth over a simulated career:`);
let s = state;
let season = 0;
const rows: string[] = [];
try {
  while (season < 3) {
    while (!seasonOver(s)) {
      const fx = nextUserFixture(s);
      if (!fx) break;
      s = playRound(s, simulateMatch(s, fx.homeId, fx.awayId));
    }
    const size = JSON.stringify(s).length / 1048576;
    rows.push(
      `  after season ${++season}: ${size.toFixed(2)} MB` +
        (size > 5 ? '   <-- EXCEEDS localStorage' : ''),
    );
    s = endSeason(s).state;
  }
} catch (e) {
  rows.push(`  simulation stopped: ${(e as Error).message}`);
}
console.log(rows.join('\n'));

/* Phase 0b assertion: the compressed payload must round-trip byte-for-byte and
 * must fit with room to spare even at the largest size measured above. */
const worst = JSON.stringify(s);
const packed = compressToUTF16(worst);
const restored = decompressFromUTF16(packed);
const packedMb = packed.length / 1048576;

console.log(`\nCompression (worst case above):`);
console.log(`  raw        ${(worst.length / 1048576).toFixed(2)} MB`);
console.log(`  compressed ${packedMb.toFixed(2)} MB  (${(worst.length / packed.length).toFixed(1)}x)`);
console.log(`  round-trip ${restored === worst ? 'OK' : 'FAIL'}`);

if (restored !== worst) throw new Error('compression round-trip corrupted the save');
if (packedMb > 2) throw new Error(`compressed save ${packedMb.toFixed(2)} MB is too large`);
console.log(`\n✓ Save fits comfortably once compressed.`);
