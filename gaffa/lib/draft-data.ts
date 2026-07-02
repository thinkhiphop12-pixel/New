// =============================================================
// GAFFA DRAFT — placeholder data model
// All player data here is illustrative placeholder data for the
// prototype. Swap in a real dataset later without touching the UI.
// =============================================================

export type Position = "GK" | "DEF" | "MID" | "FWD"

/** Granular ("closest actual") position, as tagged in the real dataset. */
export type SpecificPosition =
  | "GK"
  | "CB"
  | "RB"
  | "LB"
  | "RWB"
  | "LWB"
  | "RM"
  | "LM"
  | "RW"
  | "LW"
  | "CM"
  | "CDM"
  | "CAM"
  | "ST"
  | "CF"

/** Tournament stats carried from the DBC dataset (apps, goals, clean sheets,
 * player-of-tournament, golden boot, young-player award). */
export type PlayerStats = {
  a?: number
  g?: number
  cs?: number
  pot?: number
  boot?: number
  yng?: number
}

export type Player = {
  id: string
  name: string
  pos: Position
  /** specific position for this club-season, from real data (optional) */
  spec?: SpecificPosition
  /** other specific positions the player can cover */
  alt?: SpecificPosition[]
  /** rating for the specific club-season */
  rating: number
  /** retained for schema compatibility; equals `rating` for real data */
  peak: number
  stats?: PlayerStats
}

export type ClubSeason = {
  id: string
  club: string
  season: string
  /** which game mode this club-season belongs to */
  mode: GameModeId
  /** short label for the era filter */
  era: string
  /** accent color used for the crest chip */
  color: string
  /** secondary kit colour */
  trim?: string
  /** flag emoji, or an inline <svg> string for nations without one */
  flag?: string
  /** one-line story of the squad, e.g. "The greatest team ever" */
  note?: string
  /** how the squad finished, e.g. "Champions" */
  finish?: string
  players: Player[]
}

export type GameModeId = "pl" | "club" | "world"

export type GameMode = {
  id: GameModeId
  name: string
  tagline: string
}

export const GAME_MODES: GameMode[] = [
  { id: "world", name: "World Cup XI", tagline: "International squads, 1930 → 2026" },
]

// ---------- Formations ----------

export type Slot = {
  pos: Position
  /** label e.g. LB, CB, CM, ST */
  label: string
  /** position on the pitch as a percentage (x: 0 left → 100 right, y: 0 own goal → 100 opp goal) */
  x: number
  y: number
}

export type Formation = {
  id: string
  name: string
  slots: Slot[]
}

// ---------- Position matching ----------
// For each formation slot (keyed by its label) the specific positions a player
// may hold to fill it — their "closest actual position". Wing-back and hybrid
// slots fall back to the nearest real roles present in the dataset.
export const SLOT_ACCEPTS: Record<string, SpecificPosition[]> = {
  GK: ["GK"],
  RB: ["RB", "RWB"],
  LB: ["LB", "LWB"],
  CB: ["CB"],
  RWB: ["RWB", "RB", "RM"],
  LWB: ["LWB", "LB", "LM"],
  RM: ["RM", "RW"],
  LM: ["LM", "LW"],
  RW: ["RW", "RM"],
  LW: ["LW", "LM"],
  CDM: ["CDM", "CM"],
  CM: ["CM", "CDM", "CAM"],
  CAM: ["CAM", "CM"],
  ST: ["ST", "CF"],
  CF: ["CF", "ST"],
}

/**
 * Whether a player can fill a given formation slot. Uses the player's specific
 * position (+ alternates) against the slot's accepted set when real data is
 * present; otherwise falls back to the generic line match.
 */
export function playerFillsSlot(slot: Slot, player: Player): boolean {
  if (player.spec) {
    const accepted = SLOT_ACCEPTS[slot.label] ?? []
    if (accepted.includes(player.spec)) return true
    return (player.alt ?? []).some((a) => accepted.includes(a))
  }
  return player.pos === slot.pos
}

const GK_SLOT: Slot = { pos: "GK", label: "GK", x: 50, y: 8 }

export const FORMATIONS: Formation[] = [
  {
    id: "442",
    name: "4-4-2",
    slots: [
      GK_SLOT,
      { pos: "DEF", label: "LB", x: 16, y: 30 },
      { pos: "DEF", label: "CB", x: 38, y: 26 },
      { pos: "DEF", label: "CB", x: 62, y: 26 },
      { pos: "DEF", label: "RB", x: 84, y: 30 },
      { pos: "MID", label: "LM", x: 16, y: 58 },
      { pos: "MID", label: "CM", x: 38, y: 54 },
      { pos: "MID", label: "CM", x: 62, y: 54 },
      { pos: "MID", label: "RM", x: 84, y: 58 },
      { pos: "FWD", label: "ST", x: 38, y: 84 },
      { pos: "FWD", label: "ST", x: 62, y: 84 },
    ],
  },
  {
    id: "433",
    name: "4-3-3",
    slots: [
      GK_SLOT,
      { pos: "DEF", label: "LB", x: 16, y: 30 },
      { pos: "DEF", label: "CB", x: 38, y: 26 },
      { pos: "DEF", label: "CB", x: 62, y: 26 },
      { pos: "DEF", label: "RB", x: 84, y: 30 },
      { pos: "MID", label: "CM", x: 30, y: 55 },
      { pos: "MID", label: "CM", x: 50, y: 50 },
      { pos: "MID", label: "CM", x: 70, y: 55 },
      { pos: "FWD", label: "LW", x: 20, y: 83 },
      { pos: "FWD", label: "ST", x: 50, y: 88 },
      { pos: "FWD", label: "RW", x: 80, y: 83 },
    ],
  },
  {
    id: "352",
    name: "3-5-2",
    slots: [
      GK_SLOT,
      { pos: "DEF", label: "CB", x: 28, y: 26 },
      { pos: "DEF", label: "CB", x: 50, y: 23 },
      { pos: "DEF", label: "CB", x: 72, y: 26 },
      { pos: "MID", label: "LWB", x: 12, y: 52 },
      { pos: "MID", label: "CM", x: 36, y: 56 },
      { pos: "MID", label: "CM", x: 50, y: 50 },
      { pos: "MID", label: "CM", x: 64, y: 56 },
      { pos: "MID", label: "RWB", x: 88, y: 52 },
      { pos: "FWD", label: "ST", x: 38, y: 85 },
      { pos: "FWD", label: "ST", x: 62, y: 85 },
    ],
  },
  // ----- Extended formations -----
  {
    id: "532",
    name: "5-3-2",
    slots: [
      GK_SLOT,
      { pos: "DEF", label: "LWB", x: 12, y: 35 },
      { pos: "DEF", label: "CB", x: 32, y: 25 },
      { pos: "DEF", label: "CB", x: 50, y: 20 },
      { pos: "DEF", label: "CB", x: 68, y: 25 },
      { pos: "DEF", label: "RWB", x: 88, y: 35 },
      { pos: "MID", label: "CM", x: 30, y: 55 },
      { pos: "MID", label: "CM", x: 50, y: 50 },
      { pos: "MID", label: "CM", x: 70, y: 55 },
      { pos: "FWD", label: "ST", x: 38, y: 85 },
      { pos: "FWD", label: "ST", x: 62, y: 85 },
    ],
  },
  {
    id: "541",
    name: "5-4-1",
    slots: [
      GK_SLOT,
      { pos: "DEF", label: "LWB", x: 12, y: 35 },
      { pos: "DEF", label: "CB", x: 32, y: 25 },
      { pos: "DEF", label: "CB", x: 50, y: 20 },
      { pos: "DEF", label: "CB", x: 68, y: 25 },
      { pos: "DEF", label: "RWB", x: 88, y: 35 },
      { pos: "MID", label: "LM", x: 16, y: 58 },
      { pos: "MID", label: "CM", x: 38, y: 54 },
      { pos: "MID", label: "CM", x: 62, y: 54 },
      { pos: "MID", label: "RM", x: 84, y: 58 },
      { pos: "FWD", label: "ST", x: 50, y: 88 },
    ],
  },
  {
    id: "4231",
    name: "4-2-3-1",
    slots: [
      GK_SLOT,
      { pos: "DEF", label: "LB", x: 16, y: 30 },
      { pos: "DEF", label: "CB", x: 38, y: 26 },
      { pos: "DEF", label: "CB", x: 62, y: 26 },
      { pos: "DEF", label: "RB", x: 84, y: 30 },
      { pos: "MID", label: "CDM", x: 34, y: 54 },
      { pos: "MID", label: "CDM", x: 66, y: 54 },
      { pos: "MID", label: "CAM", x: 28, y: 68 },
      { pos: "MID", label: "CAM", x: 50, y: 65 },
      { pos: "MID", label: "CAM", x: 72, y: 68 },
      { pos: "FWD", label: "ST", x: 50, y: 88 },
    ],
  },
  {
    id: "343",
    name: "3-4-3",
    slots: [
      GK_SLOT,
      { pos: "DEF", label: "CB", x: 28, y: 26 },
      { pos: "DEF", label: "CB", x: 50, y: 23 },
      { pos: "DEF", label: "CB", x: 72, y: 26 },
      { pos: "MID", label: "LWB", x: 12, y: 52 },
      { pos: "MID", label: "CM", x: 36, y: 56 },
      { pos: "MID", label: "CM", x: 50, y: 50 },
      { pos: "MID", label: "CM", x: 64, y: 56 },
      { pos: "MID", label: "RWB", x: 88, y: 52 },
      { pos: "FWD", label: "LW", x: 20, y: 83 },
      { pos: "FWD", label: "ST", x: 50, y: 88 },
      { pos: "FWD", label: "RW", x: 80, y: 83 },
    ],
  },
  {
    id: "451",
    name: "4-5-1",
    slots: [
      GK_SLOT,
      { pos: "DEF", label: "LB", x: 16, y: 30 },
      { pos: "DEF", label: "CB", x: 38, y: 26 },
      { pos: "DEF", label: "CB", x: 62, y: 26 },
      { pos: "DEF", label: "RB", x: 84, y: 30 },
      { pos: "MID", label: "LM", x: 16, y: 58 },
      { pos: "MID", label: "CM", x: 38, y: 54 },
      { pos: "MID", label: "CM", x: 50, y: 50 },
      { pos: "MID", label: "CM", x: 62, y: 54 },
      { pos: "MID", label: "RM", x: 84, y: 58 },
      { pos: "FWD", label: "ST", x: 50, y: 88 },
    ],
  },
  {
    id: "352wb",
    name: "3-5-2 Wingbacks",
    slots: [
      GK_SLOT,
      { pos: "DEF", label: "CB", x: 28, y: 26 },
      { pos: "DEF", label: "CB", x: 50, y: 23 },
      { pos: "DEF", label: "CB", x: 72, y: 26 },
      { pos: "MID", label: "LWB", x: 12, y: 48 },
      { pos: "MID", label: "CM", x: 36, y: 56 },
      { pos: "MID", label: "CM", x: 50, y: 50 },
      { pos: "MID", label: "CM", x: 64, y: 56 },
      { pos: "MID", label: "RWB", x: 88, y: 48 },
      { pos: "FWD", label: "ST", x: 35, y: 82 },
      { pos: "FWD", label: "ST", x: 65, y: 82 },
    ],
  },
]

// ---------- Difficulty ----------

export type RatingBasis = "form" | "peak"

export type Difficulty = {
  id: string
  name: string
  /** number of re-rolls available across the whole draft */
  spins: number
  ratingsHidden: boolean
  description: string
}

export const DIFFICULTIES: Difficulty[] = [
  { id: "casual", name: "Casual", spins: 5, ratingsHidden: false, description: "5 re-rolls. Ratings shown." },
  { id: "standard", name: "Standard", spins: 3, ratingsHidden: false, description: "3 re-rolls. Ratings shown." },
  { id: "pro", name: "Pro", spins: 1, ratingsHidden: false, description: "1 re-roll. Ratings shown." },
  { id: "gaffer", name: "Gaffer", spins: 0, ratingsHidden: true, description: "No re-rolls. Ratings hidden — trust your eye." },
]

// ---------- Challenges ----------

export type ChallengeContext = {
  position: number
  points: number
  unbeaten: boolean
  cleanSheets: number
  topScorerGoals: number
  squadRating: number
  difficultyId: string
  ratingBasis: RatingBasis
  /** cup-run outcomes (only set after a cup competition) */
  champion?: boolean
  giantKill?: boolean
}

export type Challenge = {
  id: string
  name: string
  description: string
  /** which competition the challenge belongs to */
  scope: "league" | "cup"
  test: (c: ChallengeContext) => boolean
}

export const CHALLENGES: Challenge[] = [
  {
    id: "champions",
    name: "Champions",
    scope: "league",
    description: "Win the league (finish 1st).",
    test: (c) => c.position === 1,
  },
  {
    id: "invincibles",
    name: "The Invincibles",
    scope: "league",
    description: "Complete the season unbeaten.",
    test: (c) => c.unbeaten,
  },
  {
    id: "ninety-pts",
    name: "Ninety Club",
    scope: "league",
    description: "Finish on 90 points or more.",
    test: (c) => c.points >= 90,
  },
  {
    id: "fortress",
    name: "Fortress",
    scope: "league",
    description: "Keep 18+ clean sheets in the season.",
    test: (c) => c.cleanSheets >= 18,
  },
  {
    id: "golden-boot",
    name: "Golden Boot",
    scope: "league",
    description: "Have a player score 25+ goals.",
    test: (c) => c.topScorerGoals >= 25,
  },
  {
    id: "hard-way",
    name: "The Hard Way",
    scope: "league",
    description: "Win the league on Gaffer difficulty (ratings hidden).",
    test: (c) => c.position === 1 && c.difficultyId === "gaffer",
  },
  {
    id: "underdogs",
    name: "Underdogs",
    scope: "league",
    description: "Finish top 4 with a squad rating under 80.",
    test: (c) => c.position <= 4 && c.squadRating < 80,
  },
  {
    id: "world-champions",
    name: "World Champions",
    scope: "cup",
    description: "Win the Cup run — lift the trophy.",
    test: (c) => !!c.champion,
  },
  {
    id: "giant-killers",
    name: "Giant Killers",
    scope: "cup",
    description: "Knock out a squad rated above your XI.",
    test: (c) => !!c.giantKill,
  },
]

export const ERAS = [
  "All eras",
  "1930s",
  "1950s",
  "1960s",
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "2010s",
  "2020s",
]
