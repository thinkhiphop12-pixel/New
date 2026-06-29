/**
 * One-time import of World Cup squad + player data into Supabase.
 *
 * Usage:
 *   1. Apply supabase/migrations/20250629214100_initial_schema.sql first.
 *   2. Put your service-role key in .env.local as SUPABASE_SERVICE_ROLE_KEY.
 *   3. node scripts/import-data.mjs   (or: npm run import-data)
 *
 * The running game itself reads public/data/players.json directly (fast, no DB
 * round-trip); this import populates the squads/players tables to satisfy the
 * schema and enable server-side queries.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// --- Minimal .env.local loader (no extra deps) ---------------------------------
function loadEnv() {
  try {
    const raw = readFileSync(join(root, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* no .env.local — rely on real env */
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Set them in .env.local (the service-role key is required for inserts).'
  );
  process.exit(1);
}

// --- Country display map (kept in sync with engine/squads.ts) -------------------
const COUNTRY_INFO = {
  Algeria: ['Algeria', '🇩🇿'], Angola: ['Angola', '🇦🇴'], Argentina: ['Argentina', '🇦🇷'],
  Australia: ['Australia', '🇦🇺'], Austria: ['Austria', '🇦🇹'], BOL: ['Bolivia', '🇧🇴'],
  Belgium: ['Belgium', '🇧🇪'], 'Bosnia and Herzegovina': ['Bosnia and Herzegovina', '🇧🇦'],
  Brazil: ['Brazil', '🇧🇷'], CUB: ['Cuba', '🇨🇺'], Cameroon: ['Cameroon', '🇨🇲'],
  Canada: ['Canada', '🇨🇦'], 'Cape Verde': ['Cape Verde', '🇨🇻'], Chile: ['Chile', '🇨🇱'],
  'China PR': ['China', '🇨🇳'], Colombia: ['Colombia', '🇨🇴'], 'Costa Rica': ['Costa Rica', '🇨🇷'],
  Croatia: ['Croatia', '🇭🇷'], Curacao: ['Curaçao', '🇨🇼'], 'Czech Republic': ['Czech Republic', '🇨🇿'],
  "Côte d'Ivoire": ["Côte d'Ivoire", '🇨🇮'], 'DR Congo': ['DR Congo', '🇨🇩'],
  Denmark: ['Denmark', '🇩🇰'], Ecuador: ['Ecuador', '🇪🇨'], Egypt: ['Egypt', '🇪🇬'],
  England: ['England', '🏴'], FRG: ['West Germany', '🇩🇪'], France: ['France', '🇫🇷'],
  Germany: ['Germany', '🇩🇪'], Ghana: ['Ghana', '🇬🇭'], Greece: ['Greece', '🇬🇷'],
  Haiti: ['Haiti', '🇭🇹'], Honduras: ['Honduras', '🇭🇳'], Hungary: ['Hungary', '🇭🇺'],
  INH: ['Dutch East Indies', '🏳️'], Iceland: ['Iceland', '🇮🇸'], Iran: ['Iran', '🇮🇷'],
  Iraq: ['Iraq', '🇮🇶'], Italy: ['Italy', '🇮🇹'], Japan: ['Japan', '🇯🇵'], Jordan: ['Jordan', '🇯🇴'],
  Mexico: ['Mexico', '🇲🇽'], Morocco: ['Morocco', '🇲🇦'], NIR: ['Northern Ireland', '🇬🇧'],
  Netherlands: ['Netherlands', '🇳🇱'], 'New Zealand': ['New Zealand', '🇳🇿'], Nigeria: ['Nigeria', '🇳🇬'],
  'North Korea': ['North Korea', '🇰🇵'], Norway: ['Norway', '🇳🇴'], Panama: ['Panama', '🇵🇦'],
  Paraguay: ['Paraguay', '🇵🇾'], Peru: ['Peru', '🇵🇪'], Poland: ['Poland', '🇵🇱'],
  Portugal: ['Portugal', '🇵🇹'], Qatar: ['Qatar', '🇶🇦'], ROU: ['Romania', '🇷🇴'],
  'Republic of Ireland': ['Republic of Ireland', '🇮🇪'], Russia: ['Russia', '🇷🇺'],
  'Saudi Arabia': ['Saudi Arabia', '🇸🇦'], Scotland: ['Scotland', '🏴'], Senegal: ['Senegal', '🇸🇳'],
  Serbia: ['Serbia', '🇷🇸'], 'Serbia and Montenegro': ['Serbia and Montenegro', '🇷🇸'],
  Slovakia: ['Slovakia', '🇸🇰'], Slovenia: ['Slovenia', '🇸🇮'], 'South Africa': ['South Africa', '🇿🇦'],
  'South Korea': ['South Korea', '🇰🇷'], 'Soviet Union': ['Soviet Union', '🏳️'], Spain: ['Spain', '🇪🇸'],
  Sweden: ['Sweden', '🇸🇪'], Switzerland: ['Switzerland', '🇨🇭'], TCH: ['Czechoslovakia', '🏳️'],
  Togo: ['Togo', '🇹🇬'], 'Trinidad and Tobago': ['Trinidad and Tobago', '🇹🇹'], Tunisia: ['Tunisia', '🇹🇳'],
  Turkey: ['Turkey', '🇹🇷'], URU: ['Uruguay', '🇺🇾'], USA: ['United States', '🇺🇸'],
  Ukraine: ['Ukraine', '🇺🇦'], 'United States': ['United States', '🇺🇸'], Uruguay: ['Uruguay', '🇺🇾'],
  Uzbekistan: ['Uzbekistan', '🇺🇿'], Wales: ['Wales', '🏴'], YUG: ['Yugoslavia', '🏳️'],
};

function infoFor(country) {
  return COUNTRY_INFO[country] ?? [country, '🏳️'];
}
function toPosition(raw) {
  const tag = raw?.[0];
  if (tag === 'GK') return 'GK';
  if (tag === 'DF') return 'DEF';
  if (tag === 'MF') return 'MID';
  return 'FWD';
}
function tierFromPct(pct) {
  if (pct >= 0.75) return 'legendary';
  if (pct >= 0.5) return 'strong';
  if (pct >= 0.25) return 'medium';
  return 'weak';
}

function buildSquadsAndPlayers() {
  const raw = JSON.parse(readFileSync(join(root, 'public/data/players.json'), 'utf8'));
  const bySquad = new Map();
  for (const p of raw.players) {
    const id = `${p.country}|${p.year}`;
    const entry = bySquad.get(id) ?? { country: p.country, year: p.year, players: [] };
    entry.players.push(p);
    bySquad.set(id, entry);
  }

  const strengths = [...bySquad.values()].map(
    ({ players }) => players.reduce((s, p) => s + p.o, 0) / players.length
  );
  const minS = Math.min(...strengths);
  const range = Math.max(...strengths) - minS || 1;

  const squads = [];
  const players = [];
  for (const [id, { country, year, players: rawPlayers }] of bySquad) {
    const avg = rawPlayers.reduce((s, p) => s + p.o, 0) / rawPlayers.length;
    const strengthPct = (avg - minS) / range;
    const [countryName, flag] = infoFor(country);
    squads.push({
      id,
      tournament_year: year,
      country_name: countryName,
      country_family_id: country,
      display_name: `${countryName} ${year}`,
      strength: Math.round(avg),
      strength_pct: strengthPct,
      tier: tierFromPct(strengthPct),
      eligible: true,
      flag,
    });
    for (const p of rawPlayers) {
      players.push({
        id: `${id}__${p.n}`,
        person_key: p.n,
        squad_id: id,
        name: p.n,
        position: toPosition(p.p),
        rating: p.o,
      });
    }
  }
  return { squads, players };
}

async function upsertInChunks(supabase, table, rows, size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
    process.stdout.write(`  ${table}: ${Math.min(i + size, rows.length)}/${rows.length}\r`);
  }
  process.stdout.write('\n');
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
  const { squads, players } = buildSquadsAndPlayers();
  console.log(`Importing ${squads.length} squads and ${players.length} players...`);
  await upsertInChunks(supabase, 'squads', squads);
  await upsertInChunks(supabase, 'players', players);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
