/* Headless balance test: run a full season with the user on autopilot. */
import { readFileSync } from 'node:fs';
import type { GameData } from '../engine/types';
import { leagueName } from '../engine/gameRules';
import { newGame, playRound, computeTable, nextUserFixture, seasonOver, endSeason, userLeagueId, leagueClubs } from '../engine/seasonProgression';
import { isWinterBreakWeek } from '../engine/gameRules';
import { simulateMatch } from '../engine/matchSimulation';
import { autoPickLineup } from '../engine/teamManagement';
import { getFormation } from '../engine/gameRules';

const data = JSON.parse(readFileSync(new URL('../public/data/gamedata.json', import.meta.url), 'utf8')) as GameData;

for (const clubId of [1, 20, 21, 40]) {
  let s = newGame(data, clubId);
  const clubName = s.clubs.find((c) => c.id === clubId)!.name;
  let w = 0, d = 0, l = 0;
  while (!seasonOver(s)) {
    s.lineup = autoPickLineup(s, clubId, getFormation(s.formationId));
    const fx = nextUserFixture(s);
    // The winter break (and any other blank week) has no league fixture — just
    // advance the calendar rather than treating it as an error.
    if (!fx) {
      if (!isWinterBreakWeek(s.week)) throw new Error(`no fixture week ${s.week}`);
      s = playRound(s, { homeId: 0, awayId: 0, homeGoals: 0, awayGoals: 0, homeXG: 0, awayXG: 0, events: [], homeLineup: [], awayLineup: [] });
      continue;
    }
    const rep = simulateMatch(s, fx.homeId, fx.awayId);
    const isHome = rep.homeId === clubId;
    const gf = isHome ? rep.homeGoals : rep.awayGoals;
    const ga = isHome ? rep.awayGoals : rep.homeGoals;
    if (gf > ga) w++; else if (gf === ga) d++; else l++;
    s = playRound(s, rep);
  }
  const table = computeTable(s, userLeagueId(s));
  const pos = table.findIndex((r) => r.clubId === clubId) + 1;
  const totalGoals = table.reduce((sum, r) => sum + r.gf, 0);
  const n = leagueClubs(s, userLeagueId(s)).length;
  const leagueMatches = (n * (n - 1) * 2) / 2;
  const { summary } = endSeason(s);
  console.log(
    `${clubName.padEnd(20)} ${leagueName(userLeagueId(s)).padEnd(16)} pos ${String(pos).padStart(2)} | ${w}W ${d}D ${l}L | league avg goals/match ${(totalGoals / leagueMatches).toFixed(2)} | prize £${(summary.prize / 1e6).toFixed(1)}M ${summary.champions ? 'CHAMPIONS' : summary.relegated ? 'RELEGATED' : summary.promoted ? 'PROMOTED' : ''}`
  );
}
