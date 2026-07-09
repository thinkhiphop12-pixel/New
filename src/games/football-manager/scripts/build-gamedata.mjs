/**
 * Builds the game dataset from the FC 26 player database
 * (scripts/fc26-source.json — real clubs with their real squads).
 *
 * Output: public/data/gamedata.json
 *   - 60 real clubs across 3 divisions (Premier League, Championship, League One)
 *   - each club carries its actual FC 26 roster (up to 24 players)
 *   - real clubless players become free agents
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'fc26-source.json');
const OUT = join(__dirname, '..', 'public', 'data', 'gamedata.json');

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

function addPlayer(p, clubId) {
  const value = p.value ?? marketValue(p.rating, p.age);
  players.push({
    id: nextId++,
    name: p.name,
    nat: p.nat,
    pos: p.pos,
    role: p.role,
    rating: p.rating,
    pac: p.pac, sho: p.sho, pas: p.pas, dri: p.dri, def: p.def, phy: p.phy,
    age: p.age,
    value,
    wage: weeklyWage(value, p.rating),
    clubId,
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
  for (const p of c.players) club.playerIds.push(addPlayer(p, club.id));
  clubs.push(club);
}
for (const p of raw.freeAgents) addPlayer(p, 0);

const out = {
  meta: {
    built: new Date().toISOString().slice(0, 10),
    attribution:
      'Player and club data: FC 26 player database (EA Sports FC 26 ratings). Real squads across 8 leagues — the English pyramid (Premier League, Championship, League One, League Two) plus La Liga, Serie A, Bundesliga and Ligue 1.',
    clubCount: clubs.length,
    playerCount: players.length,
  },
  clubs,
  players,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
const sizeKb = Math.round(JSON.stringify(out).length / 1024);
console.log(
  `gamedata.json written: ${clubs.length} clubs, ${players.length - raw.freeAgents.length} contracted players, ${raw.freeAgents.length} free agents (${sizeKb} KB)`
);
