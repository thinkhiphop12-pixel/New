// Knockout Cup run: four rounds against REAL squads from the dataset,
// rising in strength so the Final is a heavyweight (Brazil 1970-class).

import type { ClubSeason } from "./draft-data"
import { lineRatings, mulberry32, poisson, type DraftedPlayer } from "./sim"

export type CupOpponent = {
  club: string
  season: string
  flag?: string
  color: string
  note?: string
}

export type CupRound = {
  stage: string
  opponent: CupOpponent
  oppRating: number
  gf: number
  ga: number
  /** decided on penalties after a draw */
  pens?: boolean
  won: boolean
}

export type CupResult = {
  rounds: CupRound[]
  champion: boolean
  squadRating: number
  /** beat at least one opponent rated above your XI */
  giantKill: boolean
  verdict: string
}

const STAGES = ["Round of 16", "Quarter-final", "Semi-final", "Final"]

function strengthOf(players: Array<{ pos: "GK" | "DEF" | "MID" | "FWD"; rating: number }>) {
  const { attack, midfield, defence } = lineRatings(players)
  return attack * 0.4 + midfield * 0.3 + defence * 0.3
}

/**
 * Draw four real opponents (excluding squads used in the draft) with rising
 * difficulty: R16 from the bottom third, QF from the middle, SF from the top
 * third, Final from the strongest ten squads in the pool.
 */
export function drawOpponents(
  all: ClubSeason[],
  usedIds: string[],
  rng: () => number,
): Array<{ cs: ClubSeason; strength: number }> {
  const pool = all
    .filter((cs) => !usedIds.includes(cs.id))
    .map((cs) => ({ cs, strength: strengthOf(cs.players) }))
    .sort((a, b) => a.strength - b.strength)
  const n = pool.length
  const pickFrom = (lo: number, hi: number, exclude: Set<string>) => {
    const slice = pool.slice(Math.floor(lo * n), Math.max(Math.floor(lo * n) + 1, Math.floor(hi * n)))
    const open = slice.filter((x) => !exclude.has(x.cs.id))
    const src = open.length ? open : slice
    return src[Math.floor(rng() * src.length)]
  }
  const taken = new Set<string>()
  const picks = [
    pickFrom(0, 1 / 3, taken),
    pickFrom(1 / 3, 2 / 3, taken),
    pickFrom(2 / 3, 1, taken),
    (() => {
      const topTen = pool.slice(-10).filter((x) => !taken.has(x.cs.id))
      return topTen[Math.floor(rng() * topTen.length)]
    })(),
  ]
  for (const p of picks) taken.add(p.cs.id)
  return picks
}

export function simulateCup(
  squad: DraftedPlayer[],
  all: ClubSeason[],
  usedIds: string[],
  seed: number,
): CupResult {
  const rng = mulberry32(seed)
  const { overall } = lineRatings(squad)
  const teamStrength = strengthOf(squad)
  const opponents = drawOpponents(all, usedIds, rng)

  const rounds: CupRound[] = []
  let alive = true
  let giantKill = false

  for (let i = 0; i < STAGES.length && alive; i++) {
    const { cs, strength } = opponents[i]
    const diff = (teamStrength - strength) / 10
    const gf = poisson(Math.max(0.2, 1.25 + diff), rng)
    const ga = poisson(Math.max(0.2, 1.25 - diff), rng)
    let won = gf > ga
    let pens: boolean | undefined
    if (gf === ga) {
      pens = true
      const pWin = Math.min(0.85, Math.max(0.15, 0.5 + (teamStrength - strength) / 60))
      won = rng() < pWin
    }
    const oppRating = Math.round(strength)
    rounds.push({
      stage: STAGES[i],
      opponent: { club: cs.club, season: cs.season, flag: cs.flag, color: cs.color, note: cs.note },
      oppRating,
      gf,
      ga,
      pens,
      won,
    })
    if (won && oppRating > overall) giantKill = true
    alive = won
  }

  const champion = rounds.length === 4 && rounds[3].won
  return {
    rounds,
    champion,
    squadRating: overall,
    giantKill,
    verdict: makeCupVerdict(rounds, champion),
  }
}

function makeCupVerdict(rounds: CupRound[], champion: boolean) {
  if (champion) return "World Champions. Your XI lifts the trophy."
  const last = rounds[rounds.length - 1]
  const at = last.stage === "Final" ? "in the Final" : `at the ${last.stage}`
  return `Knocked out ${at} by ${last.opponent.club} ${last.opponent.season}.`
}
