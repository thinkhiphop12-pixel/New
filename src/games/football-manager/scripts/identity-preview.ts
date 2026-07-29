/**
 * Prints exactly what the Tactics > Team Identity cards will render for a new
 * career, so the figures can be sanity-checked without clicking through the UI.
 *
 * Run: npx tsx scripts/identity-preview.ts
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData, PlayStyle } from '../engine/types';
import { newGame } from '../engine/seasonProgression';
import { getLeague } from '../engine/gameRules';
import {
  coachDrillMult, projectedFamiliarity, styleExec, styleFamiliarity, weeksToDrill,
} from '../engine/familiarity';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  readFileSync(join(here, '../public/data/gamedata.json'), 'utf8'),
) as GameData;

const ORDER: PlayStyle[] = [
  'balanced', 'parkbus', 'possession', 'tiki-taka', 'gegenpressing',
  'counter', 'direct', 'longball', 'catenaccio',
];

// One elite side and one lower-league side — the interesting comparison is that
// the same identity should be cheap for one and unreachable for the other.
for (const clubName of ['Liverpool', 'Bradford City']) {
  const club0 = data.clubs.find((c) => c.name === clubName) ?? data.clubs[0];
  const state = newGame(data, club0.id, 'Preview', 2026);
  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const level = getLeague(club.leagueId)?.level ?? 3;
  const coach = coachDrillMult(state);
  const xi = state.lineup
    .map((id) => (id == null ? null : state.players[id]))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  console.log(`\n${club.name} — ${getLeague(club.leagueId).name} (L${level}), identity: ${club.playStyle}`);
  console.log('  style           drilled  switch   squad fit');
  for (const id of ORDER) {
    const active = (state.playStyle ?? club.playStyle) === id;
    const fam = active ? styleFamiliarity(club, id) : projectedFamiliarity(club, id);
    const weeks = weeksToDrill(club, id, 80, coach);
    const fit = Math.round(styleExec(club, xi, id, level, undefined, { rawSkill: true }) * 100);
    console.log(
      `  ${(active ? '* ' : '  ') + id.padEnd(14)}${String(Math.round(fam)).padStart(4)}%` +
      `${(weeks === 0 ? 'ready' : `${weeks}w`).padStart(9)}${String(fit).padStart(10)}%`,
    );
  }
}
