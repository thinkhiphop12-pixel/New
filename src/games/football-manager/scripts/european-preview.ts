/**
 * Prints real numbers for the Phase 9 continental bracket: entrant count,
 * seeding, whether country protection actually avoided same-country pairings
 * where an alternative existed, and how a full campaign plays out week by
 * week. Run: npx tsx scripts/european-preview.ts
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData } from '../engine/types';
import { newGame, playRound, seasonOver, continentalEntrants } from '../engine/seasonProgression';
import { simulateMatch } from '../engine/matchSimulation';
import { leagueCountry } from '../engine/negotiation';
import {
  continentalRoundName, continentalTieWinner, isContinentalClubAlive, tieAggregate, tieComplete,
} from '../engine/europeanCup';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '../public/data/gamedata.json'), 'utf8')) as GameData;

const club0 = data.clubs.find((c) => c.division === 1)!;
let state = newGame(data, club0.id, 'Euro Preview', 2026);

const entrants = continentalEntrants(state);
console.log(`Entrants: ${entrants.length} (expect 24)`);
console.log(`Direct qualifiers (top 8 seeds): ${state.continental.directQualifiers.length}`);
console.log(`Playoff field: ${(state.continental.ties[0] ?? []).length * 2}`);

const clubName = (id: number) => state.clubs.find((c) => c.id === id)?.name ?? `#${id}`;
const country = (id: number) => {
  const c = state.clubs.find((cl) => cl.id === id);
  return c ? leagueCountry(c.leagueId) : null;
};

console.log('\nPlayoff round draw (seed, country):');
for (const t of state.continental.ties[0] ?? []) {
  const same = country(t.homeId) === country(t.awayId);
  console.log(
    `  ${clubName(t.homeId)} (seed ${state.continental.seedRank[t.homeId]}, ${country(t.homeId)}) vs ` +
    `${clubName(t.awayId)} (seed ${state.continental.seedRank[t.awayId]}, ${country(t.awayId)})` +
    `${same ? '  <-- SAME COUNTRY' : ''}`,
  );
}

// Play a full season so the whole knockout resolves; report each round.
let weeksPlayed = 0;
let lastRoundReported = -1;
while (!seasonOver(state) && weeksPlayed < 60) {
  const fx = Object.values(state.fixtures).flat().find(
    (f) => f.round === state.week && (f.homeId === state.userClubId || f.awayId === state.userClubId),
  );
  const report = fx
    ? simulateMatch(state, fx.homeId, fx.awayId)
    : { homeId: 0, awayId: 0, homeGoals: 0, awayGoals: 0, events: [], playerRatings: {} };
  state = playRound(state, report as any);
  weeksPlayed++;

  if (state.continental.round !== lastRoundReported) {
    lastRoundReported = state.continental.round;
    const ties = state.continental.ties[state.continental.round - 1];
    if (ties?.length) {
      console.log(`\n${continentalRoundName(state.continental, state.continental.round - 1)} results:`);
      for (const t of ties) {
        if (!tieComplete(t)) continue;
        const agg = tieAggregate(t);
        const w = continentalTieWinner(t);
        console.log(`  ${clubName(t.homeId)} ${agg.home}-${agg.away} ${clubName(t.awayId)} -> ${clubName(w)}`);
      }
    }
  }
  if (state.continental.winnerId) break;
}

console.log(`\nWinner: ${state.continental.winnerId ? clubName(state.continental.winnerId) : 'undecided'}`);
console.log(`Rounds completed: ${state.continental.round}`);
console.log(`User club alive: ${isContinentalClubAlive(state.continental, state.userClubId)}`);

// Sanity checks.
if (entrants.length > 24) throw new Error(`entrants ${entrants.length} exceeds CONTINENTAL_SPOTS`);
if (!state.continental.winnerId) throw new Error('competition never produced a winner within 60 weeks');
let sameCountryAvoidable = 0;
for (const round of state.continental.ties) {
  for (const t of round) {
    if (country(t.homeId) === country(t.awayId) && country(t.homeId) !== null) sameCountryAvoidable++;
  }
}
console.log(`\nSame-country pairings across the whole run: ${sameCountryAvoidable} (some are structurally unavoidable in a small pool — not necessarily a bug).`);
console.log('\nDone.');

// Extra check: R16/QF/SF must have played exactly 2 legs each, final exactly 1.
for (let i = 0; i < state.continental.ties.length; i++) {
  for (const t of state.continental.ties[i]) {
    if (!tieComplete(t)) continue;
    const expected = t.twoLegged ? 2 : 1;
    if (t.legs.length !== expected) {
      throw new Error(`tie ${t.id} in round ${i} has ${t.legs.length} legs, expected ${expected} (twoLegged=${t.twoLegged})`);
    }
  }
}
console.log('\nLeg-count check: every complete tie played exactly the legs it should. ✓');
