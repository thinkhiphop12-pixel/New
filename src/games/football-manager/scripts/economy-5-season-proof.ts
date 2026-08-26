/**
 * Plays a full career, week by week, through 5 seasons and prints the user
 * club's economy at each season boundary — budget, wage ceiling, actual wage
 * bill, FFP and SCR status. Not part of the build — run manually with:
 *   node --experimental-strip-types scripts/economy-5-season-proof.ts
 *
 * Exists to answer one question directly rather than by inspection: does the
 * budget/wage model stay sane (no runaway wage bill, no permanent FFP
 * breach, no budget going deeply negative) over a multi-season career, or
 * does it only look right for the one season most manual playtesting covers.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData } from '../engine/types';
import {
  newGame, playRound, seasonOver, endSeason, userLeagueId, leagueFixtures,
} from '../engine/seasonProgression';
import { simulateMatch } from '../engine/matchSimulation';
import { SEASON_ROUNDS, leagueName } from '../engine/gameRules';
import { clubWageBill, wageCeiling } from '../engine/teamManagement';
import { ffpStatus, scrStatus, financesView } from '../engine/finances';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data: GameData = JSON.parse(
  readFileSync(join(__dirname, '..', 'public', 'data', 'gamedata.json'), 'utf8')
);

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error('ECONOMY PROOF FAILED: ' + msg);
}

const m = (v: number) => (Math.abs(v) >= 1e6 ? `£${(v / 1e6).toFixed(2)}m` : `£${Math.round(v / 1000)}k`);

const userClub = data.clubs.find((c) => c.division === 1)!;
let state = newGame(data, userClub.id, 'Economy Proof');
console.log(`Started career at ${userClub.name} (${leagueName(userLeagueId(state))}).\n`);

console.log(
  ['Season', 'Budget', 'WageCeil', 'WageBill', 'WageBill/Ceil', 'FFP', 'SCR'].map((h) => h.padEnd(14)).join(''),
);

function report(label: string) {
  const bill = clubWageBill(state, state.userClubId);
  const ceil = wageCeiling(state);
  const ffp = ffpStatus(state);
  const scr = scrStatus(state);
  console.log(
    [
      label.padEnd(14),
      m(state.budget).padEnd(14),
      m(ceil).padEnd(14),
      m(bill).padEnd(14),
      `${((bill / ceil) * 100).toFixed(0)}%`.padEnd(14),
      ffp.label.padEnd(14),
      `${(scr.scr * 100).toFixed(0)}%${scr.embargo ? ' EMBARGO' : ''}`,
    ].join(''),
  );
  return { bill, ceil, ffp, scr };
}

report('Season 1 start');

for (let season = 1; season <= 5; season++) {
  let weeksPlayed = 0;
  while (!seasonOver(state)) {
    const userFixture = leagueFixtures(state, userLeagueId(state)).find(
      (f) => f.round === state.week && (f.homeId === state.userClubId || f.awayId === state.userClubId),
    );
    const rep = userFixture
      ? simulateMatch(state, userFixture.homeId, userFixture.awayId)
      : { homeId: 0, awayId: 0, homeGoals: 0, awayGoals: 0, events: [], playerRatings: {} };
    state = playRound(state, rep as any);
    weeksPlayed++;
    if (weeksPlayed > SEASON_ROUNDS + 5) throw new Error(`season ${season} never ended`);
  }
  const { bill, ceil, ffp, scr } = report(`Season ${season} end`);

  // The invariants an unbroken economy should hold, season after season —
  // not just on the one season most manual playtesting exercises.
  assert(Number.isFinite(state.budget), `season ${season}: budget is not finite (${state.budget})`);
  assert(bill <= ceil * 1.01, `season ${season}: wage bill (${m(bill)}) exceeds its own ceiling (${m(ceil)})`);
  assert(state.budget > -50_000_000, `season ${season}: budget has gone deeply negative (${m(state.budget)})`);
  if (season > 1) {
    assert(ffp.label !== 'In Breach' || !scr.embargo, `season ${season}: stuck in FFP breach with an active embargo`);
  }

  state = endSeason(state).state;
}

report('Season 6 start (post-loop)');

console.log('\nAll 5 seasons completed. Wage bill stayed within its ceiling, budget stayed finite and bounded, no permanent FFP/embargo lock-in. ✓');
