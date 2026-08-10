/**
 * Smoke test for the new discipline (season card accumulation → suspension)
 * and pre-match-check engines, per this project's own rule that tuned/new
 * systems get checked against real output, not just "it compiles".
 * Run with: npx tsx scripts/discipline-preview.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData, MatchEvent, MatchReport } from '../engine/types';
import { newGame } from '../engine/seasonProgression';
import { applyDiscipline, isSuspended, resetDiscipline, serveSuspensions, YELLOW_BAN_STEP } from '../engine/discipline';
import { runPreMatchChecks, hasPreMatchWarnings, FITNESS_FLOOR } from '../engine/preMatch';
import { availableSquad, isLineupValid } from '../engine/teamManagement';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const data: GameData = JSON.parse(
  readFileSync(join(__dirname, '..', 'public', 'data', 'gamedata.json'), 'utf8')
);

function fakeReport(homeId: number, awayId: number, events: MatchEvent[]): MatchReport {
  return {
    homeId, awayId, homeGoals: 0, awayGoals: 0, homeXG: 0, awayXG: 0,
    events, homeLineup: [], awayLineup: [],
  };
}

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (cond) pass++; else fail++;
}

// ── 1. Five yellows across separate matches bans the sixth. ──
{
  let s = newGame(data, data.clubs[0].id, 'Preview');
  const clubId = s.userClubId;
  const p = s.players[availableSquad(s, clubId)[0].id];
  resetDiscipline(s);

  for (let i = 0; i < YELLOW_BAN_STEP - 1; i++) {
    applyDiscipline(s, fakeReport(clubId, 999, [{ minute: 10, type: 'card', clubId, text: '', playerId: p.id, card: 'yellow' }]));
  }
  check(`${YELLOW_BAN_STEP - 1} yellows: not yet suspended`, !isSuspended(p));

  const bans = applyDiscipline(s, fakeReport(clubId, 999, [{ minute: 10, type: 'card', clubId, text: '', playerId: p.id, card: 'yellow' }]));
  check(`${YELLOW_BAN_STEP}th yellow: banned`, isSuspended(p));
  check('ban record reports the yellows reason', bans.length === 1 && bans[0].reason === 'yellows');
  check(`yellowCards tally is exactly ${YELLOW_BAN_STEP}`, p.yellowCards === YELLOW_BAN_STEP);

  serveSuspensions(s, [clubId], new Set(bans.map((b) => b.playerId)));
  check('ban not served on the match he was booked in', (p.suspendedMatches ?? 0) === 1);
  serveSuspensions(s, [clubId], new Set());
  check('ban served on the next match', (p.suspendedMatches ?? 0) === 0 && !isSuspended(p));
}

// ── 2. A straight red bans for 1-3 matches and blocks selection immediately. ──
{
  const s = newGame(data, data.clubs[1].id, 'Preview');
  const clubId = s.userClubId;
  const p = s.players[availableSquad(s, clubId)[0].id];
  resetDiscipline(s);

  const bans = applyDiscipline(s, fakeReport(clubId, 999, [{ minute: 60, type: 'card', clubId, text: '', playerId: p.id, card: 'red' }]));
  check('red card bans the player', isSuspended(p));
  check('red ban is 1-3 matches', bans[0].matches >= 1 && bans[0].matches <= 3);
  check('suspended player excluded from availableSquad', !availableSquad(s, clubId).some((x) => x.id === p.id));

  const lineup = [p.id, ...availableSquad(s, clubId).slice(0, 10).map((x) => x.id)];
  check('lineup carrying a suspended player is invalid', !isLineupValid(s, clubId, lineup));
}

// ── 3. Second yellow bans exactly one match and still counts the yellow. ──
{
  const s = newGame(data, data.clubs[2].id, 'Preview');
  const clubId = s.userClubId;
  const p = s.players[availableSquad(s, clubId)[0].id];
  resetDiscipline(s);

  const bans = applyDiscipline(s, fakeReport(clubId, 999, [
    { minute: 70, type: 'card', clubId, text: '', playerId: p.id, card: 'red', secondYellow: true },
  ]));
  check('second yellow bans exactly 1 match', bans[0].matches === 1 && bans[0].reason === 'second-yellow');
  check('second yellow still counted as a yellow', p.yellowCards === 1);
}

// ── 4. Pre-match checks: a broken lineup falls back to 4-4-2 and auto-picks. ──
{
  const s = newGame(data, data.clubs[3].id, 'Preview');
  s.lineup = [s.lineup[0], null, null, ...s.lineup.slice(3)]; // punch holes in it
  const result = runPreMatchChecks(s);
  check('broken lineup produces a tactics warning', result.warnings.some((w) => w.kind === 'tactics'));
  check('fallback lineup is a full valid XI', isLineupValid({ ...s, lineup: result.lineup, formationId: result.formationId }, s.userClubId, result.lineup));
}

// ── 5. Pre-match checks: a suspended starter is auto-substituted. ──
{
  const s = newGame(data, data.clubs[4].id, 'Preview');
  const clubId = s.userClubId;
  const startingId = s.lineup.find((id): id is number => id !== null)!;
  s.players[startingId].suspendedMatches = 2;
  const result = runPreMatchChecks(s);
  check('suspended starter triggers an "unavailable" warning', result.warnings.some((w) => w.kind === 'unavailable' && w.playerId === startingId));
  check('suspended starter is not in the resolved lineup', !result.lineup.includes(startingId));
}

// ── 6. Pre-match checks: fatigue is flagged but not force-fixed. ──
{
  const s = newGame(data, data.clubs[5].id, 'Preview');
  const startingId = s.lineup.find((id): id is number => id !== null)!;
  s.players[startingId].fitness = FITNESS_FLOOR - 10;
  const result = runPreMatchChecks(s);
  const w = result.warnings.find((x) => x.kind === 'fitness' && x.playerId === startingId);
  check('fatigued starter triggers a fitness warning', !!w);
  check('fitness warning is not auto-applied (manager chooses)', w?.auto === false);
  check('fatigued starter stays in the resolved lineup unless benched', result.lineup.includes(startingId));
  check('fatigued starter is listed as risky', result.riskyIds.includes(startingId));
}

// ── 7. A clean XI raises nothing. ──
{
  const s = newGame(data, data.clubs[6].id, 'Preview');
  const result = runPreMatchChecks(s);
  check('a healthy, legal, tactically-set XI has no warnings', !hasPreMatchWarnings(result));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
