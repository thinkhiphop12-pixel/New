import type { Player, Position } from "./draft-data"

export type DraftedPlayer = Player & {
  slotIndex: number
  club: string
  season: string
  flag?: string
}

export type TableRow = {
  name: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  points: number
  isYou?: boolean
}

export type SimResult = {
  squadRating: number
  attack: number
  midfield: number
  defence: number
  table: TableRow[]
  position: number
  points: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  unbeaten: boolean
  cleanSheets: number
  topScorer: { name: string; goals: number }
  verdict: string
}

const POS_WEIGHT: Record<Position, number> = { GK: 1, DEF: 1, MID: 1, FWD: 1 }

function avg(nums: number[]) {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

/** Build line ratings (out of 99) from any XI with positions and ratings. */
export function lineRatings(squad: Array<{ pos: Position; rating: number }>) {
  const byPos = (pos: Position) => squad.filter((s) => s.pos === pos).map((s) => s.rating)
  const gk = byPos("GK")
  const def = byPos("DEF")
  const mid = byPos("MID")
  const fwd = byPos("FWD")
  const defence = avg([...gk.map((r) => r * 1.1), ...def]) || 70
  const midfield = avg(mid) || 70
  const attack = avg(fwd) || 70
  const overall =
    avg(squad.map((s) => s.rating * POS_WEIGHT[s.pos])) || 70
  return {
    defence: Math.round(defence),
    midfield: Math.round(midfield),
    attack: Math.round(attack),
    overall: Math.round(overall),
  }
}

// Simple seeded RNG so results are reproducible per draft.
export function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function poisson(lambda: number, rng: () => number) {
  const L = Math.exp(-lambda)
  let k = 0
  let prod = 1
  do {
    k += 1
    prod *= rng()
  } while (prod > L)
  return k - 1
}

const RIVALS = [
  "Athletic Legends",
  "Old Guard FC",
  "Galáctico United",
  "Dynamo Eternal",
  "Real Vintage",
  "Inter Memoria",
  "Sporting Ghosts",
  "Phoenix Veterans",
  "Borough Allstars",
  "Continental XI",
  "Republic Select",
  "Heritage Rovers",
  "Northern Greats",
  "Tactical Masters",
  "Empire Athletic",
  "Coastal Immortals",
  "Iron City Classics",
  "Riverside Legends",
  "Capital Heroes",
  "Summit FC",
]

export function simulateSeason(squad: DraftedPlayer[], seed: number): SimResult {
  const rng = mulberry32(seed)
  const { defence, midfield, attack, overall } = lineRatings(squad)

  const teamStrength = attack * 0.4 + midfield * 0.3 + defence * 0.3

  // 20-team league, you + 19 rivals. 38 games.
  const rivalCount = 19
  const rivals = RIVALS.slice(0, rivalCount).map((name, i) => {
    // rival strength clusters around 76-86
    const strength = 74 + rng() * 13
    return { name, strength }
  })

  const rows: (TableRow & { strength: number })[] = [
    {
      name: "Your XI",
      strength: teamStrength,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      points: 0,
      isYou: true,
    },
    ...rivals.map((r) => ({
      name: r.name,
      strength: r.strength,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      points: 0,
    })),
  ]

  let cleanSheets = 0
  let unbeaten = true

  // round-robin home & away
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      for (let leg = 0; leg < 2; leg++) {
        const a = rows[i]
        const b = rows[j]
        const diff = (a.strength - b.strength) / 12
        const homeBoost = 0.25
        const aLambda = Math.max(0.2, 1.35 + diff + (leg === 0 ? homeBoost : -homeBoost))
        const bLambda = Math.max(0.2, 1.35 - diff + (leg === 0 ? -homeBoost : homeBoost))
        const ag = poisson(aLambda, rng)
        const bg = poisson(bLambda, rng)
        a.gf += ag
        a.ga += bg
        b.gf += bg
        b.ga += ag
        a.played++
        b.played++
        if (ag > bg) {
          a.won++
          b.lost++
          a.points += 3
        } else if (ag < bg) {
          b.won++
          a.lost++
          b.points += 3
        } else {
          a.drawn++
          b.drawn++
          a.points++
          b.points++
        }
        if (a.isYou || b.isYou) {
          const youGA = a.isYou ? bg : ag
          const youGF = a.isYou ? ag : bg
          if (youGA === 0) cleanSheets++
          if (youGA > youGF) unbeaten = false
        }
      }
    }
  }

  rows.sort((x, y) => y.points - x.points || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf)
  const position = rows.findIndex((r) => r.isYou) + 1
  const you = rows.find((r) => r.isYou)!

  // Top scorer: distribute your goals across forwards/mids by rating share.
  const scorers = squad.filter((s) => s.pos === "FWD" || s.pos === "MID")
  const totalShare = scorers.reduce(
    (sum, s) => sum + (s.pos === "FWD" ? 2 : 1) * s.rating,
    0,
  )
  let topScorer = { name: scorers[0]?.name ?? "—", goals: 0 }
  for (const s of scorers) {
    const share = ((s.pos === "FWD" ? 2 : 1) * s.rating) / totalShare
    const goals = Math.round(you.gf * share)
    if (goals > topScorer.goals) topScorer = { name: s.name, goals }
  }

  const verdict = makeVerdict(position, you.points, unbeaten)

  const table: TableRow[] = rows.map(({ strength, ...rest }) => rest)

  return {
    squadRating: overall,
    attack,
    midfield,
    defence,
    table,
    position,
    points: you.points,
    won: you.won,
    drawn: you.drawn,
    lost: you.lost,
    gf: you.gf,
    ga: you.ga,
    unbeaten,
    cleanSheets,
    topScorer,
    verdict,
  }
}

function makeVerdict(position: number, points: number, unbeaten: boolean) {
  if (position === 1 && unbeaten) return "Immortal. An unbeaten title-winning side for the ages."
  if (position === 1) return "Champions. The trophy is yours."
  if (position <= 4) return "Top four — into the elite cups. A serious side."
  if (position <= 10) return "Solid mid-table. Respectable, but the legends expected more."
  if (position <= 17) return "A relegation scrap survived. Back to the drawing board."
  return "Relegated. Even legends have off seasons."
}
