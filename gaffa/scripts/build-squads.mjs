// Build the World Cup squad dataset the GAFFA draft consumes.
//
// Source of truth: ../../data/dbc-squads.js — the hand-curated DBC dataset
// (133 starting XIs across all 23 World Cups, tournament-specific ratings,
// kit colours, notes, finishes, per-player stats).
//
// Specific positions are assigned per player, in priority order:
//   1. SPEC_OVERRIDES (hand-curated, ./spec-overrides.mjs) — legends & stars.
//   2. Legacy dataset match (../../data/players.json) — 2002+ only, and only
//      when the matched position agrees with the DBC line (pre-2000 rows in
//      the legacy data are junk: nearly everything is tagged CM).
//   3. Line defaults (GK→GK, DEF→CB, MID→CM, FWD→ST; duals map to hybrid
//      roles like CDM / CAM / CF-with-wing-alts).
// A final per-squad pass guarantees every squad can fill RB/LB/RM/LM/CB/ST
// slots so no formation dead-ends, by widening the *lowest-rated* default-
// assigned players (stars keep their true positions).
//
// Run with: node scripts/build-squads.mjs  (or `pnpm build:squads`)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { SPEC_OVERRIDES } from "./spec-overrides.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DBC = resolve(__dirname, "../../data/dbc-squads.js")
const LEGACY = resolve(__dirname, "../../data/players.json")
const OUT = resolve(__dirname, "../public/data/squads.json")

const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim()

// ---------- load sources ----------
const { NATIONS, SQUADS } = new Function(
  readFileSync(DBC, "utf8") + "\nreturn { NATIONS, SQUADS };",
)()
const legacy = JSON.parse(readFileSync(LEGACY, "utf8")).players

// ---------- legacy lookup (2002+ enrichment only) ----------
const COUNTRY_ALIASES = {
  Czechoslovakia: ["TCH", "Czech Republic"],
  USSR: ["Soviet Union"],
  "West Germany": ["FRG", "Germany"],
  "Northern Ireland": ["NIR"],
  Yugoslavia: ["YUG", "Serbia", "Serbia and Montenegro"],
  "Rep. of Ireland": ["Republic of Ireland"],
  Romania: ["ROU"],
  Zaire: ["DR Congo"],
  Bolivia: ["BOL"],
  "Trinidad & Tobago": ["Trinidad and Tobago"],
  "Ivory Coast": ["Côte d'Ivoire"],
  Uruguay: ["URU"],
  USA: ["United States"],
}

const legacyByCountry = new Map()
for (const p of legacy) {
  const k = norm(p.country)
  if (!legacyByCountry.has(k)) legacyByCountry.set(k, [])
  legacyByCountry.get(k).push(p)
}
const legacyPool = (nation) => {
  const keys = [nation, ...(COUNTRY_ALIASES[nation] ?? [])].map(norm)
  return keys.flatMap((k) => legacyByCountry.get(k) ?? [])
}

// Positions the DBC line allows — used to gate legacy matches.
const LINE_POSITIONS = {
  GK: ["GK"],
  DEF: ["CB", "RB", "LB", "RWB", "LWB"],
  MID: ["CM", "CDM", "CAM", "RM", "LM"],
  FWD: ["ST", "CF", "RW", "LW"],
}
const lineAllows = (line, spec) =>
  line.split("/").some((l) => (LINE_POSITIONS[l] ?? []).includes(spec))

// Match a DBC player to a legacy row (2002+ rows only), nearest year first.
function legacyMatch(name, nation, year) {
  const n = norm(name)
  const pool = legacyPool(nation).filter((p) => p.year >= 2002 && p.sp)
  let hits = pool.filter((p) => norm(p.n) === n)
  if (!hits.length) {
    const last = n.split(" ").pop()
    const c = pool.filter((p) => norm(p.n).split(" ").includes(last))
    if (c.length && c.every((x) => norm(x.n) === norm(c[0].n))) hits = c
  }
  if (!hits.length) return null
  hits.sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year))
  return hits[0]
}

// ---------- line defaults ----------
const LINE_DEFAULTS = {
  GK: ["GK"],
  DEF: ["CB"],
  MID: ["CM"],
  FWD: ["ST", "CF"],
  "DEF/MID": ["CDM", "CB", "CM"],
  "MID/DEF": ["CDM", "CM", "CB"],
  "MID/FWD": ["CAM", "CM", "RW", "LW"],
  "FWD/MID": ["CF", "RW", "LW", "CAM"],
  "FWD/DEF": ["ST", "CB"],
  "DEF/FWD": ["CB", "ST"],
}

function assignSpec(name, line, nation, year) {
  const n = norm(name)
  const override = SPEC_OVERRIDES[`${n}|${year}`] ?? SPEC_OVERRIDES[n]
  if (override) {
    const [spec, ...alt] = override
    return { spec, alt: [...alt], source: "override" }
  }
  if (year >= 2002) {
    const hit = legacyMatch(name, nation, year)
    if (hit && lineAllows(line, hit.sp)) {
      const alt = Array.isArray(hit.sp2)
        ? [...new Set(hit.sp2)].filter((x) => x !== hit.sp)
        : []
      return { spec: hit.sp, alt, source: "legacy" }
    }
  }
  const [spec, ...alt] = LINE_DEFAULTS[line] ?? LINE_DEFAULTS[line.split("/")[0]] ?? ["CM"]
  return { spec, alt: [...alt], source: "default" }
}

// ---------- build squads ----------
const eraFor = (year) => `${Math.floor(year / 10) * 10}s`

const out = []
const sourceCounts = { override: 0, legacy: 0, default: 0 }

for (const [, s] of Object.entries(SQUADS)) {
  const nation = NATIONS[s.nation] ?? {}
  const squad = {
    id: `${s.nation}|${s.year}`,
    club: s.nation,
    season: String(s.year),
    mode: "world",
    era: eraFor(s.year),
    color: nation.kit ?? "#888888",
    trim: nation.trim,
    flag: nation.flag,
    note: s.note,
    finish: s.finish,
    players: [],
  }
  for (const [name, line, rating, stats] of s.players) {
    const { spec, alt, source } = assignSpec(name, line, s.nation, s.year)
    sourceCounts[source]++
    squad.players.push({
      id: `${squad.id}__${name}`,
      name,
      pos: line.split("/")[0],
      spec,
      alt,
      rating,
      peak: rating,
      ...(stats ? { stats } : {}),
    })
  }
  out.push(squad)
}

// ---------- coverage guarantee ----------
// Every squad must be able to fill each of these slot archetypes (mirrors
// SLOT_ACCEPTS in lib/draft-data.ts). Widen the lowest-rated default-assigned
// player when a capability is missing — never a hand-curated or matched one.
const SLOT_NEEDS = {
  GK: ["GK"],
  CB: ["CB"],
  RB: ["RB", "RWB"],
  LB: ["LB", "LWB"],
  RM: ["RM", "RW"],
  LM: ["LM", "LW"],
  CM: ["CM", "CDM", "CAM"],
  ST: ["ST", "CF"],
}
// which player specs may be widened to gain the capability, in preference order
const WIDEN_FROM = {
  CB: ["CDM", "CM"],
  RB: ["CB", "CDM", "CM"],
  LB: ["CB", "CDM", "CM"],
  RM: ["CM", "CF", "ST"],
  LM: ["CM", "CF", "ST"],
  CM: ["CDM", "CAM", "CF"],
  ST: ["CF", "RW", "LW", "CAM"],
}

let widened = 0
for (const squad of out) {
  const covers = (p, accepted) =>
    accepted.includes(p.spec) || p.alt.some((a) => accepted.includes(a))
  const used = new Set()
  for (const [slot, accepted] of Object.entries(SLOT_NEEDS)) {
    if (squad.players.some((p) => covers(p, accepted))) continue
    const gain = accepted[0]
    // lowest-rated default-assigned candidate whose spec is widenable
    const candidates = squad.players
      .filter(
        (p) =>
          !used.has(p.id) &&
          (WIDEN_FROM[slot] ?? []).includes(p.spec) &&
          !SPEC_OVERRIDES[norm(p.name)] &&
          !SPEC_OVERRIDES[`${norm(p.name)}|${squad.season}`],
      )
      .sort((a, b) => a.rating - b.rating)
    const pick =
      candidates[0] ??
      squad.players
        .filter((p) => !used.has(p.id) && p.spec !== "GK")
        .sort((a, b) => a.rating - b.rating)[0]
    if (pick) {
      pick.alt.push(gain)
      used.add(pick.id)
      widened++
    }
  }
}

// ---------- write + report ----------
out.sort((a, b) => a.club.localeCompare(b.club) || Number(a.season) - Number(b.season))
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out))

const total = out.reduce((n, s) => n + s.players.length, 0)
console.log(`Wrote ${out.length} squads (${total} players) → ${OUT}`)
console.log(
  `spec sources — override: ${sourceCounts.override}, legacy(2002+): ${sourceCounts.legacy}, line default: ${sourceCounts.default}; widened for coverage: ${widened}`,
)

// verify every squad fills every slot archetype
let failures = 0
for (const squad of out) {
  for (const [slot, accepted] of Object.entries(SLOT_NEEDS)) {
    const ok = squad.players.some(
      (p) => accepted.includes(p.spec) || p.alt.some((a) => accepted.includes(a)),
    )
    if (!ok) {
      console.error(`  COVERAGE FAIL: ${squad.id} cannot fill ${slot}`)
      failures++
    }
  }
}
if (failures) {
  console.error(`${failures} coverage failures`)
  process.exit(1)
}
console.log("coverage OK: every squad fills GK/CB/RB/LB/RM/LM/CM/ST")
