/**
 * Builds the game dataset from the FC 26 player database
 * (scripts/fc26-source.json — real clubs with their real squads).
 *
 * Output: public/data/gamedata.json
 *   - 500+ real clubs across 27 divisions/leagues: the English pyramid
 *     (tiers 1-4), La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie,
 *     Primeira Liga, plus Belgium, MLS, Denmark, Argentina, Turkey, Saudi
 *     Arabia, China, South Korea, Poland, Romania, Norway, Sweden,
 *     Switzerland, Austria, Scotland, Australia, India and Ireland
 *   - each club carries its actual FC 26 roster
 *   - real clubless players become free agents
 *   - a `leagues[]` block with a derived strength rating per league
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'fc26-source.json');
const OUT = join(__dirname, '..', 'public', 'data', 'gamedata.json');

/* Deterministic PRNG (mulberry32) — regenerating the dataset must produce the
 * same file, otherwise every rebuild churns gamedata.json and invalidates saves. */
let _seed = 0x9e3779b9;
function rnd() {
  _seed |= 0;
  _seed = (_seed + 0x6d2b79f5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
/** Inclusive integer in [lo, hi]. */
function rand(lo, hi) {
  return lo + Math.floor(rnd() * (hi - lo + 1));
}

/* --- Derived player fields (ported from their data.js / players.js) -------- */

/** Realistic remaining headroom above current ability, banded by age — not by
 *  current quality, so a low-rated teen still has real upside. Hits a hard 0 at
 *  30: development is over, only decline is left. (their generatePlayer potGap) */
function potentialFor(rating, age) {
  const gap =
    age >= 30 ? 0
      : age <= 17 ? rand(12, Math.round((44 - age) * 1.1))
      : age <= 19 ? rand(12, 24)
      : age <= 21 ? rand(10, 20)
      : age <= 23 ? rand(6, 15)
      : age <= 25 ? rand(3, 10)
      : age <= 27 ? rand(1, 6)
      : rand(0, 3); // 28–29: fading, occasionally still a point or two
  return Math.min(99, rating + gap);
}

/** Height in cm, varying loosely by position (GKs/CBs tall, wide players shorter). */
function heightFor(pos, role) {
  if (pos === 'GK') return rand(185, 200);
  if (pos === 'DEF') return role === 'CB' ? rand(180, 196) : rand(172, 186);
  if (pos === 'MID') return rand(168, 190);
  return rand(166, 192);
}

/** Secondary positions: ~1 in 4 players covers one related role naturally.
 *  Pools skip roles our position fit already treats as synonyms. */
const ALT_POS_POOLS = {
  CB: ['CDM', 'RB', 'LB'],
  RB: ['CB', 'RM', 'LB'], LB: ['CB', 'LM', 'RB'],
  CDM: ['CB', 'CAM'], CM: ['LM', 'RM'],
  CAM: ['LW', 'RW', 'ST'],
  LM: ['LW', 'LB'], RM: ['RW', 'RB'],
  LW: ['RW', 'ST', 'CAM'], RW: ['LW', 'ST', 'CAM'],
  ST: ['LW', 'RW', 'CAM'],
};
function altPosFor(role) {
  const pool = ALT_POS_POOLS[role] ?? [];
  return pool.length && rand(0, 99) < 25 ? [pool[rand(0, pool.length - 1)]] : [];
}

/** Keeper-specific attributes; outfield players carry low filler values. */
function gkAttrs(pos, rating) {
  if (pos !== 'GK') return { gkReflexes: rand(5, 20), gkPositioning: rand(5, 20) };
  const sc = () => Math.max(10, Math.min(99, rating + rand(-4, 5)));
  return { gkReflexes: sc(), gkPositioning: sc() };
}

/** Release clauses are common in Spain (division 5 = La Liga here) and for
 *  highly-rated young players everywhere. A clause sits ABOVE market value —
 *  it's an escape hatch, not a discount. Rates and multipliers are theirs. */
function seedReleaseClause(rating, potential, age, value, division) {
  const spanish = division === 5;
  const prospect = age <= 23 && potential - rating >= 6;
  const chance = spanish ? 0.55 : prospect ? 0.2 : rating >= 80 ? 0.12 : 0.05;
  if (rnd() > chance) return 0;
  const mult = spanish ? 1.7 + rnd() * 1.6 : 1.5 + rnd() * 1.2;
  return Math.round((value * mult) / 100_000) * 100_000;
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

/** Kit colours for well-known clubs; everyone else cycles a palette. */
const CLUB_COLORS = {
  Arsenal: '#ef4444', Liverpool: '#dc2626', 'Manchester City': '#7dd3fc',
  'Manchester United': '#f87171', Chelsea: '#3b82f6', 'Tottenham Hotspur': '#e2e8f0',
  'Newcastle United': '#94a3b8', 'Aston Villa': '#a78bfa', 'West Ham United': '#b45309',
  Everton: '#2563eb', 'Brighton & Hove Albion': '#60a5fa', 'Crystal Palace': '#818cf8',
  Fulham: '#d1d5db', Brentford: '#fb7185', Wolverhampton: '#f59e0b', Burnley: '#9f1239',
  'Leeds United': '#fde047', Sunderland: '#f87171', 'Nottingham Forest': '#ef4444',
  'AFC Bournemouth': '#dc2626', 'Leicester City': '#3b82f6', Southampton: '#ef4444',
  'Sheffield United': '#f43f5e', 'West Bromwich Albion': '#1d4ed8', Middlesbrough: '#ef4444',
  'Norwich City': '#facc15', 'Coventry City': '#38bdf8', 'Birmingham City': '#60a5fa',
  Wrexham: '#ef4444', 'Ipswich Town': '#2563eb',
};
const PALETTE = ['#38bdf8', '#a78bfa', '#f87171', '#94a3b8', '#fbbf24', '#34d399', '#f472b6', '#60a5fa', '#84cc16', '#2dd4bf', '#fb923c', '#e879f9', '#22c55e', '#67e8f9', '#f59e0b', '#c084fc'];

const STOP = new Set(['AFC', 'FC', 'CITY', 'UNITED', 'TOWN', 'HOVE', 'AND', '&']);
function clubCode(name) {
  const words = name.replace(/[&.]/g, '').split(/\s+/).filter(Boolean);
  const main = words.filter((w) => !STOP.has(w.toUpperCase()));
  const base = (main[0] ?? words[0]).toUpperCase();
  if (words.length > 1) {
    const tail = words[words.length - 1].toUpperCase();
    return (base.slice(0, 2) + tail[0]).slice(0, 3);
  }
  return base.slice(0, 3);
}

// --- Load source ------------------------------------------------------------
const raw = JSON.parse(readFileSync(SRC, 'utf8'));
let nextId = 1;
const players = [];
const clubs = [];
const seenCodes = new Set();

function addPlayer(p, clubId, division) {
  const value = p.value ?? marketValue(p.rating, p.age);
  const potential = potentialFor(p.rating, p.age);
  players.push({
    id: nextId++,
    name: p.name,
    nat: p.nat,
    pos: p.pos,
    role: p.role,
    rating: p.rating,
    potential,
    pac: p.pac, sho: p.sho, pas: p.pas, dri: p.dri, def: p.def, phy: p.phy,
    ...gkAttrs(p.pos, p.rating),
    height: heightFor(p.pos, p.role),
    altPos: altPosFor(p.role),
    age: p.age,
    value,
    wage: weeklyWage(value, p.rating),
    clubId,
    releaseClause: seedReleaseClause(p.rating, potential, p.age, value, division),
    loyal: rand(0, 99) < 60,
    // Rolled once here and persisted, rather than lazily at first use, so a
    // squad's retirement profile is fixed for the whole career.
    retireAge: 35 + Math.round(Math.pow(rnd(), 1.5) * (p.pos === 'GK' ? 12 : 8)),
  });
  return nextId - 1;
}

for (const [i, c] of raw.clubs.entries()) {
  const base = clubCode(c.name);
  let code = base;
  // Resolve collisions deterministically: cycle the third character through
  // A–Z then 0–9 until unique (guaranteed to terminate for any club count).
  const suffixes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let k = 0; seenCodes.has(code); k++) {
    code = base.slice(0, 2) + suffixes[k % suffixes.length];
    if (k >= suffixes.length) code = base.slice(0, 1) + suffixes[Math.floor(k / suffixes.length) % suffixes.length] + suffixes[k % suffixes.length];
  }
  seenCodes.add(code);
  const club = {
    id: i + 1,
    name: c.name,
    code,
    color: CLUB_COLORS[c.name] ?? PALETTE[i % PALETTE.length],
    division: c.division,
    playerIds: [],
  };
  for (const p of c.players) club.playerIds.push(addPlayer(p, club.id, club.division));
  clubs.push(club);
}
for (const p of raw.freeAgents) addPlayer(p, 0, 0);

// --- League strength ratings -------------------------------------------
// Derived (not fetched) from the FC 26 ratings already in this dataset:
// each club's strength is the average rating of its best 11 players, and
// each league's strength is the average of its clubs' strengths. This gives
// every league present in fc26-source.json a comparable 0-99 rating without
// needing a live external rankings feed.
const DIVISION_META = {
  1: { id: 'premier_league', name: 'Premier League', country: 'England' },
  2: { id: 'championship', name: 'Championship', country: 'England' },
  3: { id: 'league_one', name: 'League One', country: 'England' },
  4: { id: 'league_two', name: 'League Two', country: 'England' },
  5: { id: 'la_liga', name: 'La Liga', country: 'Spain' },
  6: { id: 'serie_a', name: 'Serie A', country: 'Italy' },
  7: { id: 'bundesliga', name: 'Bundesliga', country: 'Germany' },
  8: { id: 'ligue_1', name: 'Ligue 1', country: 'France' },
  9: { id: 'eredivisie', name: 'Eredivisie', country: 'Netherlands' },
  10: { id: 'primeira_liga', name: 'Primeira Liga', country: 'Portugal' },
  11: { id: 'pro_league', name: 'Pro League', country: 'Belgium' },
  13: { id: 'mls', name: 'MLS', country: 'United States' },
  14: { id: 'superliga', name: 'Superliga', country: 'Denmark' },
  15: { id: 'argentina_lpf', name: 'Liga Profesional', country: 'Argentina' },
  16: { id: 'super_lig', name: 'Süper Lig', country: 'Turkey' },
  17: { id: 'saudi_pro_league', name: 'Saudi Pro League', country: 'Saudi Arabia' },
  18: { id: 'chinese_super_league', name: 'Chinese Super League', country: 'China' },
  19: { id: 'k_league_1', name: 'K League 1', country: 'South Korea' },
  20: { id: 'ekstraklasa', name: 'Ekstraklasa', country: 'Poland' },
  21: { id: 'liga_1_romania', name: 'Superliga', country: 'Romania' },
  22: { id: 'eliteserien', name: 'Eliteserien', country: 'Norway' },
  23: { id: 'allsvenskan', name: 'Allsvenskan', country: 'Sweden' },
  24: { id: 'swiss_super_league', name: 'Swiss Super League', country: 'Switzerland' },
  25: { id: 'austrian_bundesliga', name: 'Austrian Bundesliga', country: 'Austria' },
  26: { id: 'scottish_premiership', name: 'Scottish Premiership', country: 'Scotland' },
  27: { id: 'a_league_men', name: 'A-League Men', country: 'Australia' },
  28: { id: 'indian_super_league', name: 'Indian Super League', country: 'India' },
  29: { id: 'league_of_ireland_premier', name: 'Premier Division', country: 'Ireland' },
};

function clubStrength(club) {
  const ratings = club.playerIds
    .map((id) => players.find((p) => p.id === id).rating)
    .sort((a, b) => b - a)
    .slice(0, 11);
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

const leagues = Object.entries(DIVISION_META)
  .map(([divisionStr, meta]) => {
    const division = Number(divisionStr);
    const divisionClubs = clubs.filter((c) => c.division === division);
    if (!divisionClubs.length) return null;
    const strengths = divisionClubs.map(clubStrength);
    const rating = strengths.reduce((sum, s) => sum + s, 0) / strengths.length;
    const playerCount = divisionClubs.reduce((sum, c) => sum + c.playerIds.length, 0);
    return {
      id: meta.id,
      name: meta.name,
      country: meta.country,
      division,
      clubCount: divisionClubs.length,
      playerCount,
      rating: Math.round(rating * 10) / 10,
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.rating - a.rating)
  .map((l, i) => ({ rank: i + 1, ...l }));

const out = {
  meta: {
    built: new Date().toISOString().slice(0, 10),
    attribution:
      'Player and club data: FC 26 player database (EA Sports FC 26 ratings). Real squads across 27 leagues — the English pyramid (Premier League, Championship, League One, League Two), La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, Primeira Liga, Pro League, MLS, Superliga, Liga Profesional, Süper Lig, Saudi Pro League, Chinese Super League, K League 1, Ekstraklasa, Superliga (Romania), Eliteserien, Allsvenskan, Swiss Super League, Austrian Bundesliga, Scottish Premiership, A-League Men, Indian Super League and the League of Ireland Premier Division. League ratings are derived from squad ratings, not an external feed.',
    clubCount: clubs.length,
    playerCount: players.length,
  },
  leagues,
  clubs,
  players,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
const sizeKb = Math.round(JSON.stringify(out).length / 1024);
console.log(
  `gamedata.json written: ${clubs.length} clubs, ${players.length - raw.freeAgents.length} contracted players, ${raw.freeAgents.length} free agents, ${leagues.length} leagues ranked (${sizeKb} KB)`
);
