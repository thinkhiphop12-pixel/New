/**
 * Phase 8 finance preview — prints real numbers instead of trusting the model.
 *
 *   npx tsx scripts/finance-preview.ts
 *
 * Four things must look right here before the model is worth shipping:
 *   1. The revenue streams scale sensibly by league level and club stature,
 *      and the matchday model stays in the same ballpark as the old flat
 *      GATE_BASE income it replaces (no silent 10x cash-flow change).
 *   2. Per-club transfer budgets spread across a division by stature, with the
 *      division's *median* still landing on its calibrated `startingBudget` —
 *      that is the invariant that keeps the economy where it was.
 *   3. Wage budgets leave real but finite headroom over the squad's bill.
 *   4. Over several seasons budgets actually move: up with a good finish or
 *      promotion, down with a bad one, without running away.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData, GameState, Club } from '../engine/types';
import { newGame, playRound, seasonOver, endSeason, userLeagueId } from '../engine/seasonProgression';
import { simulateMatch } from '../engine/matchSimulation';
import { LEAGUES, SEASON_ROUNDS, getLeague, startingBudget } from '../engine/gameRules';
import {
  annualFootballRevenue, baseTransferBudget, clubStature, commercialIncomeAnnual, economyScale,
  ensureFinances, financesView, matchdayBase, tvIncomeAnnual, totalSeasonIncome,
  totalSeasonExpenses, homeGamesPerSeason, previewMatchIncome, wageBudgetStatus,
} from '../engine/finances';

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

function squadWageAnnual(s: GameState, club: Club): number {
  return club.playerIds.reduce((t, id) => t + (s.players[id]?.wage ?? 0), 0) * 52;
}

/* One shared probe state. `newGame` walks every club and all ~12k players, so
 * rebuilding it inside each league loop made this script take minutes; nothing
 * below mutates it. */
const probe = newGame(data, data.clubs[0].id, 'Preview');

/* ── 1. Revenue across every league, every club ──────────────────────────── */
console.log('='.repeat(96));
console.log('REVENUE MODEL BY LEAGUE  (annual, user-club basis; "old gate" = previous flat GATE_BASE season total)');
console.log('='.repeat(96));

for (const lg of LEAGUES.filter((l) => !l.phantom)) {
  const peers = probe.clubs.filter((c) => c.leagueId === lg.id && !c.dormant);
  if (!peers.length) { console.log(`${lg.name}: no active clubs`); continue; }

  const scale = economyScale(probe, lg.id);
  const oldGate = lg.gateBase * SEASON_ROUNDS;
  console.log(`\n${lg.name}  (level ${lg.level}, TV share £${lg.tvEqualShare}m)`);
  console.log(`  economyScale ${scale.toFixed(4)} · old flat gate income/season ${m(oldGate)} · home games ${homeGamesPerSeason(lg)}`);

  const rows = peers
    .map((c) => {
      const s = { ...probe, userClubId: c.id } as GameState;
      s.finances = undefined;
      ensureFinances(s);
      const rev = annualFootballRevenue(s);
      const wages = squadWageAnnual(s, c);
      return {
        name: c.name,
        stature: clubStature(probe, c),
        md: matchdayBase(s, c),
        tv: tvIncomeAnnual(s, c),
        commercial: commercialIncomeAnnual(s, c),
        rev,
        wages,
        wageRatio: wages / rev,
      };
    })
    .sort((a, b) => b.rev - a.rev);

  for (const r of [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]]) {
    console.log(
      `   ${r.name.padEnd(22)} stature ${r.stature.toFixed(2)}` +
      ` | matchday ${m(r.md).padStart(8)} | TV ${m(r.tv).padStart(8)}` +
      ` | commercial ${m(r.commercial).padStart(8)}` +
      ` | revenue ${m(r.rev).padStart(8)} | wages ${m(r.wages).padStart(8)} | wages/rev ${pct(r.wageRatio).padStart(5)}`
    );
  }
  const ratios = rows.map((r) => r.wageRatio).sort((a, b) => a - b);
  console.log(`  wages/revenue spread: min ${pct(ratios[0])} · median ${pct(ratios[ratios.length >> 1])} · max ${pct(ratios[ratios.length - 1])}`);
}

/* ── 2. Transfer budgets: the per-club split ─────────────────────────────── */
console.log('\n' + '='.repeat(96));
console.log('TRANSFER BUDGETS BY LEAGUE  (per club; the division median must stay on its startingBudget)');
console.log('='.repeat(96));

for (const lg of LEAGUES.filter((l) => !l.phantom)) {
  const peers = probe.clubs.filter((c) => c.leagueId === lg.id && !c.dormant);
  if (!peers.length) continue;

  const rows = peers
    .map((c) => ({
      name: c.name,
      source: c.budgetSource ?? 'derived',
      mult: c.budgetMultiplier ?? 1,
      budget: baseTransferBudget(probe, c),
      squad: c.playerIds.reduce((t, id) => t + (probe.players[id]?.value ?? 0), 0),
    }))
    .sort((a, b) => b.budget - a.budget);

  const med = median(rows.map((r) => r.budget));
  const base = startingBudget(lg.id);
  const fromData = rows.filter((r) => r.source === 'fc26').length;
  const drift = base > 0 ? Math.abs(med - base) / base : 0;
  console.log(
    `\n${lg.name.padEnd(24)} base ${m(base).padStart(9)} · median ${m(med).padStart(9)}` +
    ` · drift ${pct(drift).padStart(4)}${drift > 0.2 ? '  <-- CHECK' : ''} · real FC26 budgets ${fromData}/${rows.length}`
  );
  for (const r of [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]]) {
    console.log(
      `   ${r.name.padEnd(24)} x${r.mult.toFixed(2)} -> ${m(r.budget).padStart(9)}` +
      ` | squad value ${m(r.squad).padStart(9)} | ${r.source}`
    );
  }
}

/* ── 3. Wage budgets: headroom over the inherited squad ──────────────────── */
console.log('\n' + '='.repeat(96));
console.log('WAGE BUDGETS  (committed bill vs the board ceiling, one club per level)');
console.log('='.repeat(96));

for (const lgId of ['premier_league', 'championship', 'league_one', 'league_two']) {
  const peers = probe.clubs.filter((c) => c.leagueId === lgId && !c.dormant)
    .sort((a, b) => clubStature(probe, b) - clubStature(probe, a));
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

/* ── 4. Matchday: new per-fixture model vs the old flat weekly figure ────── */
console.log('\n' + '='.repeat(96));
console.log('MATCHDAY: new per-fixture model vs old flat GATE_BASE');
console.log('='.repeat(96));
{
  const plClub = data.clubs.find((c) => c.division === 1)!;
  const s = newGame(data, plClub.id, 'Preview');
  ensureFinances(s);
  const lg = getLeague(userLeagueId(s));
  const fixtures = (s.fixtures[lg.id] ?? []).filter((f) => f.homeId === s.userClubId).slice(0, 5);
  console.log(`${s.clubs.find((c) => c.id === s.userClubId)!.name} — old flat weekly gate was ~${m(lg.gateBase)}/wk over ${SEASON_ROUNDS} weeks = ${m(lg.gateBase * SEASON_ROUNDS)}/season`);
  for (const f of fixtures) {
    const opp = s.clubs.find((c) => c.id === f.awayId)!;
    const p = previewMatchIncome(s, f);
    console.log(`   R${String(f.round).padStart(2)} vs ${opp.name.padEnd(22)} matchday ${m(p.matchday).padStart(8)} + TV ${m(p.tv).padStart(8)} = ${m(p.total)}`);
  }
  console.log(`   modelled matchday season total ≈ ${m(matchdayBase(s))} (${homeGamesPerSeason(lg)} home games)`);
}

/* ── 5. Multi-season: do the budgets actually move? ──────────────────────── */
console.log('\n' + '='.repeat(96));
console.log('FIVE SIMULATED SEASONS  (budget should follow finish and division, without running away)');
console.log('='.repeat(96));

function runSeasons(clubId: number, label: string) {
  let s = newGame(data, clubId, 'Preview');
  ensureFinances(s);
  console.log(`\n--- ${label} ---`);

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
    const fin = financesView(s);
    const inc = totalSeasonIncome(fin);
    const exp = totalSeasonExpenses(fin);
    const league = getLeague(userLeagueId(s)).name;
    const closing = s.budget;

    s = endSeason(s).state;
    const pos = s.history[s.history.length - 1]?.position ?? 0;
    // `rolloverSeason` fires from the first `tickFinances` of the new season,
    // not from `endSeason`, so the board's new budgets are not readable until
    // one round has been played. Play it before printing them.
    const f = (s.fixtures[userLeagueId(s)] ?? []).find(
      (x) => x.round === s.week && (x.homeId === s.userClubId || x.awayId === s.userClubId)
    );
    if (f) s = playRound(s, simulateMatch(s, f.homeId, f.awayId));

    console.log(
      `   season ${s.seasonYear - 1} ${league.padEnd(18)} finished ${String(pos).padStart(2)}` +
      ` | income ${m(inc).padStart(9)} expenses ${m(exp).padStart(9)} profit ${m(inc - exp).padStart(9)}` +
      ` | closing balance ${m(closing).padStart(9)}`
    );
    console.log(
      `      -> ${getLeague(userLeagueId(s)).name}: transfer budget ${m(s.budget).padStart(9)}` +
      ` · wage ceiling ${m(wageBudgetStatus(s).budget).padStart(8)}/wk · board confidence ${s.board.confidence}`
    );
  }
}

runSeasons(data.clubs.find((c) => c.division === 1)!.id, 'Premier League club');
runSeasons(data.clubs.find((c) => c.division === 2)!.id, 'Championship club');
runSeasons(data.clubs.find((c) => c.division === 4)!.id, 'League Two club');
