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
}

export type Challenge = {
  id: string
  name: string
  description: string
  test: (c: ChallengeContext) => boolean
}

export const CHALLENGES: Challenge[] = [
  {
    id: "champions",
    name: "Champions",
    description: "Win the league (finish 1st).",
    test: (c) => c.position === 1,
  },
  {
    id: "invincibles",
    name: "The Invincibles",
    description: "Complete the season unbeaten.",
    test: (c) => c.unbeaten,
  },
  {
    id: "ninety-pts",
    name: "Ninety Club",
    description: "Finish on 90 points or more.",
    test: (c) => c.points >= 90,
  },
  {
    id: "fortress",
    name: "Fortress",
    description: "Keep 18+ clean sheets in the season.",
    test: (c) => c.cleanSheets >= 18,
  },
  {
    id: "golden-boot",
    name: "Golden Boot",
    description: "Have a player score 25+ goals.",
    test: (c) => c.topScorerGoals >= 25,
  },
  {
    id: "hard-way",
    name: "The Hard Way",
    description: "Win the league on Gaffer difficulty (ratings hidden).",
    test: (c) => c.position === 1 && c.difficultyId === "gaffer",
  },
  {
    id: "underdogs",
    name: "Underdogs",
    description: "Finish top 4 with a squad rating under 80.",
    test: (c) => c.position <= 4 && c.squadRating < 80,
  },
]

// ---------- Helpers ----------

let _seq = 0
function p(name: string, pos: Position, rating: number, peak?: number): Player {
  _seq += 1
  return { id: `pl_${_seq}`, name, pos, rating, peak: peak ?? Math.min(99, rating + 3) }
}

// ---------- Placeholder pool ----------
// A spread of recognisable club-seasons. Ratings are illustrative.

export const CLUB_SEASONS: ClubSeason[] = [
  {
    id: "ars-0304",
    club: "Arsenal",
    season: "2003/04",
    mode: "pl",
    era: "2000s",
    color: "#e4002b",
    players: [
      p("J. Lehmann", "GK", 84),
      p("A. Cole", "DEF", 86),
      p("S. Campbell", "DEF", 87),
      p("K. Touré", "DEF", 84),
      p("L. Lauren", "DEF", 81),
      p("Gilberto", "MID", 83),
      p("P. Vieira", "MID", 91),
      p("R. Pirès", "MID", 88),
      p("F. Ljungberg", "MID", 85),
      p("D. Bergkamp", "FWD", 89),
      p("T. Henry", "FWD", 95),
      p("J. Reyes", "FWD", 80),
    ],
  },
  {
    id: "mun-9899",
    club: "Man United",
    season: "1998/99",
    mode: "pl",
    era: "1990s",
    color: "#da291c",
    players: [
      p("P. Schmeichel", "GK", 90),
      p("D. Irwin", "DEF", 83),
      p("J. Stam", "DEF", 88),
      p("R. Johnsen", "DEF", 80),
      p("G. Neville", "DEF", 82),
      p("R. Keane", "MID", 91),
      p("P. Scholes", "MID", 89),
      p("D. Beckham", "MID", 90),
      p("R. Giggs", "MID", 89),
      p("A. Cole", "FWD", 86),
      p("D. Yorke", "FWD", 85),
      p("O. Solskjær", "FWD", 82),
    ],
  },
  {
    id: "che-0405",
    club: "Chelsea",
    season: "2004/05",
    mode: "pl",
    era: "2000s",
    color: "#034694",
    players: [
      p("P. Čech", "GK", 89),
      p("W. Gallas", "DEF", 84),
      p("J. Terry", "DEF", 89),
      p("R. Carvalho", "DEF", 85),
      p("P. Ferreira", "DEF", 80),
      p("C. Makélélé", "MID", 87),
      p("F. Lampard", "MID", 91),
      p("A. Robben", "MID", 86),
      p("D. Duff", "MID", 83),
      p("D. Drogba", "FWD", 88),
      p("E. Gudjohnsen", "FWD", 83),
      p("J. Cole", "MID", 82),
    ],
  },
  {
    id: "lei-1516",
    club: "Leicester City",
    season: "2015/16",
    mode: "pl",
    era: "2010s",
    color: "#003090",
    players: [
      p("K. Schmeichel", "GK", 82),
      p("C. Fuchs", "DEF", 79),
      p("W. Morgan", "DEF", 77),
      p("R. Huth", "DEF", 78),
      p("D. Simpson", "DEF", 76),
      p("N'Golo Kanté", "MID", 88),
      p("D. Drinkwater", "MID", 80),
      p("M. Albrighton", "MID", 77),
      p("Riyad Mahrez", "MID", 88),
      p("J. Vardy", "FWD", 87),
      p("S. Okazaki", "FWD", 76),
      p("L. Ulloa", "FWD", 75),
    ],
  },
  {
    id: "liv-0506",
    club: "Liverpool",
    season: "2005/06",
    mode: "pl",
    era: "2000s",
    color: "#c8102e",
    players: [
      p("J. Reina", "GK", 85),
      p("J. Riise", "DEF", 80),
      p("J. Carragher", "DEF", 85),
      p("S. Hyypiä", "DEF", 84),
      p("S. Finnan", "DEF", 80),
      p("X. Alonso", "MID", 88),
      p("S. Gerrard", "MID", 92),
      p("M. Sissoko", "MID", 79),
      p("L. García", "MID", 80),
      p("F. Morientes", "FWD", 82),
      p("P. Crouch", "FWD", 79),
      p("D. Kuyt", "FWD", 81),
    ],
  },
  {
    id: "mci-1718",
    club: "Man City",
    season: "2017/18",
    mode: "pl",
    era: "2010s",
    color: "#6cabdd",
    players: [
      p("Ederson", "GK", 87),
      p("K. Walker", "DEF", 85),
      p("N. Otamendi", "DEF", 82),
      p("A. Laporte", "DEF", 84),
      p("F. Delph", "DEF", 78),
      p("Fernandinho", "MID", 86),
      p("K. De Bruyne", "MID", 93),
      p("D. Silva", "MID", 89),
      p("L. Sané", "MID", 84),
      p("R. Sterling", "FWD", 85),
      p("S. Agüero", "FWD", 90),
      p("G. Jesus", "FWD", 81),
    ],
  },
  // ----- World Cup XI -----
  {
    id: "bra-1970",
    club: "Brazil",
    season: "1970",
    mode: "world",
    era: "1970s",
    color: "#ffdf00",
    players: [
      p("Félix", "GK", 78),
      p("Carlos Alberto", "DEF", 88),
      p("Brito", "DEF", 80),
      p("Piazza", "DEF", 81),
      p("Everaldo", "DEF", 79),
      p("Clodoaldo", "MID", 82),
      p("Gérson", "MID", 86),
      p("Rivelino", "MID", 88),
      p("Jairzinho", "FWD", 89),
      p("Pelé", "FWD", 96),
      p("Tostão", "FWD", 85),
    ],
  },
  {
    id: "fra-1998",
    club: "France",
    season: "1998",
    mode: "world",
    era: "1990s",
    color: "#0055a4",
    players: [
      p("F. Barthez", "GK", 84),
      p("B. Lizarazu", "DEF", 84),
      p("M. Desailly", "DEF", 87),
      p("L. Blanc", "DEF", 85),
      p("L. Thuram", "DEF", 87),
      p("D. Deschamps", "MID", 84),
      p("E. Petit", "MID", 83),
      p("Zinedine Zidane", "MID", 95),
      p("Y. Djorkaeff", "MID", 85),
      p("T. Henry", "FWD", 86),
      p("S. Guivarc'h", "FWD", 75),
    ],
  },
  {
    id: "spa-2010",
    club: "Spain",
    season: "2010",
    mode: "world",
    era: "2010s",
    color: "#aa151b",
    players: [
      p("I. Casillas", "GK", 90),
      p("J. Capdevila", "DEF", 80),
      p("C. Puyol", "DEF", 87),
      p("G. Piqué", "DEF", 86),
      p("S. Ramos", "DEF", 88),
      p("S. Busquets", "MID", 85),
      p("Xabi Alonso", "MID", 87),
      p("Xavi", "MID", 92),
      p("Andrés Iniesta", "MID", 92),
      p("David Villa", "FWD", 88),
      p("Pedro", "FWD", 81),
    ],
  },
  {
    id: "arg-1986",
    club: "Argentina",
    season: "1986",
    mode: "world",
    era: "1980s",
    color: "#75aadb",
    players: [
      p("N. Pumpido", "GK", 78),
      p("J. Brown", "DEF", 79),
      p("O. Ruggeri", "DEF", 83),
      p("J. Cuciuffo", "DEF", 77),
      p("R. Giusti", "MID", 80),
      p("S. Batista", "MID", 80),
      p("H. Enrique", "MID", 80),
      p("J. Burruchaga", "MID", 84),
      p("Diego Maradona", "MID", 97),
      p("J. Valdano", "FWD", 84),
      p("P. Pasculli", "FWD", 78),
    ],
  },
  // ----- Club XI (European & world club greats) -----
  {
    id: "ajx-9495",
    club: "Ajax",
    season: "1994/95",
    mode: "club",
    era: "1990s",
    color: "#d2122e",
    players: [
      p("E. van der Sar", "GK", 86),
      p("F. de Boer", "DEF", 85),
      p("D. Blind", "DEF", 82),
      p("M. Reiziger", "DEF", 81),
      p("F. Rijkaard", "DEF", 87),
      p("E. Davids", "MID", 84),
      p("C. Seedorf", "MID", 85),
      p("R. de Boer", "MID", 83),
      p("Finidi George", "MID", 82),
      p("Patrick Kluivert", "FWD", 84),
      p("Jari Litmanen", "FWD", 88),
    ],
  },
  {
    id: "dor-1213",
    club: "B. Dortmund",
    season: "2012/13",
    mode: "club",
    era: "2010s",
    color: "#fde100",
    players: [
      p("R. Weidenfeller", "GK", 82),
      p("M. Schmelzer", "DEF", 80),
      p("M. Hummels", "DEF", 87),
      p("N. Subotić", "DEF", 83),
      p("Łukasz Piszczek", "DEF", 82),
      p("S. Bender", "MID", 80),
      p("İlkay Gündoğan", "MID", 84),
      p("M. Götze", "MID", 85),
      p("Marco Reus", "MID", 87),
      p("J. Błaszczykowski", "MID", 82),
      p("Robert Lewandowski", "FWD", 89),
    ],
  },
  {
    id: "mil-8889",
    club: "AC Milan",
    season: "1988/89",
    mode: "club",
    era: "1980s",
    color: "#fb090b",
    players: [
      p("G. Galli", "GK", 80),
      p("Mauro Tassotti", "DEF", 81),
      p("Franco Baresi", "DEF", 92),
      p("Alessandro Costacurta", "DEF", 85),
      p("Paolo Maldini", "DEF", 92),
      p("Carlo Ancelotti", "MID", 83),
      p("Frank Rijkaard", "MID", 88),
      p("Roberto Donadoni", "MID", 84),
      p("Ruud Gullit", "FWD", 92),
      p("Marco van Basten", "FWD", 95),
      p("Pietro Paolo Virdis", "FWD", 79),
    ],
  },
  {
    id: "bar-1011",
    club: "Barcelona",
    season: "2010/11",
    mode: "club",
    era: "2010s",
    color: "#a50044",
    players: [
      p("V. Valdés", "GK", 86),
      p("Dani Alves", "DEF", 87),
      p("Gerard Piqué", "DEF", 88),
      p("Carles Puyol", "DEF", 87),
      p("Éric Abidal", "DEF", 83),
      p("Sergio Busquets", "MID", 86),
      p("Xavi", "MID", 92),
      p("Andrés Iniesta", "MID", 92),
      p("Pedro", "FWD", 83),
      p("Lionel Messi", "FWD", 97),
      p("David Villa", "FWD", 88),
    ],
  },
  {
    id: "rma-1617",
    club: "Real Madrid",
    season: "2016/17",
    mode: "club",
    era: "2010s",
    color: "#febe10",
    players: [
      p("Keylor Navas", "GK", 84),
      p("Dani Carvajal", "DEF", 84),
      p("Sergio Ramos", "DEF", 90),
      p("Raphaël Varane", "DEF", 85),
      p("Marcelo", "DEF", 87),
      p("Casemiro", "MID", 86),
      p("Toni Kroos", "MID", 89),
      p("Luka Modrić", "MID", 89),
      p("Isco", "MID", 85),
      p("Karim Benzema", "FWD", 88),
      p("Cristiano Ronaldo", "FWD", 95),
    ],
  },
  {
    id: "juv-1718",
    club: "Juventus",
    season: "2017/18",
    mode: "club",
    era: "2010s",
    color: "#d9d9d9",
    players: [
      p("Gianluigi Buffon", "GK", 88),
      p("Alex Sandro", "DEF", 83),
      p("Giorgio Chiellini", "DEF", 88),
      p("Leonardo Bonucci", "DEF", 86),
      p("Andrea Barzagli", "DEF", 83),
      p("Miralem Pjanić", "MID", 84),
      p("Sami Khedira", "MID", 82),
      p("Blaise Matuidi", "MID", 82),
      p("Douglas Costa", "MID", 84),
      p("Paulo Dybala", "FWD", 87),
      p("Gonzalo Higuaín", "FWD", 86),
    ],
  },
  // ----- More Premier League sides -----
  {
    id: "blb-9495",
    club: "Blackburn Rovers",
    season: "1994/95",
    mode: "pl",
    era: "1990s",
    color: "#009ee0",
    players: [
      p("Tim Flowers", "GK", 82),
      p("Graeme Le Saux", "DEF", 82),
      p("Colin Hendry", "DEF", 83),
      p("Henning Berg", "DEF", 80),
      p("Jeff Kenna", "DEF", 77),
      p("Stuart Ripley", "MID", 78),
      p("Tim Sherwood", "MID", 81),
      p("Mark Atkins", "MID", 76),
      p("Jason Wilcox", "MID", 78),
      p("Alan Shearer", "FWD", 92),
      p("Chris Sutton", "FWD", 85),
    ],
  },
  {
    id: "new-9596",
    club: "Newcastle United",
    season: "1995/96",
    mode: "pl",
    era: "1990s",
    color: "#241f20",
    players: [
      p("Pavel Srníček", "GK", 79),
      p("John Beresford", "DEF", 78),
      p("Philippe Albert", "DEF", 82),
      p("Steve Howey", "DEF", 80),
      p("Warren Barton", "DEF", 78),
      p("David Batty", "MID", 81),
      p("Rob Lee", "MID", 82),
      p("Peter Beardsley", "MID", 86),
      p("David Ginola", "MID", 86),
      p("Les Ferdinand", "FWD", 86),
      p("Faustino Asprilla", "FWD", 84),
    ],
  },
  {
    id: "liv-1920",
    club: "Liverpool",
    season: "2019/20",
    mode: "pl",
    era: "2010s",
    color: "#c8102e",
    players: [
      p("Alisson", "GK", 90),
      p("Andrew Robertson", "DEF", 87),
      p("Virgil van Dijk", "DEF", 91),
      p("Joe Gomez", "DEF", 82),
      p("Trent Alexander-Arnold", "DEF", 87),
      p("Fabinho", "MID", 86),
      p("Jordan Henderson", "MID", 85),
      p("Georginio Wijnaldum", "MID", 84),
      p("Sadio Mané", "FWD", 90),
      p("Roberto Firmino", "FWD", 86),
      p("Mohamed Salah", "FWD", 91),
    ],
  },
]

export const ERAS = [
  "All eras",
  "1930s",
  "1950s",
  "1960s",
  "1970s",
  "1980s",
  "2000s",
  "2010s",
  "2020s",
]
