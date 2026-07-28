export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
export type Division = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** One season of a player's career, recorded at season end. */
export interface CareerEntry {
  year: number;
  club: string;
  apps: number;
  goals: number;
}

/** A player record. Static attributes come from the dataset; form/injury/club
 *  are dynamic and live in the save. */
export interface Player {
  id: number;
  name: string;
  nat: string;
  pos: Position;
  role: string; // detailed role: GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST
  /** Specialized tactical role (e.g., 'cb_playmaker', 'st_poacher'). Overrides basic role if set. */
  tacticalRole?: string;
  rating: number;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  age: number;
  value: number;
  wage: number; // weekly wage
  clubId: number; // 0 = free agent
  form: number; // 0.85–1.15 multiplier, drifts weekly
  injuryWeeks: number; // 0 = fit
  contractYears: number; // seasons left on contract
  apps: number; // appearances this season
  goals: number; // goals this season
  /** Season year the loan ends; while set the player is away on loan. */
  onLoanUntil?: number;
  career: CareerEntry[];
  /** Sum/count of match ratings this season (average = sum/count). */
  seasonRatingSum?: number;
  seasonRatingCount?: number;
  /** Wants more minutes or a move — attracts extra transfer interest. */
  unhappy?: boolean;
}

export interface Club {
  id: number;
  name: string;
  code: string;
  color: string;
  division: Division;
  playerIds: number[];
}

export interface SlotDef {
  pos: Position;
  label: string; // GK, LB, CB, CM, ST ...
  x: number; // 0–100 across pitch (left–right)
  y: number; // 0–100 up pitch (0 = own goal line)
}

export interface FormationDef {
  id: string; // '4-3-3'
  name: string;
  slots: SlotDef[]; // always 11, slot 0 is GK
}

export type TacticStyle = 'defensive' | 'balanced' | 'attacking';
export type Pressing = 'low' | 'mid' | 'high';
export type Tempo = 'slow' | 'normal' | 'fast';
export type Width = 'narrow' | 'standard' | 'wide';

export interface Tactics {
  style: TacticStyle;
  pressing: Pressing;
  tempo: Tempo;
  width: Width;
  /** Team mentality (tick engine). Defaults to 'balanced' for older saves. */
  mentality?: 'ultra-defensive' | 'defensive' | 'balanced' | 'attacking' | 'ultra-attacking';
}

export type TrainingFocus = 'balanced' | 'attack' | 'defense' | 'fitness';

export interface Fixture {
  round: number; // 1-based
  homeId: number;
  awayId: number;
  played: boolean;
  homeGoals: number;
  awayGoals: number;
}

export type MatchEventType = 'goal' | 'chance' | 'card' | 'injury' | 'info';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  clubId: number; // 0 for neutral events (kickoff etc.)
  text: string;
  playerId?: number; // scorer for goal events
}

export interface MatchReport {
  homeId: number;
  awayId: number;
  homeGoals: number;
  awayGoals: number;
  homeXG: number;
  awayXG: number;
  events: MatchEvent[];
  homeLineup: number[]; // player ids who took part
  awayLineup: number[];
  /** Event-weighted match ratings from the tick engine (absent in old saves). */
  ratings?: Record<number, number>;
}

export interface TableRow {
  clubId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

/** An AI club's bid for one of the user's players. Valid for the current week. */
export interface TransferOffer {
  playerId: number;
  fromClubId: number;
  amount: number;
}

/** A single tie in a knockout competition. */
export interface CupTie {
  homeId: number;
  awayId: number;
  played: boolean;
  homeGoals: number;
  awayGoals: number;
  /** Winner on penalties when the tie was drawn. */
  pensWinnerId?: number;
}

/** A knockout competition (domestic cup, continental cup). */
export interface Knockout {
  name: string;
  /** Calendar week each round is played (weeks[i] = round i). */
  weeks: number[];
  /** rounds[i] exists once round i is drawn. */
  rounds: CupTie[][];
  /** Clubs with a bye into round 2 (domestic cup only). */
  byes: number[];
  /** Index of the next round to be played. */
  round: number;
  winnerId: number | null;
}

export interface LedgerEntry {
  week: number;
  desc: string;
  amount: number; // positive = income
}

export interface Manager {
  name: string;
  reputation: number; // 0–100
  wins: number;
  draws: number;
  losses: number;
  seasons: number;
  trophies: string[];
}

export interface Board {
  objective: string;
  minPosition: number; // finish at or above this to satisfy the board
  confidence: number; // 0–100; too low = sacked at season end
}

export interface JobOffer {
  clubId: number;
  note: string;
}

export interface ClubRecords {
  biggestWin: { text: string; margin: number } | null;
  bestFinish: { year: number; division: Division; position: number } | null;
  topSeasonScorer: { name: string; goals: number; year: number } | null;
}

/** All-time contribution of a player at the user's club (legends list). */
export interface LegacyEntry {
  name: string;
  apps: number;
  goals: number;
}

export interface SeasonSummary {
  year: number;
  division: Division;
  position: number;
  pts: number;
  champions: boolean;
  promoted: boolean;
  relegated: boolean;
  prize: number;
  objective: string;
  objectiveMet: boolean;
  sacked: boolean;
  cupRun: string | null;
  continentalRun: string | null;
  /** End-of-season award headlines (golden boot, player of the season …). */
  awards?: string[];
}

/** Backroom staff levels (0 = vacant, 1–3). */
export interface Staff {
  coach: number;
  physio: number;
  scout: number;
}

export interface DualFormation {
  /** Formation when team has possession. */
  inPossessionId: string;
  /** Formation when team is defending. */
  outOfPossessionId: string;
}

export interface GameState {
  version: 2;
  userClubId: number;
  seasonYear: number;
  /** Next round to be played, 1..SEASON_ROUNDS. > SEASON_ROUNDS means season over. */
  week: number;
  budget: number;
  morale: number; // 30–95 team morale
  formationId: string; // legacy, keep for backwards compat
  /** Player id per formation slot (11 entries). null = empty slot. */
  lineup: (number | null)[];
  /** Dual-formation tactics (IP/OOP shapes). */
  dualFormation?: DualFormation;
  tactics: Tactics;
  training: TrainingFocus;
  chemistry: number; // 0–100 team chemistry
  fanConfidence: number; // 0–100
  board: Board;
  manager: Manager;
  academyLevel: number; // 1–3
  /** Squad captain (player id). Leaders make better captains. */
  captainId?: number | null;
  staff?: Staff;
  stadiumLevel?: number; // 1–3, scales gate income
  ledger: LedgerEntry[];
  cup: Knockout;
  continental: Knockout;
  jobOffers: JobOffer[];
  records: ClubRecords;
  legacy: Record<number, LegacyEntry>;
  nextPlayerId: number; // for youth academy generation
  players: Record<number, Player>;
  clubs: Club[];
  fixtures: { d1: Fixture[]; d2: Fixture[]; d3: Fixture[]; d4: Fixture[]; d5: Fixture[]; d6: Fixture[]; d7: Fixture[]; d8: Fixture[]; d9: Fixture[]; d10: Fixture[] };
  incomingOffers: TransferOffer[];
  history: SeasonSummary[];
  news: string[];
  /** Structured inbox items (news you can open into a full article + player card). */
  inbox: InboxItem[];
  nextInboxId: number;
  /** Season week the press conference was last done, so it offers once per fixture. */
  pressWeek: number;
  /** User display/gameplay preferences. */
  settings?: GameSettings;
}

export type InboxCategory = 'club' | 'transfer' | 'injury' | 'contract' | 'youth' | 'board' | 'match' | 'press';

export interface InboxItem {
  id: number;
  week: number;
  seasonYear: number;
  category: InboxCategory;
  title: string;
  body: string;
  /** Player this article is about, shown as a card alongside the text. */
  playerId?: number;
  read: boolean;
}

export type MatchSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface GameSettings {
  /** Match clock tick speed. */
  matchSpeed: MatchSpeed;
  /** Whether to show the live commentary feed during matches. */
  showCommentary: boolean;
  /** Whether to auto-sim AI matches without a play button. */
  autoSimMatches: boolean;
  /** Whether to show the 2D pitch canvas during matches. */
  show2DPitch: boolean;
  /** Show team talk prompt at half time. */
  showTeamTalks: boolean;
  /** AI opponent difficulty multiplier (0.85 = easy, 1.0 = normal, 1.15 = hard). */
  difficulty: number;
}

export interface AvatarConfig {
  skinTone: string;
  eyeColor: string;
  hairColor: string;
  hairStyle: string;
  facialHair: string;
  mouth: string;
  eyes: string;
  nose: string;
  accessories?: string[];
}

export interface ManagerProfile {
  id: string;
  name: string;
  avatarConfig: AvatarConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameData {
  meta: { attribution: string; clubCount: number; playerCount: number };
  clubs: Club[];
  players: (Omit<Player, 'form' | 'injuryWeeks' | 'contractYears' | 'apps' | 'goals' | 'career' | 'wage'> & {
    wage?: number;
  })[];
}
