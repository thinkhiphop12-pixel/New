import { readFileSync } from 'node:fs';
import type { GameData } from '../engine/types';
import { newGame } from '../engine/seasonProgression';
import { clubBudget } from '../engine/jobMarket';
import { wageCeiling, clubWageBill } from '../engine/teamManagement';
import { scrStatus, ensureFinances, clubFootballRevenue } from '../engine/finances';
import { askingPrice } from '../engine/transferMarket';
import { MONEY_SCALE } from '../engine/utils';
const data: GameData = JSON.parse(readFileSync('public/data/gamedata.json', 'utf8'));
const club = data.clubs.find((c) => c.name === 'Arsenal')!;
const s = newGame(data, club.id, 'T'); ensureFinances(s);
const c = s.clubs.find((x) => x.id === club.id)!;
const rev = clubFootballRevenue(s, c);
const elite = Object.values(s.players).filter((p) => p.rating >= 85 && p.rating <= 89).map(askingPrice).sort((a,b)=>a-b);
const medElite = elite[elite.length >> 1];
const r = (n: number) => n.toFixed(4);
console.log(JSON.stringify({
  scale: MONEY_SCALE,
  budget_over_revenue: r(clubBudget(s, c.id) / rev),
  wagebill_over_revenue: r(clubWageBill(s, s.userClubId) * 52 / rev),
  ceiling_over_bill: r(wageCeiling(s) / clubWageBill(s, s.userClubId)),
  scr: r(scrStatus(s).scr),
  budget_in_elite_players: r(clubBudget(s, c.id) / medElite),
}));
