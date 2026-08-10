/**
 * Rebuilds scripts/fc26-source.json from the FC 26 player database export
 * (scripts/FC26Players.csv — one row per player, sofifa-style: real names,
 * clubs, leagues, contracts, wages, transfer values and release clauses).
 *
 *   node scripts/build-source.mjs
 *
 * Run this when the CSV is refreshed, then `npm run build-gamedata` to turn
 * the source into the dataset the game loads.
 *
 * Unlike the old EA-site scrape this pipeline used to run on, this export
 * carries real financial and contract data (value_eur, wage_eur,
 * release_clause_eur, club_contract_valid_until_year) alongside the usual
 * ratings, so those are carried through too — see build-gamedata.mjs and
 * engine/finances.ts for how the game turns them into in-game figures
 * without breaking its own (deliberately non-real-world) wage economy.
 *
 * League names collide across countries (Belgium and Saudi Arabia are both
 * "Pro League"; Switzerland, China and India are all "Super League" in this
 * export), so club-to-division membership is keyed on the CSV's numeric
 * `league_id`, not `league_name`. The IDs below were identified by cross-
 * checking each id's member clubs against real rosters.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV = process.argv[2] ?? join(__dirname, 'FC26Players.csv');
const OUT = join(__dirname, 'fc26-source.json');

/* Must stay in sync with MONEY_SCALE in engine/utils.ts. Real money from the
 * CSV is written here on the *base* economy (divided down by this factor) so
 * that engine/seasonProgression.ts newGame(), which multiplies player value
 * and release clause by MONEY_SCALE on load, restores the real-world figure. */
const MONEY_SCALE = 12;

/* --- CSV → divisions --------------------------------------------------------
 * Numbering matches DIVISION_META in build-gamedata.mjs, which it must stay
 * in step with. Only these divisions are carried into the game; every other
 * league in the CSV (second-tier/reserve competitions we don't simulate,
 * countries we don't cover) is skipped. */
const DIVISION_OF_LEAGUE_ID = {
  13: 1, // Premier League (England)
  14: 2, // Championship
  60: 3, // League One
  61: 4, // League Two
  53: 5, // La Liga (Spain)
  31: 6, // Serie A (Italy)
  19: 7, // Bundesliga (Germany)
  16: 8, // Ligue 1 (France)
  10: 9, // Eredivisie (Netherlands)
  308: 10, // Primeira Liga (Portugal)
  4: 11, // Pro League (Belgium)
  39: 13, // MLS (United States)
  1: 14, // Superliga (Denmark)
  353: 15, // Liga Profesional de Fútbol (Argentina)
  68: 16, // Süper Lig (Turkey)
  350: 17, // Pro League (Saudi Arabia)
  2012: 18, // Super League (China)
  83: 19, // K League 1 (South Korea)
  66: 20, // Ekstraklasa (Poland)
  330: 21, // Liga I (Romania)
  41: 22, // Eliteserien (Norway)
  56: 23, // Allsvenskan (Sweden)
  189: 24, // Super League (Switzerland)
  80: 25, // Bundesliga (Austria)
  50: 26, // Premiership (Scotland)
  351: 27, // A-League Men (Australia)
  2149: 28, // Super League (India — labelled plain "Super League" in this export)
  65: 29, // Premier Division (Ireland)
};

/** Broad position group the engine picks lineups from. */
const POS_GROUP = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'FWD', RW: 'FWD', ST: 'FWD',
};

/** Side-specific slots collapse onto the role the engine actually models. */
const NORMALIZE_POS = {
  LCB: 'CB', RCB: 'CB',
  LS: 'ST', RS: 'ST',
  LCM: 'CM', RCM: 'CM',
  LDM: 'CDM', RDM: 'CDM',
  LAM: 'CAM', RAM: 'CAM',
};
function normalizePos(tok) {
  const t = (tok ?? '').trim();
  return NORMALIZE_POS[t] ?? t;
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
  console.error(`CSV not found: ${CSV}\nUsage: node scripts/build-source.mjs [path-to-FC26Players.csv]`);
  process.exit(1);
}

const rows = parseCsv(readFileSync(CSV, 'utf8'));

/** Own-property lookup so CSV text can never read an inherited key (e.g. "constructor"). */
const getOwn = (obj, key) => (Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined);

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
/** Like `num`, but a blank/unparseable field stays absent rather than becoming 0 —
 *  callers fall back to a formula for those, instead of treating "no data" as zero. */
const numOrUndef = (v) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function buildPlayer(r) {
  const rawRole = normalizePos(r.club_position);
  const role = getOwn(POS_GROUP, rawRole) ? rawRole : null;
  const positions = (r.player_positions ?? '').split(',').map((s) => normalizePos(s.trim())).filter(Boolean);
  const primary = role ?? positions.find((p) => getOwn(POS_GROUP, p)) ?? null;
  if (!primary) return null;
  const pos = POS_GROUP[primary];

  const altPos = [...new Set(positions.filter((p) => p !== primary && getOwn(POS_GROUP, p)))];

  const value = numOrUndef(r.value_eur);
  const releaseClauseEur = num(r.release_clause_eur);
  const contractUntil = numOrUndef(r.club_contract_valid_until_year);
  const potential = numOrUndef(r.potential);

  const isGk = primary === 'GK';
  const gkDiving = numOrUndef(r.goalkeeping_diving);
  const gkHandling = numOrUndef(r.goalkeeping_handling);
  const gkKicking = numOrUndef(r.goalkeeping_kicking);
  const gkPositioningRaw = numOrUndef(r.goalkeeping_positioning);
  const gkReflexesRaw = numOrUndef(r.goalkeeping_reflexes);
  const gkSpeed = numOrUndef(r.goalkeeping_speed);

  return {
    name: r.short_name,
    nat: r.nationality_name,
    role: primary,
    pos,
    altPos,
    rating: num(r.overall),
    potential,
    // Outfield 6-stat aggregates are blank for keepers in this export; give
    // GKs a plausible spread built from their real GK sub-ratings instead of
    // reading zeroes (the engine still simulates shot-stopping off
    // gkReflexes/gkPositioning below, not these — this is cosmetic).
    pac: isGk ? gkSpeed ?? num(r.pace) : num(r.pace),
    sho: isGk ? gkDiving ?? num(r.shooting) : num(r.shooting),
    pas: isGk ? gkKicking ?? num(r.passing) : num(r.passing),
    dri: isGk ? gkReflexesRaw ?? num(r.dribbling) : num(r.dribbling),
    def: isGk ? gkPositioningRaw ?? num(r.defending) : num(r.defending),
    phy: isGk ? gkHandling ?? num(r.physic) : num(r.physic),
    gkReflexes: isGk ? gkReflexesRaw : undefined,
    gkPositioning: isGk ? gkPositioningRaw : undefined,
    age: num(r.age),
    height: numOrUndef(r.height_cm),
    value: value === undefined ? undefined : Math.round(value / MONEY_SCALE),
    releaseClause: Math.round(releaseClauseEur / MONEY_SCALE),
    realWage: numOrUndef(r.wage_eur),
    contractUntil,
  };
}

const byClub = new Map();
const freeAgents = [];
for (const r of rows) {
  const p = buildPlayer(r);
  if (!p) continue;
  if (!r.club_name || !r.club_name.trim()) {
    freeAgents.push(p);
    continue;
  }
  const division = getOwn(DIVISION_OF_LEAGUE_ID, Number(r.league_id));
  if (division === undefined) continue;
  const name = r.club_name;
  if (!byClub.has(name)) byClub.set(name, { name, division, players: [] });
  byClub.get(name).players.push(p);
}

/** Average of a club's best eleven — used only to break ties on club count. */
function strength(club) {
  const best = club.players.map((p) => p.rating).sort((a, b) => b - a).slice(0, 11);
  return best.reduce((s, r) => s + r, 0) / (best.length || 1);
}

// The round-robin scheduler only handles an even number of clubs, so a
// division with an odd count sheds its weakest side rather than complicating
// the shared scheduler.
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
  for (const c of inDivision) {
    c.players.sort((a, b) => b.rating - a.rating);
    // The engine treats 30 as a hard roster cap (MAX_SQUAD_SIZE in
    // gameRules.ts) — every signing, loan and promotion is gated on it. Real
    // squads run deeper than that at some clubs, so anything past the best
    // 30 becomes a free agent rather than being dropped from the game outright.
    if (c.players.length > 30) {
      const overflow = c.players.splice(30);
      for (const p of overflow) freeAgents.push(p);
    }
  }
  clubs.push(...inDivision);
}

writeFileSync(OUT, JSON.stringify({ clubs, freeAgents }, null, 0));
const players = clubs.reduce((s, c) => s + c.players.length, 0);
console.log(
  `fc26-source.json written: ${clubs.length} clubs, ${players} contracted players, ` +
  `${freeAgents.length} free agents, ${divisions.length} divisions`
);
for (const d of divisions) {
  console.log(`  ${d}: ${clubs.filter((c) => c.division === d).length} clubs`);
}
