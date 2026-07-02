// Share text for results — emoji flag row of your XI plus the outcome,
// in the same spirit as Scout's emoji grids.

import type { DraftedPlayer } from "./sim"
import type { CupResult } from "./cup"

const URL = "ballknw.com/perfect-cup/"

// Nations whose `flag` field is an inline SVG (renders in the UI but not in
// plain text). Share text falls back to the closest emoji.
const FLAG_FALLBACK: Record<string, string> = {
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Northern Ireland": "🇬🇧",
  USSR: "🇷🇺",
  Yugoslavia: "🇷🇸",
  Zaire: "🇨🇩",
  "West Germany": "🇩🇪",
  Czechoslovakia: "🇨🇿",
}

export function flagEmoji(club: string, flag?: string): string {
  if (flag && !flag.startsWith("<svg")) return flag
  return FLAG_FALLBACK[club] ?? "🏳️"
}

function header(daily: number | null) {
  return daily != null ? `NAME YOUR SIDE #${daily}` : "NAME YOUR SIDE"
}

function flagRow(squad: DraftedPlayer[]) {
  return squad.map((p) => flagEmoji(p.club, p.flag)).join("")
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function buildLeagueShare(opts: {
  daily: number | null
  formationName: string
  difficultyName: string
  position: number
  points: number
  squad: DraftedPlayer[]
  streak?: number
}): string {
  const { daily, formationName, difficultyName, position, points, squad, streak } = opts
  const trophy = position === 1 ? " 🏆" : ""
  const lines = [
    header(daily) + trophy,
    `${formationName} · ${difficultyName} · ${ordinal(position)}, ${points} pts`,
    flagRow(squad),
  ]
  if (streak && streak > 1) lines.push(`🔥 streak ${streak}`)
  lines.push(URL)
  return lines.join("\n")
}

export function buildCupShare(opts: {
  daily: number | null
  formationName: string
  difficultyName: string
  cup: CupResult
  squad: DraftedPlayer[]
  streak?: number
}): string {
  const { daily, formationName, difficultyName, cup, squad, streak } = opts
  const trophy = cup.champion ? " 🏆" : ""
  const run = cup.rounds
    .map((r) => {
      const flag = flagEmoji(r.opponent.club, r.opponent.flag)
      const score = `${r.gf}-${r.ga}${r.pens ? " pens" : ""}`
      return `${r.won ? "✅" : "❌"} ${score} v ${flag} ${r.opponent.club} ${r.opponent.season}`
    })
    .join("\n")
  const lines = [
    header(daily) + trophy,
    `Cup run · ${formationName} · ${difficultyName}`,
    run,
    flagRow(squad),
  ]
  if (streak && streak > 1) lines.push(`🔥 streak ${streak}`)
  lines.push(URL)
  return lines.join("\n")
}
