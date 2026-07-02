/**
 * Builds the game dataset from the FC 26 player database
 * (scripts/fc26-source.json — real players, ratings, ages, values and wages).
 *
 * Output: public/data/gamedata.json
 *   - 60 fictional clubs across 3 divisions (20 + 20 + 20)
 *   - each club gets a 22-man squad drawn from the player pool,
 *     tiered so Division 1 clubs are stronger than Division 2 and 3 clubs
 *   - remaining players become free agents
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'fc26-source.json');
const OUT = join(__dirname, '..', 'public', 'data', 'gamedata.json');

// Deterministic RNG so the dataset is reproducible run-to-run.
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function marketValue(rating, age) {
  const base = 50_000 * Math.pow(1.135, rating - 50);
  const ageMult = age <= 23 ? 1.35 : age <= 28 ? 1.1 : age <= 31 ? 0.8 : 0.5;
  const v = base * ageMult;
  const step = v > 20e6 ? 1e6 : v > 2e6 ? 250e3 : 50e3;
  return Math.max(100_000, Math.round(v / step) * step);
}

// Wages are scaled to the game's economy (gate receipts + prize money),
// not real-world figures — real wages would bankrupt lower-division clubs.
function weeklyWage(value, rating) {
  return Math.max(500, Math.round((value * 0.0005 + rating * 15) / 100) * 100);
}

// --- Load source players ----------------------------------------------------
const raw = JSON.parse(readFileSync(SRC, 'utf8'));
let nextId = 1;
const players = raw.map((p) => ({
  id: nextId++,
  name: p.name,
  nat: p.nat,
  pos: p.pos,
  role: p.role,
  rating: p.rating,
  pac: p.pac, sho: p.sho, pas: p.pas, dri: p.dri, def: p.def, phy: p.phy,
  age: p.age,
  value: p.value ?? marketValue(p.rating, p.age),
  wage: weeklyWage(p.value ?? marketValue(p.rating, p.age), p.rating),
}));

// --- Clubs ------------------------------------------------------------------
const CLUB_DEFS = [
  // Division 1 (strongest first — squad strength follows list order)
  ['Northbridge City', 'NBC', '#38bdf8'], ['Kings Vale', 'KVA', '#a78bfa'],
  ['Redhill United', 'RHU', '#f87171'], ['Iron Harbour', 'IRH', '#94a3b8'],
  ['Westgate Albion', 'WGA', '#fbbf24'], ['Silverlake FC', 'SLK', '#e2e8f0'],
  ['Old Quarry Rovers', 'OQR', '#34d399'], ['Marble Arch FC', 'MAR', '#f472b6'],
  ['Eastport Rangers', 'EPR', '#60a5fa'], ['Blackmoor Town', 'BMT', '#4b5563'],
  ['Goldcrest FC', 'GLD', '#f5b301'], ['Riverforge United', 'RFU', '#fb923c'],
  ['Saint Aldan FC', 'ALD', '#2dd4bf'], ['Whitefield Wanderers', 'WFW', '#d1d5db'],
  ['Copper Hill FC', 'CPH', '#d97706'], ['Northgate County', 'NGC', '#84cc16'],
  ['Bluewater FC', 'BLW', '#3b82f6'], ['Foxglove Athletic', 'FXA', '#e879f9'],
  ['Stonebridge FC', 'STB', '#a8a29e'], ['Merrivale FC', 'MRV', '#22c55e'],
  // Division 2
  ['Ashcombe Town', 'ASH', '#a3e635'], ['Harborview FC', 'HRV', '#38bdf8'],
  ['Duncrag Celtic', 'DUN', '#16a34a'], ['Millbrook Athletic', 'MLB', '#fca5a5'],
  ['Seaton Villa', 'SEA', '#7dd3fc'], ['Wrenfield FC', 'WRN', '#c084fc'],
  ['Oakhurst United', 'OAK', '#b45309'], ['Pinemount SC', 'PIN', '#4ade80'],
  ['Lantern Bay FC', 'LTB', '#fde047'], ['Cinder Park FC', 'CIN', '#f87171'],
  ['Thornbury FC', 'THN', '#86efac'], ['Grange Moor FC', 'GRM', '#93c5fd'],
  ['Violet Cross', 'VLC', '#8b5cf6'], ['Saltmarsh Town', 'SLT', '#67e8f9'],
  ['Kestrel Heath', 'KES', '#f59e0b'], ['Bramblegate FC', 'BRG', '#dc2626'],
  ['Ivorydale FC', 'IVY', '#fef3c7'], ['Cloverfield SC', 'CLV', '#22c55e'],
  ['Hollowbrook FC', 'HLB', '#a1a1aa'], ['Wintermere FC', 'WNT', '#e0f2fe'],
  // Division 3
  ['Alderton Rovers', 'ALR', '#fb7185'], ['Beacon Point FC', 'BPT', '#fbbf24'],
  ['Cragside United', 'CRG', '#94a3b8'], ['Dunwich Town', 'DNW', '#38bdf8'],
  ['Elmswell FC', 'ELM', '#4ade80'], ['Fernhollow SC', 'FRN', '#22d3ee'],
  ['Gorseland FC', 'GRS', '#facc15'], ['Heathrow Vale', 'HTV', '#c084fc'],
  ['Ironwick Colliery', 'IWC', '#f97316'], ['Juniper Green FC', 'JNP', '#34d399'],
  ['Kilnbrook FC', 'KLN', '#f87171'], ['Larkfield Athletic', 'LRK', '#a3e635'],
  ['Mosswood Rangers', 'MSW', '#10b981'], ['Netherby FC', 'NTB', '#60a5fa'],
  ['Ottersfield FC', 'OTF', '#78716c'], ['Peverell Town', 'PVL', '#e879f9'],
  ['Quarrington FC', 'QRT', '#a8a29e'], ['Rushmoor Albion', 'RSH', '#2dd4bf'],
  ['Sablewick FC', 'SBW', '#8b5cf6'], ['Tarnside FC', 'TRN', '#fca5a5'],
];

const SQUAD_SHAPE = { GK: 3, DEF: 7, MID: 7, FWD: 5 }; // 22 players

// Deal each position group to clubs in strength order, with a small seeded
// shuffle inside rating bands so squads aren't perfectly monotonic.
const rand = mulberry32(hashStr('ballknw-football-manager-v2'));
const byGroup = { GK: [], DEF: [], MID: [], FWD: [] };
for (const p of players) byGroup[p.pos].push(p);
for (const group of Object.keys(byGroup)) {
  byGroup[group].sort((a, b) => b.rating - a.rating);
  const arr = byGroup[group];
  for (let i = 0; i < arr.length; i += 8) {
    const win = arr.slice(i, i + 8);
    for (let j = win.length - 1; j > 0; j--) {
      const k = Math.floor(rand() * (j + 1));
      [win[j], win[k]] = [win[k], win[j]];
    }
    arr.splice(i, win.length, ...win);
  }
}

const clubs = CLUB_DEFS.map(([name, code, color], i) => ({
  id: i + 1,
  name,
  code,
  color,
  division: i < 20 ? 1 : i < 40 ? 2 : 3,
  playerIds: [],
}));

// Block-deal: club 1 gets the strongest block of each position group, club 60
// the weakest, so the leagues have real tiers (title contenders vs strugglers).
for (const [group, want] of Object.entries(SQUAD_SHAPE)) {
  const pool = byGroup[group];
  for (let c = 0; c < clubs.length; c++) {
    for (const player of pool.slice(c * want, (c + 1) * want)) {
      player.clubId = clubs[c].id;
      clubs[c].playerIds.push(player.id);
    }
  }
}

// Everyone not assigned to a club becomes a free agent (cheap signings).
const assigned = players.filter((p) => p.clubId);
const freeAgents = players.filter((p) => !p.clubId).map((p) => ({ ...p, clubId: 0 }));

const out = {
  meta: {
    built: new Date().toISOString().slice(0, 10),
    attribution:
      'Player pool: FC 26 player database (EA Sports FC 26 ratings, ages, values and wages). Clubs are fictional.',
    clubCount: clubs.length,
    playerCount: assigned.length + freeAgents.length,
  },
  clubs,
  players: [...assigned, ...freeAgents],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
const sizeKb = Math.round(JSON.stringify(out).length / 1024);
console.log(
  `gamedata.json written: ${clubs.length} clubs, ${assigned.length} contracted players, ${freeAgents.length} free agents (${sizeKb} KB)`
);
