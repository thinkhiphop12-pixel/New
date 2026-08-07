/**
 * Rebuilds scripts/fc26-source.json from the EA SPORTS FC 26 men's player
 * export (scripts/EAFC26Men.csv — one row per player, carrying that player's
 * club and the league that club plays in).
 *
 *   node scripts/build-source.mjs
 *
 * Run this when the CSV is refreshed, then `npm run build-gamedata` to turn
 * the source into the dataset the game loads.
 *
 * Why this exists: the previous fc26-source.json had every one of its top ten
 * divisions padded to a flat 24 clubs, which filed Sheffield Wednesday in the
 * Premier League, Palermo in Serie A and Rapid Wien — an Austrian club it also
 * listed under Austria — in the Bundesliga. The CSV states each club's real
 * league outright, so squad membership is read from it rather than assumed.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV = process.argv[2] ?? join(__dirname, 'EAFC26Men.csv');
const OUT = join(__dirname, 'fc26-source.json');

/* --- CSV → divisions --------------------------------------------------------
 * The CSV covers more competitions than the game simulates (second tiers,
 * continental cup squads, one-off entries for players at clubs outside these
 * leagues). Only the divisions listed here are carried into the game; the
 * numbering is the `division` field the rest of the pipeline already uses and
 * must stay in step with DIVISION_META in build-gamedata.mjs. */
const DIVISION_OF_LEAGUE = {
  'Premier League': 1,
  'EFL Championship': 2,
  'EFL League One': 3,
  'EFL League Two': 4,
  'LALIGA EA SPORTS': 5,
  'Serie A Enilive': 6,
  Bundesliga: 7,
  "Ligue 1 McDonald's": 8,
  Eredivisie: 9,
  'Liga Portugal': 10,
  '1A Pro League': 11,
  MLS: 13,
  '3F Superliga': 14,
  LPF: 15,
  'Trendyol Süper Lig': 16,
  'ROSHN Saudi League': 17,
  CSL: 18,
  'K League 1': 19,
  'PKO BP Ekstraklasa': 20,
  SUPERLIGA: 21, // Romania — distinct from Denmark's "3F Superliga" above
  Eliteserien: 22,
  Allsvenskan: 23,
  'Brack Super League': 24,
  'Ö. Bundesliga': 25,
  'Scottish Prem': 26,
  'A-League': 27,
  ISL: 28,
  'SSE Airtricity PD': 29,
};

/* Club names as the game shows them. The CSV abbreviates ("Man Utd", "QPR")
 * and, where EA holds no licence, substitutes a placeholder ("Latium" for
 * Lazio, "Lombardia FC" for Inter). Anything not listed here is used as the
 * CSV writes it. */
const DISPLAY_NAME = {
  // England
  Brighton: 'Brighton & Hove Albion',
  Fulham: 'Fulham FC',
  'Man Utd': 'Manchester United',
  'Newcastle Utd': 'Newcastle United',
  "Nott'm Forest": 'Nottingham Forest',
  Spurs: 'Tottenham Hotspur',
  'West Ham': 'West Ham United',
  Wolves: 'Wolverhampton Wanderers',
  'Charlton Ath': 'Charlton Athletic',
  Ipswich: 'Ipswich Town',
  Millwall: 'Millwall FC',
  Norwich: 'Norwich City',
  Preston: 'Preston North End',
  QPR: 'Queens Park Rangers',
  'Sheffield Utd': 'Sheffield United',
  'Sheffield Wed': 'Sheffield Wednesday',
  'West Brom': 'West Bromwich Albion',
  Blackpool: 'Blackpool FC',
  Bolton: 'Bolton Wanderers',
  Doncaster: 'Doncaster Rovers',
  Huddersfield: 'Huddersfield Town',
  Northampton: 'Northampton Town',
  Peterborough: 'Peterborough United',
  Reading: 'Reading FC',
  'Rotherham Utd': 'Rotherham United',
  Stockport: 'Stockport County',
  Wycombe: 'Wycombe Wanderers',
  Accrington: 'Accrington Stanley',
  'Bromley FC': 'Bromley',
  'Cambridge Utd': 'Cambridge United',
  Colchester: 'Colchester United',
  'MK Dons': 'Milton Keynes Dons',
  Shrewsbury: 'Shrewsbury Town',
  // Spain
  'Atlético de Madrid': 'Atlético Madrid',
  Celta: 'RC Celta',
  'D. Alavés': 'Deportivo Alavés',
  'R. Oviedo': 'Real Oviedo',
  'Real Betis': 'Real Betis Balompié',
  // Italy — the four unlicensed clubs restored to their real names
  'AS Roma': 'Roma',
  'SSC Napoli': 'Napoli',
  'Milano FC': 'AC Milan',
  'Lombardia FC': 'Inter',
  Latium: 'Lazio',
  'Bergamo Calcio': 'Atalanta',
  'Hellas Verona': 'Hellas Verona FC',
  // Germany
  Frankfurt: 'Eintracht Frankfurt',
  Heidenheim: '1. FC Heidenheim 1846',
  Leverkusen: 'Bayer 04 Leverkusen',
  "M'gladbach": 'Borussia Mönchengladbach',
  'TSG Hoffenheim': 'TSG 1899 Hoffenheim',
  'Union Berlin': '1. FC Union Berlin',
  // France
  'Havre AC': 'Le Havre AC',
  'LOSC Lille': 'Lille OSC',
  OL: 'Olympique Lyonnais',
  OM: 'Olympique de Marseille',
  'Paris SG': 'Paris Saint-Germain',
  Strasbourg: 'RC Strasbourg Alsace',
  // Netherlands
  AZ: 'AZ Alkmaar',
  'N.E.C. Nijmegen': 'NEC Nijmegen',
  PSV: 'PSV Eindhoven',
  // Portugal
  Arouca: 'FC Arouca',
  'Estrela Amadora': 'CF Estrela da Amadora',
  'Gil Vicente': 'Gil Vicente FC',
  Nacional: 'CD Nacional',
  'Santa Clara': 'CD Santa Clara',
};

/** Broad position group the engine picks lineups from. */
const POS_GROUP = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'FWD', RW: 'FWD', ST: 'FWD',
};

/** "Mohamed Salah" → "M. Salah"; single-word names are left alone. */
function shortName(full) {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full.trim();
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

/** Minimal RFC 4180 reader — the CSV quotes fields containing commas. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

if (!existsSync(CSV)) {
  console.error(`CSV not found: ${CSV}\nUsage: node scripts/build-source.mjs [path-to-EAFC26Men.csv]`);
  process.exit(1);
}

const rows = parseCsv(readFileSync(CSV, 'utf8'));
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const byClub = new Map();
for (const r of rows) {
  const division = DIVISION_OF_LEAGUE[r.League];
  if (division === undefined) continue;
  const role = POS_GROUP[r.Position] ? r.Position : null;
  if (!role) continue;
  const name = DISPLAY_NAME[r.Team] ?? r.Team;
  if (!byClub.has(name)) byClub.set(name, { name, division, players: [] });
  byClub.get(name).players.push({
    name: shortName(r.Name),
    nat: r.Nation,
    role,
    pos: POS_GROUP[role],
    // For goalkeepers the CSV fills these six columns with the keeper's own
    // ratings (diving, handling, kicking, reflexes, speed, positioning), so
    // they carry across unchanged.
    rating: num(r.OVR),
    pac: num(r.PAC), sho: num(r.SHO), pas: num(r.PAS),
    dri: num(r.DRI), def: num(r.DEF), phy: num(r.PHY),
    age: num(r.Age),
  });
}

/** Average of a club's best eleven — used only to break ties on club count. */
function strength(club) {
  const best = club.players.map((p) => p.rating).sort((a, b) => b - a).slice(0, 11);
  return best.reduce((s, r) => s + r, 0) / (best.length || 1);
}

// The round-robin scheduler only handles an even number of clubs, so a
// division with an odd count sheds its weakest side (the Indian Super
// League's eleventh club) rather than complicating the shared scheduler.
const clubs = [];
const divisions = [...new Set([...byClub.values()].map((c) => c.division))].sort((a, b) => a - b);
for (const division of divisions) {
  let inDivision = [...byClub.values()]
    .filter((c) => c.division === division)
    .sort((a, b) => strength(b) - strength(a));
  if (inDivision.length % 2 === 1) {
    const dropped = inDivision.pop();
    console.log(`  division ${division}: dropped ${dropped.name} (odd club count)`);
  }
  for (const c of inDivision) c.players.sort((a, b) => b.rating - a.rating);
  clubs.push(...inDivision);
}

// Free agents have no club and therefore no row in the club data — carry the
// existing pool across rather than inventing one.
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { freeAgents: [] };

writeFileSync(OUT, JSON.stringify({ clubs, freeAgents: previous.freeAgents ?? [] }, null, 0));
const players = clubs.reduce((s, c) => s + c.players.length, 0);
console.log(
  `fc26-source.json written: ${clubs.length} clubs, ${players} contracted players, ` +
  `${previous.freeAgents?.length ?? 0} free agents, ${divisions.length} divisions`
);
for (const d of divisions) {
  console.log(`  ${d}: ${clubs.filter((c) => c.division === d).length} clubs`);
}
