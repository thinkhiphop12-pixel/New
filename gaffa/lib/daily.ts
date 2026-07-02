// Daily Challenge: one date-seeded draft per day, same spins for everyone,
// with a localStorage streak. No backend — mirrors how Scout does dailies.

import { DIFFICULTIES, FORMATIONS } from "./draft-data"
import type { Settings } from "@/components/game/use-gaffa-game"

/** Daily #1 = 2 July 2026 (local time). */
const EPOCH_UTC = Date.UTC(2026, 6, 1)

export function dayNumber(now = new Date()): number {
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(1, Math.round((todayUtc - EPOCH_UTC) / 86_400_000))
}

export function dailySeed(day: number): number {
  return (day * 2654435761) % 2147483647
}

/** Fixed settings for a given daily — formation rotates, competition alternates. */
export function dailySettings(day: number): Settings {
  return {
    mode: "world",
    formationId: FORMATIONS[day % FORMATIONS.length].id,
    difficultyId: DIFFICULTIES[1].id, // standard
    era: "All eras",
    competition: day % 2 === 0 ? "league" : "cup",
  }
}

export type DailyState = {
  day: number
  playedToday: boolean
  streak: number
  bestStreak: number
  /** short result line for the setup card, e.g. "🏆 Champions · 92 pts" */
  summary?: string
  /** full share text stored so the result can be re-shared later */
  shareText?: string
}

const KEY = "gaffa:daily"

type Stored = {
  lastDay: number
  streak: number
  bestStreak: number
  summary?: string
  shareText?: string
}

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}

export function getDailyState(now = new Date()): DailyState {
  const day = dayNumber(now)
  const s = read()
  if (!s) return { day, playedToday: false, streak: 0, bestStreak: 0 }
  const playedToday = s.lastDay === day
  // streak survives display-wise if the last play was today or yesterday
  const live = s.lastDay === day || s.lastDay === day - 1
  return {
    day,
    playedToday,
    streak: live ? s.streak : 0,
    bestStreak: s.bestStreak,
    summary: playedToday ? s.summary : undefined,
    shareText: playedToday ? s.shareText : undefined,
  }
}

/** Record today's completed daily. First completion of the day wins. */
export function recordDaily(day: number, summary: string, shareText: string): void {
  try {
    const s = read()
    if (s?.lastDay === day) return // already recorded today
    const streak = s && s.lastDay === day - 1 ? s.streak + 1 : 1
    const bestStreak = Math.max(streak, s?.bestStreak ?? 0)
    localStorage.setItem(
      KEY,
      JSON.stringify({ lastDay: day, streak, bestStreak, summary, shareText } satisfies Stored),
    )
  } catch {
    // storage unavailable (private mode) — daily still playable, just no streak
  }
}
