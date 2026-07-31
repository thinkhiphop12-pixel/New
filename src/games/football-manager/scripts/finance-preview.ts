/**
 * Phase 8 finance preview — prints real numbers instead of trusting the model.
 *
 *   npx tsx scripts/finance-preview.ts
 *
 * Four things must look right here before the model is worth shipping:
 *   1. Sponsor offers scale sensibly by league level and club stature.
 *   2. The new matchday model is in the same ballpark as the old flat
 *      GATE_BASE income it replaces (no silent 10x cash-flow change).
 *   3. Squad cost ratios sit in a live band — a well-run club comfortably
 *      under 0.70, a reckless one over it — rather than pinned at 0.05 or 2.0.
 *   4. FFP and the SCR embargo actually fire, and actually clear again.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameData, GameState, Club } from '../engine/types';
import { newGame, playRound, seasonOver, endSeason, computeTable, userLeagueId } from '../engine/seasonProgression';
import { simulateMatch } from '../engine/matchSimulation';
import { LEAGUES, SEASON_ROUNDS, getLeague } from '../engine/gameRules';
import {
  annualFootballRevenue, clubStature, economyScale, ensureFinances, ffpStatus, financesView,
  genSponsorOffers, matchdayBase, scrStatus, sponsorMarketAnnual, tvIncomeAnnual, weeklyCommercial,
  totalSeasonIncome, totalSeasonExpenses, homeGamesPerSeason, previewMatchIncome, SPONSOR_SLOTS,
  recordTransferExpense, applyPointsDeductions,
} from '../engine/finances';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data: GameData = JSON.parse(
  readFileSync(join(__dirname, '..', 'public', 'data', 'gamedata.json'), 'utf8')
);

const m = (v: number) => (Math.abs(v) >= 1e6 ? `£${(v / 1e6).toFixed(2)}m` : `£${Math.round(v / 1000)}k`);
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

function squadWageAnnual(s: GameState, club: Club): number {
  return club.playerIds.reduce((t, id) => t + (s.players[id]?.wage ?? 0), 0) * 52;
}

/* ── 1. Revenue and SCR across every league, every club ──────────────────── */
console.log('='.repeat(96));
console.log('REVENUE MODEL BY LEAGUE  (annual, user-club basis; "old gate" = previous flat GATE_BASE season total)');
console.log('='.repeat(96));

for (const lg of LEAGUES.filter((l) => !l.phantom)) {
  const seed = data.clubs.find((c) => c.division === LEAGUES.indexOf(lg) + 1);
  // Pick a real club in this league via a throwaway game so stature is live.
  const anyClub = data.clubs.find((c) => c.division != null);
  if (!seed && !anyClub) continue;

  const probe = newGame(data, data.clubs[0].id, 'Preview');
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
        shirt: sponsorMarketAnnual(s, c),
        commercial: weeklyCommercial(financesView(s)) * 52,
        rev,
        wages,
        scr: wages / rev,
      };
    })
    .sort((a, b) => b.rev - a.rev);

  for (const r of [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]]) {
    console.log(
      `   ${r.name.padEnd(22)} stature ${r.stature.toFixed(2)}` +
      ` | matchday ${m(r.md).padStart(8)} | TV ${m(r.tv).padStart(8)}` +
      ` | shirt mkt ${m(r.shirt).padStart(8)} | signed comm. ${m(r.commercial).padStart(8)}` +
      ` | revenue ${m(r.rev).padStart(8)} | wages ${m(r.wages).padStart(8)} | SCR ${pct(r.scr).padStart(5)}`
    );
  }
  const scrs = rows.map((r) => r.scr).sort((a, b) => a - b);
  const overLimit = scrs.filter((v) => v > 0.70).length;
  console.log(`  SCR spread: min ${pct(scrs[0])} · median ${pct(scrs[scrs.length >> 1])} · max ${pct(scrs[scrs.length - 1])} · over 70%: ${overLimit}/${scrs.length}`);
}

/* ── 2. Sponsor offers by league and stature ─────────────────────────────── */
console.log('\n' + '='.repeat(96));
console.log('SPONSOR OFFERS BY SLOT  (three competing offers, one club per level)');
console.log('='.repeat(96));

for (const lgId of ['premier_league', 'championship', 'league_one', 'league_two']) {
  const probe = newGame(data, data.clubs[0].id, 'Preview');
  const peers = probe.clubs.filter((c) => c.leagueId === lgId && !c.dormant)
    .sort((a, b) => clubStature(probe, b) - clubStature(probe, a));
  for (const club of [peers[0], peers[peers.length - 1]]) {
    const s = { ...probe, userClubId: club.id } as GameState;
    s.finances = undefined;
    ensureFinances(s);
    console.log(`\n${getLeague(lgId).name} — ${club.name} (stature ${clubStature(s, club).toFixed(2)}, market ${m(sponsorMarketAnnual(s, club))}/yr)`);
    for (const slot of ['shirt', 'sleeve', 'stadium'] as const) {
      const offers = genSponsorOffers(s, slot);
      console.log(
        `   ${SPONSOR_SLOTS[slot].label.padEnd(23)} ` +
        offers.map((o) => `${o.termSeasons}yr ${m(o.weeklyValue * 52)}/season`).join('  |  ')
      );
    }
  }
}

/* ── 3. Matchday: new per-fixture model vs the old flat weekly figure ────── */
console.log('\n' + '='.repeat(96));
console.log('MATCHDAY: new per-fixture model vs old flat GATE_BASE');
console.log('='.repeat(96));
{
  const plClub = data.clubs.find((c) => c.division === 1)!;
  const s = newGame(data, plClub.id, 'Preview');
  ensureFinances(s);
  const lg = getLeague(userLeagueId(s));
  const fixtures = (s.fixtures[lg.id] ?? []).filter(
    (f) => f.homeId === s.userClubId
  ).slice(0, 5);
  console.log(`${s.clubs.find((c) => c.id === s.userClubId)!.name} — old flat weekly gate was ~${m(lg.gateBase)}/wk over ${SEASON_ROUNDS} weeks = ${m(lg.gateBase * SEASON_ROUNDS)}/season`);
  for (const f of fixtures) {
    const opp = s.clubs.find((c) => c.id === f.awayId)!;
    const p = previewMatchIncome(s, f);
    console.log(`   R${String(f.round).padStart(2)} vs ${opp.name.padEnd(22)} matchday ${m(p.matchday).padStart(8)} + TV ${m(p.tv).padStart(8)} = ${m(p.total)}`);
  }
  console.log(`   modelled matchday season total ≈ ${m(matchdayBase(s) )} (${homeGamesPerSeason(lg)} home games)`);
}

/* ── 4. Multi-season simulation: does FFP/SCR actually fire and clear? ───── */
console.log('\n' + '='.repeat(96));
console.log('FIVE SIMULATED SEASONS');
console.log('='.repeat(96));

function runSeasons(clubId: number, label: string, wreckIt: boolean) {
  let s = newGame(data, clubId, 'Preview');
  ensureFinances(s);
  console.log(`\n--- ${label}${wreckIt ? ' [deliberately reckless: heavy transfer amortization each season]' : ''} ---`);
  let embargoSeen = false;
  let embargoLifted = false;
  let ffpDeducted = false;

  for (let season = 0; season < 5; season++) {
    if (wreckIt) {
      // Simulate a manager who spends everything on fees every summer: this is
      // what should drag the squad cost ratio over the limit.
      const rev = annualFootballRevenue(s);
      recordTransferExpense(s, Math.round(rev * 1.5), 3);
    }
    while (!seasonOver(s)) {
      const f = (s.fixtures[userLeagueId(s)] ?? []).find(
        (x) => x.round === s.week && (x.homeId === s.userClubId || x.awayId === s.userClubId)
      );
      const report = f
        ? simulateMatch(s, f.homeId, f.awayId)
        : simulateMatch(s, s.userClubId, s.clubs.find((c) => c.id !== s.userClubId)!.id);
      s = playRound(s, report);
      const fin = financesView(s);
      if (fin.transferEmbargo) embargoSeen = true;
      else if (embargoSeen) embargoLifted = true;
      if (fin.pointsDeduction > 0 && !ffpDeducted) {
        ffpDeducted = true;
        const table = applyPointsDeductions(s, computeTable(s, userLeagueId(s)));
        const row = table.find((r) => r.clubId === s.userClubId)!;
        console.log(`   ! week ${s.week}: ${fin.pointsDeduction} points deducted — table pts now ${row.pts}`);
      }
    }
    const fin = financesView(s);
    const scr = scrStatus(s, fin);
    const ffp = ffpStatus(s, fin);
    const inc = totalSeasonIncome(fin);
    const exp = totalSeasonExpenses(fin);
    console.log(
      `   season ${s.seasonYear} ${getLeague(userLeagueId(s)).name.padEnd(18)}` +
      ` income ${m(inc).padStart(9)} expenses ${m(exp).padStart(9)} profit ${m(inc - exp).padStart(9)}` +
      ` | balance ${m(s.budget).padStart(9)} | SCR ${pct(scr.scr).padStart(5)}${scr.embargo ? ' EMBARGO' : ''}` +
      ` | FFP ${ffp.label} (${m(ffp.rolling)} vs ${m(ffp.limit)})`
    );
    console.log(
      `      income mix — TV ${m(fin.seasonIncome.tv)}, matchday ${m(fin.seasonIncome.matchday)},` +
      ` commercial ${m(fin.seasonIncome.sponsorship)}, merch ${m(fin.seasonIncome.merchandise)},` +
      ` prizes ${m(fin.seasonIncome.prizes)}, sales ${m(fin.seasonIncome.sales)}`
    );
    s = endSeason(s).state;
  }
  console.log(`   embargo fired: ${embargoSeen} · embargo lifted again: ${embargoLifted} · points deducted: ${ffpDeducted}`);
}

runSeasons(data.clubs.find((c) => c.division === 1)!.id, 'Premier League club, run sensibly', false);
runSeasons(data.clubs.find((c) => c.division === 2)!.id, 'Championship club, run sensibly', false);
runSeasons(data.clubs.find((c) => c.division === 4)!.id, 'League Two club, run sensibly', false);
runSeasons(data.clubs.find((c) => c.division === 2)!.id, 'Championship club, run recklessly', true);

console.log('\nDone.');
