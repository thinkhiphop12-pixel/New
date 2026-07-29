/**
 * Prints real numbers for the Phase 5 remainder: the custom formation
 * builder, opponent-contextual AI tactics, and the live previewEffectiveXG
 * readout — so all three can be sanity-checked against real computed values
 * rather than trusted off a clean build.
 *
 * Run: npx tsx scripts/tactics5-preview.ts
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData } from '../engine/types';
import { newGame } from '../engine/seasonProgression';
import { buildCustomFormation, getLeague } from '../engine/gameRules';
import { contextualizeTactics, previewEffectiveXG, squadAvgRating } from '../engine/teamManagement';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  readFileSync(join(here, '../public/data/gamedata.json'), 'utf8'),
) as GameData;

console.log('=== Custom formation builder ===\n');
for (const [d, m, f] of [[3, 4, 3], [4, 3, 3], [5, 2, 3], [3, 5, 2]] as [number, number, number][]) {
  const formation = buildCustomFormation(d, m, f);
  console.log(`${d}-${m}-${f} -> id=${formation.id}, ${formation.slots.length} slots`);
  console.log('  ' + formation.slots.map((s) => s.label).join(' '));
}
// Invalid split (doesn't total 10) should fall back rather than crash.
const invalid = buildCustomFormation(4, 4, 4);
console.log(`\nInvalid 4-4-4 (totals 12) falls back to: ${invalid.id} (${invalid.slots.length} slots)`);

console.log('\n=== Opponent-contextual AI tactics ===\n');
// Liverpool (elite) vs a real minnow, and the reverse, from the same league so
// the reputation gap and rating gap point the same direction.
const state = newGame(data, data.clubs.find((c) => c.name === 'Liverpool')!.id, 'Preview');
const liverpool = state.clubs.find((c) => c.name === 'Liverpool')!;
const minnow = state.clubs.find((c) => c.name === 'Burnley') ?? state.clubs[1];

for (const [label, clubId, oppId] of [
  ['Liverpool (elite) hosting the minnow', liverpool.id, minnow.id],
  ['The minnow hosting Liverpool (elite)', minnow.id, liverpool.id],
] as [string, number, number][]) {
  const t = contextualizeTactics(state, clubId, oppId);
  console.log(`${label}:`);
  console.log(`  style=${t.style} pressing=${t.pressing} tempo=${t.tempo} width=${t.width} defLine=${t.defLine} buildUp=${t.buildUp} tackling=${t.tackling}`);
}

// Most extreme in-league gap available (measured top-to-bottom spread), to
// confirm the elite/underdog thresholds actually fire at all.
{
  const sameLeague = state.clubs.filter((c) => c.leagueId === liverpool.leagueId);
  const byRating = [...sameLeague].sort((a, b) => squadAvgRating(state, b.id) - squadAvgRating(state, a.id));
  const topClub = byRating[0];
  const bottomClub = byRating[byRating.length - 1];
  const t1 = contextualizeTactics(state, topClub.id, bottomClub.id);
  const t2 = contextualizeTactics(state, bottomClub.id, topClub.id);
  console.log(`\n${topClub.name} hosting ${bottomClub.name} (widest in-league gap): style=${t1.style}, tackling=${t1.tackling}`);
  console.log(`${bottomClub.name} hosting ${topClub.name}: style=${t2.style}, tackling=${t2.tackling}`);
}

// A same-level match-up: two similarly-rated clubs in the same league.
const midA = state.clubs.find((c) => c.leagueId === liverpool.leagueId && c.id !== liverpool.id && c.id !== minnow.id)!;
const midB = state.clubs.find((c) => c.leagueId === liverpool.leagueId && c.id !== liverpool.id && c.id !== minnow.id && c.id !== midA.id)!;
const tMid = contextualizeTactics(state, midA.id, midB.id);
console.log(`\nA close match-up (${midA.name} vs ${midB.name}):`);
console.log(`  style=${tMid.style} pressing=${tMid.pressing} defLine=${tMid.defLine} runs=${tMid.runs}`);

console.log('\n=== Live previewEffectiveXG ===\n');
const xg1 = previewEffectiveXG(state, minnow.id);
console.log(`Liverpool (default tactics) vs ${minnow.name}: userXG=${xg1.userXG}, oppXG=${xg1.oppXG}`);

// Note: `mentality` (the dedicated pill on TacticsScreen) is what actually
// drives calcMatchXG's attack/defence base multiplier for the human side —
// `style` (the separate "Approach" accordion) is not read by the xG chain at
// all for the user (confirmed by reading calcMatchXG's `t()` mapping and
// sim.ts's makeSide, which takes mentality straight from state.tactics.mentality
// for the user, independent of .style). So the live preview has to react to
// the mentality pill, not the Approach pill, to be a useful readout.
const xg2 = previewEffectiveXG(state, minnow.id, {
  tactics: { ...state.tactics, mentality: 'ultra-defensive', pressing: 'low', defLine: 'deep' },
});
console.log(`Liverpool (forced ultra-defensive/low-block) vs ${minnow.name}: userXG=${xg2.userXG}, oppXG=${xg2.oppXG}`);
console.log(`  (defensive tweak should lower userXG relative to default: ${xg2.userXG < xg1.userXG ? 'YES' : 'NO, unexpected'})`);

const customFormation = buildCustomFormation(3, 4, 3);
const xg3 = previewEffectiveXG(state, minnow.id, { formationId: customFormation.id });
console.log(`Liverpool in a custom 3-4-3 vs ${minnow.name}: userXG=${xg3.userXG}, oppXG=${xg3.oppXG}`);
