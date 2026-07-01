// Build the World Cup squad dataset the GAFFA draft consumes.
//
// Reads the repo's real player dataset (../../data/players.json), groups players
// by country|year, maps each to their specific ("closest actual") position, and
// writes gaffa/public/data/squads.json. Run with: node scripts/build-squads.mjs
//
// Output shape mirrors the ClubSeason / Player types in lib/draft-data.ts.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(__dirname, "../../data/players.json")
const OUT = resolve(__dirname, "../public/data/squads.json")

// generic line from the raw `p` tag
const GENERIC = { GK: "GK", DF: "DEF", MF: "MID", FW: "FWD" }

// deterministic crest colour per country (hash → HSL)
function colorFor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return `hsl(${h % 360} 62% 45%)`
}

function eraFor(year) {
  return `${Math.floor(year / 10) * 10}s`
}

function toGeneric(rawP) {
  const tag = Array.isArray(rawP) ? rawP[0] : rawP
  return GENERIC[tag] ?? "MID"
}

const bundle = JSON.parse(readFileSync(SRC, "utf8"))
const players = bundle.players ?? []

const squads = new Map()
for (const p of players) {
  const key = `${p.country}|${p.year}`
  if (!squads.has(key)) {
    squads.set(key, {
      id: key,
      club: p.country,
      season: String(p.year),
      mode: "world",
      era: eraFor(p.year),
      color: colorFor(p.country),
      players: [],
    })
  }
  const spec = p.sp || undefined
  const alt = Array.isArray(p.sp2) ? [...new Set(p.sp2)].filter((x) => x !== spec) : []
  squads.get(key).players.push({
    id: `${key}__${p.n}`,
    name: p.n,
    pos: toGeneric(p.p),
    spec,
    alt,
    rating: p.o,
    peak: p.o,
  })
}

const out = [...squads.values()].sort(
  (a, b) => a.club.localeCompare(b.club) || Number(a.season) - Number(b.season),
)

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out))
console.log(`Wrote ${out.length} squads (${players.length} players) → ${OUT}`)
