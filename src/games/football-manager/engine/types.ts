export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

/** Named play-style identity. `balanced` and `parkbus` need no drilling — they
 *  are the fallbacks a side reverts to. See engine/familiarity.ts. */
export type PlayStyle =
  | 'balanced' | 'parkbus'
  | 'direct' | 'possession' | 'tiki-taka' | 'counter'
  | 'gegenpressing' | 'longball' | 'catenaccio';

/** Per-club drilling state: how familiar the squad is with each style and
 *  shape, 0–100. */
export interface TacFam {
  styles: Partial<Record<PlayStyle, number>>;
  formations: Record<string, number>;
  lastStyle: PlayStyle | null;
  lastFormation: string | null;
}

/** Legacy division number, kept only for the raw dataset (gamedata.json) and
 *  the pre-v4 save migration. Live game state keys off `LeagueDef.id`. */
export type Division = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * One league in the pyramid. Structure, promotion/relegation counts, UEFA slot
 * allocation and TV equal share are ported from the reference implementation;
 * see LEAGUES in engine/gameRules.ts.
 */
export interface LeagueDef {
  id: string;
  name: string;
  country: string;
  /** 1 = top flight of its country. */
  level: number;
  /** How many clubs the league holds. */
  clubCount: number;
  /** Times every club plays every other club (2 = normal double round-robin,
   *  3 = Scottish Premiership pre-split, 4 = Scottish Championship). */
  rounds: number;
  /** Scotland only: after `rounds` full rounds the league splits into a top
   *  and bottom half of this size, who play each other once more and cannot
   *  cross the split. */
  splitSize?: number;
  /** Clubs promoted automatically from the top of the table. */
  autoPromotion: number;
  /** Clubs entering the promotion play-off bracket, below the auto spots. */
  playoffSpots: number;
  /** Clubs relegated automatically from the bottom of the table. */
  relegation: number;
  /** Set on the UPPER league: id of the league below whose qualifier its
   *  lowest safe club faces (Bundesliga Relegationsspiele, Ligue 1 barrage). */
  interPlayoff?: string;
  /** Set on the LOWER league: id of the league above it feeds a challenger to. */
  interPlayoffFeeder?: string;
  /** How many clubs below the auto-promotion spots contest that challenger
   *  place (1 = straight into the tie, 3 = a 3rd–5th mini bracket). */
  interPlayoffFeederSpots?: number;
  /** UEFA slot allocation. */
  championsLeague: number;
  clPlayoff: number;
  europaLeague: number;
  conferenceLeague: number;
  /** Broadcast equal share, £m per club per season. */
  tvEqualShare: number;

  /* --- engine extensions (not in the reference's own LEAGUES map) --------- */
  /** Not simulated: no fixtures, hidden from the UI. Exists as a dormant pool
   *  feeding the league above with promotion/relegation churn. */
  phantom?: boolean;
  /** Transfer budget a club in this league starts with. */
  startingBudget: number;
  /** Weekly gate income baseline. */
  gateBase: number;
  /** Prize money for finishing 1st, and the reduction per place below that. */
  prizeTop: number;
  prizeStep: number;
}

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
  /** Ceiling this player can develop toward. Never exceeded by `rating`. Cap 99. */
  potential: number;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  /** Keeper-only attributes (low filler values for outfield players). */
  gkReflexes: number;
  gkPositioning: number;
  /** Height in cm. */
  height: number;
  /** Secondary detailed roles the player can cover naturally (e.g. ['LM']). */
  altPos: string[];
  age: number;
  value: number;
  wage: number; // weekly wage
  clubId: number; // 0 = free agent
  form: number; // 0.85–1.15 multiplier, drifts weekly
  injuryWeeks: number; // 0 = fit
  /** Remaining layoff in DAYS — the real precision behind `injuryWeeks`,
   *  which is kept in sync as `ceil(injuryDays / 7)`. */
  injuryDays?: number;
  /** `INJURY_TYPES` id of the current layoff (null/undefined when fit). */
  injuryType?: string | null;
  contractYears: number; // seasons left on contract
  /** Contract expiry as an ISO date (YYYY-MM-DD), always snapped to a
   *  31 Jan / 30 Jun transfer window. Kept in sync with `contractYears`. */
  contractEnd: string;
  /** Fee that automatically buys the player out of his contract. 0 = none. */
  releaseClause: number;
  /** A loyal player resists moves and accepts smaller pay rises. */
  loyal: boolean;
  /** Placed on the transfer list by his club. */
  transferListed: boolean;
  /** Has asked to leave. */
  wantsMove: boolean;
  /** Squad status promised to him ('star' | 'important' | 'rotation' | …). */
  promisedStatus: string | null;
  /** Personal retirement age (35–43 outfield, 35–47 GK). */
  retireAge: number;
  /** Individual morale 0–100. */
  morale: number;
  /** Physical condition 0–100. */
  fitness: number;
  /** Match sharpness 0–100. */
  sharpness: number;
  /** Squad familiarity 0–100. */
  chem: number;
  apps: number; // appearances this season
  goals: number; // goals this season
  assists: number; // assists this season
  cleanSheets: number; // clean sheets this season (GK/DEF)
  saves: number; // saves this season (GK)
  /** Domestic-league-only mirrors of apps/goals, so national awards ignore
   *  cup and European games. */
  lgApps: number;
  lgGoals: number;
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
  /** LeagueDef.id this club is registered in. Exactly one, always. */
  leagueId: string;
  playerIds: number[];
  /** Dormant club sitting in a phantom league's pool — no fixtures, no
   *  transfer activity, waiting to rotate up. */
  dormant?: boolean;

  /* --- Phase 5: tactical identity and drilling. All optional; a save without
     them behaves as a 'balanced' side, which needs no drilling. --- */
  /** Named play-style this club is drilled in. */
  playStyle?: PlayStyle;
  /** Formation this club habitually sets up in. */
  formationId?: string;
  /** Club standing 1–5, used to scale AI drilling speed. */
  reputation?: number;
  /** Per-style and per-formation familiarity, 0–100. */
  tacFam?: TacFam;
}

/** A club as it appears in the raw dataset, still keyed by division number. */
export interface DataClub {
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

  /* --- Phase 4: the instructions the tactical xG chain reads. All optional
     with a neutral default so pre-v5 saves behave exactly as before. --- */
  /** How high the back line holds. */
  defLine?: DefLine;
  /** Which channel play is aimed through — matched against opponent width. */
  focus?: AttackFocus;
  /** Playing out from the back vs going long — gated on the XI's passing. */
  buildUp?: BuildUp;
  /** Passing directness — gated on the XI's passers. Named `passingStyle` to
   *  avoid colliding with the `pressing` field's naming. */
  passingStyle?: PassingStyle;
  /** Forward runs — gated on the XI's pace and the opponent's line. */
  runs?: RunStyle;
  /** Challenge intensity: card risk traded for recoveries. */
  tackling?: Tackling;

  /* --- Phase 5: set pieces. Optional throughout — an absent block means
     "pick sensible defaults", which is what every pre-v6 save gets. --- */
  setPieces?: SetPieceSetup;
}

/** Dead-ball setup: who takes them, how they're delivered, and who does what
 *  in the box at both ends. */
export interface SetPieceSetup {
  /** Designated takers, by player id. Ignored if the man isn't in the XI. */
  penalties?: number;
  corners?: number;
  fkShoot?: number;
  fkDeliver?: number;
  cornerRoutine?: 'near-post' | 'far-post' | 'drilled' | 'short' | 'edge-of-box';
  cornerDefense?: 'zonal' | 'man' | 'mixed';
  /** Attacking box assignment per player id. */
  boxJobs?: Record<number, 'far' | 'near' | 'six' | 'edge' | 'back'>;
  /** Defensive box assignment per player id. */
  defJobs?: Record<number, 'post' | 'mark' | 'zone' | 'edge' | 'up'>;
}

export type DefLine = 'deep' | 'normal' | 'high';
export type AttackFocus = 'flanks' | 'mixed' | 'middle';
export type BuildUp = 'play-out' | 'balanced' | 'long';
export type PassingStyle = 'short' | 'mixed' | 'through-balls';
export type RunStyle = 'into-feet' | 'balanced' | 'in-behind';
export type Tackling = 'cautious' | 'normal' | 'aggressive';

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

  /* --- Phase 4: shot-level detail, so PitchCanvas can plot true positions
     and the season loop can apply real injuries. All optional — pre-v5
     reports simply lack them. --- */
  /** Metres out from the goal being attacked (0 = on the line). */
  gx?: number;
  /** Metres left/right of the middle of that goal (0 = dead centre). */
  gy?: number;
  /** Expected goals for this shot, 0–1. Never exceeds 1.0. */
  xg?: number;
  /** Shot archetype id (`tap_in`, `one_on_one`, `header_cross`, …). */
  archetype?: string;
  /** How the ball was struck. */
  contact?: 'header' | 'volley' | 'foot';
  /** Assisting player for a goal. */
  assistId?: number;
  /** Injury detail (injury events only). */
  injuryType?: string;
  injuryDays?: number;
  /** Potential the injury permanently costs (ACL: 3). */
  potDrop?: number;
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
  bestFinish: { year: number; leagueId: string; level: number; position: number } | null;
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
  leagueId: string;
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
  version: 6;
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
  /** Phase 5: the user club's named play-style identity. Optional so pre-v6
   *  saves default to 'balanced', which needs no drilling. */
  playStyle?: PlayStyle;
  fanConfidence: number; // 0–100
  board: Board;
  manager: Manager;
  /** Cosmetic manager avatar + name, travels with the save slot (per career,
   *  not per device — a manager who moves clubs keeps his face). Optional so
   *  older saves without one still load. */
  managerProfile?: ManagerProfile;
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
  /** League fixtures keyed by LeagueDef.id. Phantom leagues hold none. */
  fixtures: Record<string, Fixture[]>;
  /** Dormant club ids queued in each phantom league's pool, front first. */
  phantomPools?: Record<string, number[]>;
  /** For split leagues: the frozen [top half, bottom half] club ids, once the
   *  pre-split programme has finished. Clubs cannot cross the split. */
  splitGroups?: Record<string, number[][]>;
  /** Set when the user's club drops out of the bottom of the pyramid the game
   *  simulates — there is nowhere lower to send them. */
  relegatedOutOfPyramid?: boolean;
  /** Next id for a generated filler club. */
  nextClubId?: number;
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
  /** Paired shadow tone for `skinTone`, so shading reads correctly across
   *  every skin colour instead of one flat fill. Optional — falls back to
   *  a computed darken of `skinTone` when absent (older saves). */
  skinShadow?: string;
  eyeColor: string;
  hairColor: string;
  /** Eyebrow colour as its own axis, independent of hair colour. Optional —
   *  falls back to a computed shade of `hairColor` when absent. */
  eyebrowColor?: string;
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
  clubs: DataClub[];
  players: (Omit<
    Player,
    | 'form' | 'injuryWeeks' | 'contractYears' | 'contractEnd' | 'apps' | 'goals'
    | 'assists' | 'cleanSheets' | 'saves' | 'lgApps' | 'lgGoals' | 'career' | 'wage'
    | 'transferListed' | 'wantsMove' | 'promisedStatus' | 'morale' | 'fitness'
    | 'sharpness' | 'chem'
  > & {
    wage?: number;
  })[];
}
