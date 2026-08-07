/**
 * Budget preview — prints real numbers instead of trusting the model.
 *
 *   npx tsx scripts/finance-preview.ts
 *
 * Three things must look right before the model is worth shipping:
 *   1. Per-club transfer budgets spread across a division by stature, with the
 *      division's *median* still landing on its calibrated `startingBudget` —
 *      that is the invariant that keeps the economy where it was.
 *   2. Wage budgets leave real but finite headroom over the squad's bill.
 *   3. Over several seasons budgets actually move: up with a good finish or
 *      promotion, down with a bad one, without running away.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData } from '../engine/types';
import { newGame, playRound, seasonOver, endSeason, userLeagueId } from '../engine/seasonProgression';
import { simulateMatch } from '../engine/matchSimulation';
import { LEAGUES, getLeague, startingBudget } from '../engine/gameRules';
import { baseTransferBudget, ensureFinances, wageBudgetStatus } from '../engine/finances';
import { squadAvgRating } from '../engine/teamManagement';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data: GameData = JSON.parse(
  readFileSync(join(__dirname, '..', 'public', 'data', 'gamedata.json'), 'utf8')
);

const m = (v: number) => (Math.abs(v) >= 1e6 ? `£${(v / 1e6).toFixed(2)}m` : `£${Math.round(v / 1000)}k`);
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/* One shared probe state. `newGame` walks every club and all ~12k players, so
 * rebuilding it inside each league loop made this script take minutes. */
const probe = newGame(data, data.clubs[0].id, 'Preview');

/* ── 1. Transfer budgets: the per-club split ─────────────────────────────── */
console.log('='.repeat(96));
console.log('TRANSFER BUDGETS BY LEAGUE  (per club; the division median must stay on its startingBudget)');
console.log('='.repeat(96));

let worstDrift = 0;
for (const lg of LEAGUES.filter((l) => !l.phantom)) {
  const peers = probe.clubs.filter((c) => c.leagueId === lg.id && !c.dormant);
  if (!peers.length) continue;

  const rows = peers
    .map((c) => ({
      name: c.name,
      source: c.budgetSource ?? 'derived',
      mult: c.budgetMultiplier ?? 1,
      budget: baseTransferBudget(probe, c),
      rating: squadAvgRating(probe, c.id),
    }))
    .sort((a, b) => b.budget - a.budget);

  const med = median(rows.map((r) => r.budget));
  const base = startingBudget(lg.id);
  const drift = base > 0 ? Math.abs(med - base) / base : 0;
  worstDrift = Math.max(worstDrift, drift);
  console.log(
    `\n${lg.name.padEnd(24)} base ${m(base).padStart(9)} · median ${m(med).padStart(9)}` +
    ` · drift ${pct(drift).padStart(4)}${drift > 0.2 ? '  <-- CHECK' : ''}` +
    ` · real FC26 budgets ${rows.filter((r) => r.source === 'fc26').length}/${rows.length}`
  );
  for (const r of [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]]) {
    console.log(
      `   ${r.name.padEnd(24)} x${r.mult.toFixed(2)} -> ${m(r.budget).padStart(9)}` +
      ` | squad ${r.rating.toFixed(1)} | ${r.source}`
    );
  }
}
console.log(`\nworst median drift across all divisions: ${pct(worstDrift)}`);

/* ── 2. Wage budgets: headroom over the inherited squad ──────────────────── */
console.log('\n' + '='.repeat(96));
console.log('WAGE BUDGETS  (committed bill vs the board ceiling, one club per level)');
console.log('='.repeat(96));

for (const lgId of ['premier_league', 'championship', 'league_one', 'league_two']) {
  const peers = probe.clubs.filter((c) => c.leagueId === lgId && !c.dormant)
    .sort((a, b) => squadAvgRating(probe, b.id) - squadAvgRating(probe, a.id));
  if (!peers.length) continue;
  console.log(`\n${getLeague(lgId).name}`);
  for (const club of [peers[0], peers[peers.length - 1]]) {
    const s = newGame(data, club.id, 'Preview');
    ensureFinances(s);
    const w = wageBudgetStatus(s);
    console.log(
      `   ${club.name.padEnd(24)} committed ${m(w.committed).padStart(8)}/wk` +
      ` · ceiling ${m(w.budget).padStart(8)}/wk · free ${m(w.free).padStart(8)}/wk · used ${pct(w.pct)}`
    );
  }
}

/* ── 3. Multi-season: do the budgets actually move? ──────────────────────── */
console.log('\n' + '='.repeat(96));
console.log('FIVE SIMULATED SEASONS  (budget should follow finish and division, without running away)');
console.log('='.repeat(96));

function runSeasons(clubId: number, label: string) {
  let s = newGame(data, clubId, 'Preview');
  ensureFinances(s);
  const opening = s.budget;
  console.log(`\n--- ${label} --- opening budget ${m(opening)}`);

  for (let season = 0; season < 5; season++) {
    while (!seasonOver(s)) {
      const f = (s.fixtures[userLeagueId(s)] ?? []).find(
        (x) => x.round === s.week && (x.homeId === s.userClubId || x.awayId === s.userClubId)
      );
      const report = f
        ? simulateMatch(s, f.homeId, f.awayId)
        : simulateMatch(s, s.userClubId, s.clubs.find((c) => c.id !== s.userClubId)!.id);
      s = playRound(s, report);
    }
    const league = getLeague(userLeagueId(s)).name;
    const closing = s.budget;

    s = endSeason(s).state;
    const pos = s.history[s.history.length - 1]?.position ?? 0;
    // `rolloverSeason` fires from the first `tickFinances` of the new season,
    // not from `endSeason`, so play one round before reading the new budgets.
    const f = (s.fixtures[userLeagueId(s)] ?? []).find(
      (x) => x.round === s.week && (x.homeId === s.userClubId || x.awayId === s.userClubId)
    );
    if (f) s = playRound(s, simulateMatch(s, f.homeId, f.awayId));

    console.log(
      `   ${String(s.seasonYear - 1)} ${league.padEnd(18)} finished ${String(pos).padStart(2)}` +
      ` · closing ${m(closing).padStart(9)}` +
      ` -> ${getLeague(userLeagueId(s)).name.padEnd(18)} transfer ${m(s.budget).padStart(9)}` +
      ` · wage ${m(wageBudgetStatus(s).budget).padStart(7)}/wk · confidence ${s.board.confidence}`
    );
  }
  console.log(`   growth over five seasons: ${(s.budget / Math.max(1, opening)).toFixed(1)}x`);
}

runSeasons(data.clubs.find((c) => c.division === 1)!.id, 'Premier League club');
runSeasons(data.clubs.find((c) => c.division === 2)!.id, 'Championship club');
runSeasons(data.clubs.find((c) => c.division === 4)!.id, 'League Two club');
