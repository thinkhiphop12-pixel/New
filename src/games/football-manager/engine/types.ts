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
export type Division =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
  | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29;

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
  /** Shirt number, 1–99, unique within the player's current club. Assigned by
   *  `ensureSquadNumbers` and re-filled after transfers; optional so pre-v7
   *  saves load unchanged and simply get numbered on the next week tick. */
  squadNumber?: number;
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
  /** Real-world weekly wage, when known from the source dataset. Used only as
   *  a relative weight by calibrateClubWages (engine/finances.ts) — never
   *  assigned as `wage` directly, since this game's wage economy is
   *  deliberately not real-world scale (see the note atop finances.ts). */
  realWage?: number;
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
  /** Real-world year this player's contract runs until, when known from the
   *  source dataset. Only consulted once, by newGame(), to derive an accurate
   *  starting contractYears/contractEnd instead of a random pick. */
  contractUntil?: number;
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

  /* --- Discipline. Cards were previously counted only inside a single match
     (tickEngine `PlayerCounts`, for ratings) and thrown away at full time, so
     nothing could ever accumulate into a ban. These persist across the season
     and are reset at the rollover. All optional so pre-existing saves load
     unchanged and simply start counting from their next match. --- */
  /** Yellows picked up this season. Every `YELLOW_BAN_STEP` earns a ban. */
  yellowCards?: number;
  /** Reds picked up this season (straight reds and second yellows alike). */
  redCards?: number;
  /** Matches still to sit out. Suspended players cannot be selected. */
  suspendedMatches?: number;
  /** Season year the loan ends; while set the player is away on loan. */
  onLoanUntil?: number;
  career: CareerEntry[];
  /** Sum/count of match ratings this season (average = sum/count). */
  seasonRatingSum?: number;
  seasonRatingCount?: number;
  /** Wants more minutes or a move — attracts extra transfer interest. */
  unhappy?: boolean;
  /** Whether the "contract expiring soon" inbox nudge has already fired for
   *  this player this season — reset at every season rollover, so a player
   *  who re-enters his final contract year later gets warned again. */
  contractWarned?: boolean;

  /* --- Phase 7: transfers. All optional; absent means "nothing going on". --- */
  /** Why he asked to leave. */
  wantsMoveReason?: 'ability' | 'ambition' | 'game_time';
  /** Price his club has advertised him at (user club only). */
  listingPrice?: number | null;
  /** Made available for loan by his club. */
  loanListed?: boolean;
  /** Set while he is at a club that does not own him. */
  loan?: LoanDeal;
  /** Weeks since the squad-status promise was made, and how long it's been broken. */
  promiseWeeks?: number;
  promiseBreachWeeks?: number;

  /* --- Clauses a completed transfer left attached to the registration. All
     optional; absent means the deal carried no clause of that kind. --- */
  /** Share of the profit on any future sale owed back to `sellOnClubId`. */
  sellOnPct?: number;
  sellOnClubId?: number;
  /** Fee at which `buyBackClubId` may re-sign him. 0/absent = no buy-back. */
  buyBackFee?: number;
  buyBackClubId?: number;
  /** Consecutive weeks he has gone without an appearance. */
  benchWeeks?: number;

  /** Career mode: an individual development focus layered on top of the
   *  squad-wide `GameState.training` focus. Absent means "balanced / auto" —
   *  the pre-existing generic per-player roll in seasonProgression.ts. */
  devPlan?: DevPlan;
  /** Season week a "not playing enough"-style complaint last fired for this
   *  player, so the inbox doesn't spam him every week. */
  lastComplaintWeek?: number;
  /** Season week a renewal-conversation nudge (contract window / low morale /
   *  hot form) last fired for this player, so the inbox doesn't spam him
   *  every week. Independent of `contractWarned`, which only covers the
   *  once-a-season "final year" nudge. */
  renewalNudgeWeek?: number;
}

/** A per-player development focus set from `PlayerModal`. `stat` mode
 *  doubles growth odds for `statFocus`; `position` mode counts down
 *  `weeksRemaining` and, on reaching 0, adds `targetPos` to `altPos`. */
export interface DevPlan {
  mode: 'balanced' | 'stat' | 'position';
  statFocus?: 'pac' | 'sho' | 'pas' | 'dri' | 'def' | 'phy';
  targetPos?: string;
  weeksRemaining?: number;
  /** Days left on a position conversion. The day clock's finer-grained
   *  counterpart to `weeksRemaining`, which is kept in sync as
   *  `ceil(daysRemaining / 7)` so every screen already reading weeks keeps
   *  working. Seeded on the next daily tick for a plan set before the
   *  calendar existed. */
  daysRemaining?: number;
  /** Total days the conversion was estimated to take, so progress can be
   *  drawn as a percentage rather than a bare countdown — a retraining plan
   *  used to show the player nothing at all for 8-12 weeks. */
  totalDays?: number;
  /** Accumulated 0..1 progress toward the next +1 on `statFocus`. A stat plan
   *  was previously a 6%-per-week coin flip with no visible movement between
   *  successes; this holds the same expected rate but makes it legible. */
  statProgress?: number;
}

/** A live loan spell, held on the player while he sits in the borrower's squad. */
export interface LoanDeal {
  parentClubId: number;
  parentClubName: string;
  /** Season year the loan runs until (returns at the start of that season). */
  untilSeason: number;
  /** Share of his wage the PARENT still pays (0 = borrower covers everything). */
  wageShare: number;
  /** Agreed playing-time clause, or null for a no-strings loan. */
  playingTime: 'regular' | 'occasional' | null;
  /** Pre-agreed permanent fee the borrower may trigger. 0 = none. */
  optionToBuy: number;
  /** Snapshot of the player's counters the week the loan began. */
  startApps: number;
  startGoals: number;
  /** Borrowing club's games played when the loan began. */
  startClubPlayed: number;
  /** The playing-time clause is currently unmet. */
  clauseBroken?: boolean;
  /** Borrower games played when the warning was issued. */
  warnedGames?: number | null;
}

export type MoveVerdict = 'keen' | 'open' | 'reluctant' | 'refuses';
export type SquadStatusKey = 'star' | 'key' | 'first_team' | 'rotation' | 'fringe';

export interface MoveFactor {
  label: string;
  delta: number;
  detail?: string;
}

export interface MoveAssessment {
  score: number;
  verdict: MoveVerdict;
  factors: MoveFactor[];
  /** What he'd want to be talked into it: squad_status / wage_premium / … */
  demands: string[];
  projectedStatus: SquadStatusKey;
  /** Wage premium a reluctant player prices in. */
  wageMult: number;
}

/** How available a player is, from the buying club's point of view. */
export interface MarketStatus {
  listed: boolean;
  unsettled: boolean;
  unsettledReason: string | null;
  expiring: boolean;
  monthsLeft: number;
}

/** The selling club's and the player's negotiating positions. */
export interface NegotiationTerms {
  asking: number;
  minFee: number;
  wageDemand: number;
  minWage: number;
  feeRound: number;
  wageRound: number;
  /** One-shot chance the club rebuffs a bid that clears its minimum. */
  holdOut: number;
  wageHoldOut: number;
}

export type NegotiationStage = 'fee' | 'terms' | 'loan_terms' | 'outbid';
export type NegotiationTone = 'info' | 'good' | 'bad' | 'you';

export interface NegotiationMsg {
  text: string;
  tone: NegotiationTone;
}

/** One live transfer negotiation — the user buying, or a club bidding for one
 *  of the user's players. */
export interface Negotiation {
  id: string;
  /** `outgoing` = the user is buying; `incoming` = a club is bidding for ours. */
  type: 'outgoing' | 'incoming';
  playerId: number;
  /** The other club: the seller (outgoing) or the bidder (incoming). */
  clubId: number;
  clubName: string;
  playerName: string;
  playerPos: Position;
  playerRating: number;
  stage: NegotiationStage;
  /** Whose move it is. `club` means a reply lands on `responseWeek`. */
  awaiting: 'user' | 'club';
  responseWeek: number | null;
  /** Season round the deal was last touched — stale deals lapse. */
  lastTouchWeek: number;
  neg: NegotiationTerms;
  lastFee: number | null;
  lastWage: number | null;
  agreedFee: number | null;
  agreedWage: number | null;
  contractYears: number;
  promisedStatus: SquadStatusKey | null;
  signingBonus: number;
  releaseClause: number;
  stance: MoveVerdict;
  stanceScore: number;
  demands: string[];
  projectedStatus: SquadStatusKey;
  /** Set once a rival club joins the race for an outgoing target. */
  rival?: { clubId: number; clubName: string; offer: number } | null;
  /** Settles as a pre-contract that activates next season instead of now. */
  preContract?: boolean;
  /** Incoming-only. */
  isLoan?: boolean;
  fee?: number;
  maxWilling?: number;
  lastCounter?: number | null;
  playoffFloor?: number | null;
  marketValue?: number;
  loanWageShare?: number;
  loanPlayingTime?: 'regular' | 'occasional' | null;
  /** Which deal shape this negotiation is: a permanent transfer (the
   *  default, absent on any negotiation from before this field existed —
   *  they were all transfers), a loan, or a loan with a negotiated option
   *  to make it permanent. Drives which fields `NegotiationPanel` shows and
   *  which engine path (`openNegotiation` vs `openLoanNegotiation`)
   *  resolves the stage machine. */
  offerType?: 'transfer' | 'loan' | 'loan_to_buy';
  /** The lending club's minimum terms for an outgoing loan negotiation
   *  (`offerType` loan/loan_to_buy) — set once when talks open, mutated by
   *  `evaluateLoanTermsOffer` as rounds pass, same role `neg`
   *  (`NegotiationTerms`) plays for a permanent transfer's fee/wage haggle. */
  loanTerms?: { minWageShare: number; requiresPlayingTime: boolean; minBuyOption: number; round: number };
  /** The user's current offered buy-option fee, `loan_to_buy` only — becomes
   *  the loan's `PlayerLoanState.optionToBuy` once terms are agreed. */
  buyOptionFee?: number;

  /* --- Clauses attached to the current fee offer. Every one is optional and
     absent means "pure cash bid", which is how every negotiation from before
     these existed deserializes. --- */
  /** Share of a future sale profit promised back to the selling club, 0–0.5. */
  sellOnPct?: number;
  /** Fee at which the seller could buy him back. 0/absent = none offered. */
  buyBackFee?: number;
  /** One of your players offered as part-exchange. */
  exchangePlayerId?: number | null;
  /** Signed now, joins when the season ends, instead of moving immediately. */
  endOfSeason?: boolean;
  log: NegotiationMsg[];
}

/**
 * A deal agreed now that completes at a later season rollover.
 *
 * Two shapes share this record because they activate identically: a genuine
 * pre-contract (a player whose deal lapses, joining for nothing) and an
 * end-of-season transfer (a fee agreed today for a player who stays with his
 * club for the run-in). `fee` is what separates them — absent or 0 is a free.
 */
export interface PreContract {
  id: string;
  playerId: number;
  playerName: string;
  fromClubId: number;
  agreedWage: number;
  agreedYears: number;
  /** Season year the player actually arrives. */
  activatesSeason: number;
  /** Fee agreed for an end-of-season transfer, already paid on agreement.
   *  Absent/0 on a true pre-contract, which is what pre-v8 saves hold. */
  fee?: number;
  /** Clauses that attach to the registration when he finally arrives. */
  sellOnPct?: number;
  buyBackFee?: number;
}

export interface Club {
  id: number;
  name: string;
  code: string;
  /** First-choice kit colour. Stamped from lib/clubColors on load/migration. */
  color: string;
  /** Second kit colour, used for change strips and crest bands. Optional so
   *  a save written before kits existed still deserializes. */
  secondaryColor?: string;
  /** LeagueDef.id this club is registered in. Exactly one, always. */
  leagueId: string;
  playerIds: number[];
  /** Youth-team players attached to this club: not part of the first-team
   *  squad, excluded from `playerIds`-based wage bills, squad-size checks
   *  and lineup/tactics selection. `promoteYouthPlayer` moves an id from
   *  here into `playerIds`. Optional so old saves without a youth squad
   *  still deserialize fine. */
  youthPlayerIds?: number[];
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
  secondaryColor?: string;
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
  /** Which card was shown (card events only). A second yellow is reported as
   *  a `'red'` here and booked as both by `applyDiscipline`. */
  card?: 'yellow' | 'red';
  /** Set on a red that came from a second booking, so the yellow is counted
   *  too rather than being lost behind the sending-off. */
  secondYellow?: boolean;
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

  /* --- Phase 6: stoppage time, extra time, penalty shootouts (gaps 17-18, 27-29). --- */
  /** Added time at the end of the first half, in minutes. */
  stoppage1?: number;
  /** Added time at the end of the second half (or the match, if no ET), in minutes. */
  stoppage2?: number;
  /** Final whistle minute, including all stoppage and (if played) extra time. */
  matchEnd?: number;
  /** True when a decisive-result match went to extra time (still level after 90+stoppage). */
  wentToExtraTime?: boolean;
  /** Present when the match needed a penalty shootout to produce a winner. */
  shootout?: ShootoutResult;
}

/** One kick in a penalty shootout. */
export interface ShootoutKick {
  side: 'home' | 'away';
  playerId: number;
  playerName: string;
  outcome: 'scored' | 'saved' | 'missed';
  round: number; // 0-4 for the first five rounds, 5+ for sudden death
}

/** The full result of a penalty shootout. */
export interface ShootoutResult {
  homeScore: number;
  awayScore: number;
  winnerId: number;
  kicks: ShootoutKick[];
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
  /** True when the tie needed extra time before being settled (with or without pens). */
  wentToExtraTime?: boolean;
  /** Penalty shootout score, when the tie was decided that way. */
  penScore?: { home: number; away: number };
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

/**
 * One continental tie — one match (playoff round onward for the final) or two
 * legs (every round before it). `legs[0]` is always the first leg played;
 * `legs[1]`, if present, has home/away reversed from `legs[0]`.
 */
export interface ContinentalTie {
  id: string;
  homeId: number;
  awayId: number;
  twoLegged: boolean;
  legs: CupTie[];
}

/**
 * The continental competition (Phase 9): a real 24-club bracket rather than a
 * flat top-8 knockout — the top 8 seeds go straight to the Round of 16, the
 * other 16 (seeds 9-24) fight through a two-legged playoff round for the
 * remaining 8 places. Every round from the playoff to the semi-final is
 * two-legged; the final is a single match, standard continental format.
 *
 * Deliberately still a pure knockout, not the reference's full Swiss-model
 * league phase (a round-robin-lite group stage with its own weekly fixture
 * calendar) — that is a substantially larger rewrite than the bracket size,
 * seeding and two-legged ties that actually change how a European run plays
 * out. Left for a later pass; see docs/PFM26_COMPARISON_AND_HANDOVER.md.
 */
export interface Continental {
  name: string;
  /** Calendar week each round's first leg is played; two-legged rounds use
   *  this week and the very next one for leg two. */
  weeks: number[];
  /** ties[i] exists once round i is drawn. Empty until the playoff round or
   *  Round of 16 is reached. */
  ties: ContinentalTie[][];
  /** Seed rank at kickoff (1 = top seed), kept for the whole run so a low
   *  seed that wins through still carries their original ranking into the
   *  next draw's country-protection check. */
  seedRank: Record<number, number>;
  /** The 8 clubs who went straight to the Round of 16. */
  directQualifiers: number[];
  round: number;
  winnerId: number | null;
}

export interface LedgerEntry {
  week: number;
  desc: string;
  amount: number; // positive = income
}

/* =========================================================================
   Phase 8 — finances. Everything below is optional on GameState (`finances?`)
   and lazily initialised by engine/finances.ts, so it is additive and
   version-agnostic: an old save picks it up on the first tick or the first
   render of the Finances screen without a save-version bump.
   ========================================================================= */

/** The three commercial inventory slots a club can sell. */
export type SponsorSlotId = 'shirt' | 'sleeve' | 'stadium';

/** Ticket pricing tier the club sets for home league fixtures. */
export type TicketTier = 'cheap' | 'standard' | 'high' | 'premium';

/** Performance bonus written into a sponsor contract. */
export interface SponsorClause {
  type: 'win' | 'title' | 'topHalf' | 'promotion';
  /** Payout in £. */
  amount: number;
}

export interface SponsorDeal {
  name: string;
  /** 1 regional, 2 national, 3 global — drives the name pool. */
  tier: 1 | 2 | 3;
  slot: SponsorSlotId;
  /** £ per week. */
  weeklyValue: number;
  /** Seasons still to run; decremented at each season rollover. */
  seasonsLeft: number;
  /** Length the deal was signed for, kept for the UI. */
  termSeasons: number;
  clauses: SponsorClause[];
}

export interface KitDeal {
  name: string;
  /** £ per season. */
  annualValue: number;
  seasonsLeft: number;
  termSeasons: number;
}

/** A deal on the table. `negotiated`/`withdrawn` track one negotiation attempt. */
export type SponsorOffer = SponsorDeal & { negotiated?: boolean; withdrawn?: boolean };
export type KitOffer = KitDeal & { negotiated?: boolean; withdrawn?: boolean };

export interface SeasonIncome {
  tv: number;
  matchday: number;
  sponsorship: number;
  merchandise: number;
  prizes: number;
  sales: number;
  parachute: number;
  grants: number;
}

export interface SeasonExpenses {
  wages: number;
  staff: number;
  transfers: number;
  agentFees: number;
  academyUpkeep: number;
  stadiumMaint: number;
}

/** A transfer fee spread across the signed contract length. Accounting only —
 *  the cash left the balance at signing, this only feeds the squad cost ratio. */
export interface Amortization {
  /** £ per week. */
  weeklyCost: number;
  weeksLeft: number;
}

export interface FinanceSeasonRecord {
  year: number;
  leagueId: string;
  position: number;
  income: number;
  expenses: number;
  profit: number;
  balance: number;
  confidence: number;
}

/** One point on the balance sparkline. */
export interface BalancePoint {
  year: number;
  week: number;
  balance: number;
}

export interface FinanceState {
  /** Season this state was last rolled over into — drives lazy season-end
   *  finalisation without a second hook in seasonProgression. */
  seasonYear: number;
  /** League the club was in at the last rollover, for parachute detection. */
  leagueId: string;
  /** Board confidence 0–100 (mirrors and drives `board.confidence`). */
  boardConfidence: number;

  shirt: SponsorDeal | null;
  sleeve: SponsorDeal | null;
  stadium: SponsorDeal | null;
  kitDeal: KitDeal | null;
  /** Slots whose deal expired and need re-selling. */
  needsRenewal: SponsorSlotId[];
  kitNeedsRenewal: boolean;
  /** Live offer sheets, so a negotiation attempt survives a re-render. */
  offers: Partial<Record<SponsorSlotId, SponsorOffer[]>>;
  kitOffers: KitOffer[] | null;

  ticketPricing: TicketTier;

  seasonIncome: SeasonIncome;
  seasonExpenses: SeasonExpenses;
  balanceHistory: BalancePoint[];
  history: FinanceSeasonRecord[];

  /** Net profit for each of the last three completed seasons, oldest first. */
  ffpRolling: number[];
  ffpBreachWeeks: number;
  ffpDeductedThisBreach: boolean;

  amortizations: Amortization[];
  /** Last computed squad cost ratio. */
  scr: number;
  scrOverWeeks: number;
  transferEmbargo: boolean;
  /** Weeks spent under embargo, for the follow-up deduction. */
  embargoWeeks: number;

  /** Points docked this season, applied to the table exactly once. */
  pointsDeduction: number;
  /** Ledger entries already folded into transfers/amortization, so the
   *  ledger scan is idempotent across ticks. */
  seenLedger: string[];

  parachuteYears: number;
  boardFundsRequested: boolean;
  weeksElapsed: number;
}

export type ScenarioId =
  | 'relegation_battle' | 'hollywood' | 'broke' | 'takeover'
  | 'wonderkid_factory' | 'underdog_title' | 'points_deduction';

export type ScenarioStatus = 'active' | 'success' | 'failed';

/** Free-form per-scenario progress data — shape varies by scenario id, kept
 *  as a loose record rather than a discriminated union so evalScenario can
 *  read/write it without a switch on every field access. */
export interface ScenarioState {
  id: ScenarioId;
  status: ScenarioStatus;
  /** Current objective text, shown on the hub — some scenarios rewrite this
   *  as progress is made (Hollywood counts down promotions still needed). */
  objective: string;
  startedSeason: number;
  meta: {
    streak?: number;
    promosNeeded?: number;
    deadlineSeason?: number;
    academySales?: number;
    deduction?: number;
  };
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

/** Personality of a club's chairman, which colours what the job is like
 *  before you take it: how much of the wage bill they'll let you spend, and
 *  how fast their confidence moves once you're in the door. */
export type ChairmanType = 'ambitious' | 'patient' | 'frugal' | 'ruthless';

/**
 * A manager's job — either a live vacancy on the market or an offer put to
 * you at season end. Both are the same shape so the Job Market screen and
 * the season-end screen can render one card.
 *
 * `note` stays the human sentence; everything else is what the board is
 * actually offering, so the choice between two jobs is legible before you
 * take one rather than only afterwards.
 */
export interface JobOffer {
  clubId: number;
  note: string;
  /** League the club is in when the job opens. Stored rather than read off
   *  the club, so a listing can't silently change tier under the player
   *  between the vacancy opening and them applying. */
  leagueId: string;
  /** Transfer budget the board would hand over on day one. */
  budget: number;
  /** What the board will expect, in the same words as `Board.objective`. */
  objective: string;
  minPosition: number;
  /** Manager reputation the board is looking for, 0–100. Applying below this
   *  is allowed but the interview can go against you. */
  repRequired: number;
  chairman: ChairmanType;
  /** Season this vacancy opened, so stale listings can be swept. */
  openedWeek: number;
  openedYear: number;
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

/* --- Phase 10: facilities, staff and scouting. All optional so a save from
   before this phase loads and behaves exactly as it did (instant-purchase
   stadium/academy/staff levels stay live and readable; the new timed-projects
   layer sits alongside, not on top of, them). See engine/facilities.ts. */

/** The eight named zones of the ground: four sides plus four corners. */
export type StandId = 'north' | 'south' | 'east' | 'west' | 'ne' | 'nw' | 'se' | 'sw';

/** One buildable zone of the stadium. Tier 0 = undeveloped (no capacity). */
export interface Stand {
  id: StandId;
  tier: 0 | 1 | 2 | 3;
  type: 'seating' | 'terrace' | 'hospitality';
  capacity: number;
}

/** Kinds of facility work that go through the timed-project system. */
export type ProjectKind = 'stand' | 'training' | 'medical' | 'academy';

/** A single in-progress (or just-completed) facility upgrade. Every upgrade
 *  is a project now — see gap item 66 — rather than an instant purchase. */
export interface FacilityProject {
  id: number;
  kind: ProjectKind;
  /** Which stand this project targets; only set when kind === 'stand'. */
  standId?: StandId;
  label: string;
  startWeek: number;
  startYear: number;
  /** Total weeks scheduled, 2–10, scaled by spend. */
  durationWeeks: number;
  /** Weeks of work banked so far — partial-credit accounting. */
  weeksElapsed: number;
  spend: number;
  complete: boolean;
}

/** A named coach hired into a backroom slot. Head coach quality feeds
 *  `coachDrillMult` in familiarity.ts (via the legacy `staff.coach` level)
 *  and player development speed. */
export interface Coach {
  id: number;
  name: string;
  /** `attack`/`midfield`/`defense` are positional coaches (development speed
   *  boost for players in that position group); `analyst` boosts sharpness
   *  gained from training days (see engine/schedule.ts). */
  role: 'head' | 'fitness' | 'goalkeeping' | 'attack' | 'midfield' | 'defense' | 'analyst' | 'assistant';
  /** 1–99, like a player attribute. */
  quality: number;
  wage: number;
}

/** A named scout, permanently on the books (unlike the ad-hoc
 *  `ScoutAssignment` tasks he works through). Star rating drives both how
 *  quickly he files reports and how sharp the picks in them are. */
export interface Scout {
  id: number;
  name: string;
  /** 1–5 star rating. */
  stars: number;
  /** Country/region he is assigned to comb for talent — free text drawn
   *  from the existing nationality pool used across the dataset. */
  region: string;
  wage: number;
}

export interface FacilitiesState {
  stands: Record<StandId, Stand>;
  /** Real ground capacity ceiling this club can build toward, derived from
   *  its league's stature (DIVERGENCE: no per-club real capacities were
   *  seeded in the Phase 1 dataset, so this is computed, not looked up —
   *  see groundCapacityCap() in engine/facilities.ts). */
  groundCapacityCap: number;
  trainingLevel: number; // 1-5
  medicalLevel: number; // 1-5
  academyReputation: number; // 0-100
  coaches: Coach[];
  projects: FacilityProject[];
  nextProjectId: number;
  nextCoachId: number;
}

export type ScoutAssignmentKind = 'opponent' | 'player-search' | 'youth';

export interface ScoutAssignment {
  id: number;
  scoutName: string;
  kind: ScoutAssignmentKind;
  /** Opponent-report assignments target a club. */
  targetClubId?: number;
  startWeek: number;
  startYear: number;
  dueWeek: number;
  dueYear: number;
  weeksRemaining: number;
  complete: boolean;
  /** Populated once complete: opponent report id, or discovered player ids. */
  reportId?: number;
  foundPlayerIds?: number[];
}

export interface OpponentReport {
  id: number;
  clubId: number;
  weekGenerated: number;
  yearGenerated: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

/** A transfer-target lead a scout has filed, surfaced through the inbox and
 *  actionable straight from TransfersScreen. Detail/accuracy of the note
 *  scale with the filing scout's star rating. */
export interface ScoutReport {
  id: number;
  playerId: number;
  scoutName: string;
  stars: number;
  region: string;
  weekGenerated: number;
  yearGenerated: number;
  note: string;
}

export interface ScoutingState {
  assignments: ScoutAssignment[];
  /** Persisted shortlist of scouted player ids — was local-only React state
   *  before this phase (gap item 67). */
  shortlist: number[];
  reports: OpponentReport[];
  nextAssignmentId: number;
  nextReportId: number;
  /** Career mode: a permanent scouting network, each scout combing one
   *  region, filing player leads into `playerReports` on a cadence set by
   *  his star rating (see engine/scouting.ts). */
  scouts?: Scout[];
  nextScoutId?: number;
  playerReports?: ScoutReport[];
  nextPlayerReportId?: number;
}

export interface GameState {
  version: 6 | 7;
  userClubId: number;
  seasonYear: number;
  /** Next round to be played, 1..SEASON_ROUNDS. > SEASON_ROUNDS means season over. */
  week: number;
  /** 0-based day counter since the season opened — the calendar's source of
   *  truth (see engine/calendar.ts). Optional so pre-calendar saves load: they
   *  resume on Monday of whatever week they were saved on. `week` above keeps
   *  its old meaning as the fixture round and is still what fixture lookups
   *  key off; the two are held in step by resolving exactly one round per
   *  calendar week, on MATCH_DAY. */
  dayOfSeason?: number;
  budget: number;
  /** Weekly wage ceiling the board sanctions, separate from the transfer
   *  budget above — a signing can be affordable to buy and still unaffordable
   *  to pay. Optional so pre-v7 saves load; `wageCeiling()` supplies a
   *  fallback derived from the current bill when it is absent. */
  wageBudget?: number;
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
  /** Phase 11: the starting challenge this career was set up under, if any.
   *  Absent entirely for a normal career — optional rather than a 'none'
   *  variant so nothing else has to special-case the common path. */
  scenario?: ScenarioState;
  academyLevel: number; // 1–3
  /** Squad captain (player id). Leaders make better captains. */
  captainId?: number | null;
  staff?: Staff;
  stadiumLevel?: number; // 1–3, scales gate income
  ledger: LedgerEntry[];
  /** Phase 8 finances. Optional and lazily initialised (see engine/finances.ts)
   *  so pre-Phase-8 saves migrate additively with no version bump. */
  finances?: FinanceState;
  cup: Knockout;
  continental: Continental;
  /** Offers put directly to you at season end — a rescue job after a sacking,
   *  or a step up after a strong year. Cleared every rollover. */
  jobOffers: JobOffer[];
  /** The live job market: openings at other clubs you can apply for at any
   *  point in the season. Churns weekly as bot clubs sack their managers.
   *  Optional so pre-job-market saves load with an empty market rather than
   *  needing a version bump. */
  vacancies?: JobOffer[];
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

  /* --- Phase 7: transfers. All optional so pre-Phase-7 saves load unchanged;
     lib/storage.ts migrate() back-fills them additively. --- */
  /** Live fee/terms negotiations, both directions. */
  negotiations?: Negotiation[];
  /** Deals agreed for players arriving free at the next season rollover. */
  preContracts?: PreContract[];
  /** playerId → season year he refused to talk to us. Cleared each season. */
  transferBans?: Record<number, number>;
  /** playerId → absolute tick (`seasonYear*100+week`) a rejected renewal's
   *  "Silent Period" runs until — a new renewal offer is blocked before then.
   *  Separate from `transferBans` because it gates `renewContract`, not
   *  `openNegotiation`, and its window is weeks, not a whole season. */
  renewalCooldowns?: Record<number, number>;
  /** playerId → absolute tick a free agent's short re-offer window runs
   *  until, after he turned an offer down. Free agents don't get the
   *  season-long `transferBans` treatment — see spec module C. */
  freeAgentCooldowns?: Record<number, number>;
  /** Headlines about transfer business elsewhere in the league. */
  transferNews?: string[];

  history: SeasonSummary[];
  news: string[];
  /** Phase 12: per-story-type cooldown tracker (week each type last fired),
   *  so the weekly press desk doesn't repeat the same headline every round.
   *  Optional and lazily initialized — absent entirely on any save from
   *  before this system existed. */
  newsCooldowns?: Record<string, number>;
  /** Structured inbox items (news you can open into a full article + player card). */
  inbox: InboxItem[];
  nextInboxId: number;
  /** Season week the press conference was last done, so it offers once per fixture. */
  pressWeek: number;
  /** User display/gameplay preferences. */
  settings?: GameSettings;
  /** Phase 10: stadium/training/medical/academy timed-project state. Optional
   *  so pre-v7 saves migrate in with a freshly-derived default (see
   *  engine/facilities.ts newFacilities() + lib/storage.ts migrate()). */
  facilities?: FacilitiesState;
  /** Phase 10: scout assignments, opponent reports and the persisted
   *  shortlist. */
  scouting?: ScoutingState;
  /** Temporary trialist pool from September youth intake awaiting accept/reject. */
  trialistPool?: Array<{
    playerId: number;
    trialistId: string;
    starRating: number;
    pos: Position;
    ca: number;
    pa: number;
  }>;
  /** Career mode weekly planner: one entry per day, Monday first. Optional —
   *  absent means "the default split" (see engine/schedule.ts DEFAULT_SCHEDULE).
   *  Drives per-day sharpness/fitness/injury-risk in the weekly tick. */
  weeklySchedule?: ScheduleDay[];
  /** Manual training mini-game: drills run so far this week, reset to 0 in
   *  `playRound`'s weekly-advance section. Capped at `DRILLS_PER_WEEK`. */
  drillsUsedThisWeek?: number;
}

export type ScheduleDay = 'training' | 'recovery';

export type InboxCategory = 'club' | 'transfer' | 'injury' | 'contract' | 'youth' | 'board' | 'match' | 'press';

/**
 * What kind of real, one-click action an inbox item carries, if any. Absent
 * means the item is purely informational — no `kind` renders no action row.
 * Previously InboxScreen guessed this from a regex on the title
 * (`/playing time|complain/i`, `/captain/i`); a message with no matching
 * word was unactionable regardless of what it was actually about. This
 * makes "does this item have a real action" a fact from the engine, not a
 * pattern match against the copy.
 */
export type InboxActionKind =
  | 'complaint'          // Reassure / Promise (respondToComplaint)
  | 'contractExpiring'   // Offer new deal (renewContract) / open Squad
  | 'scoutLead'          // Open in Transfers
  | 'devMilestone'       // View player
  | 'trainingImprovement'; // View player

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
  /** Set once a complaint-type item has been responded to, so the response
   *  buttons in InboxScreen disappear after one use. */
  responded?: boolean;
  /** What action row (if any) InboxScreen should render for this item. */
  kind?: InboxActionKind;
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
  /** Continue Rules for the daily loop (engine/dailyTick.ts): which inbox
   *  categories halt "Sim Next Day" for a look, vs. just logging to the Day
   *  Summary digest and rolling on. Matchday is a hard stop and isn't in
   *  here — "the user should never accidentally skip a match" isn't a
   *  preference. Optional/partial so an unset category falls back to
   *  `defaultContinueStops()`; a settings blob from before this system
   *  existed behaves exactly as those defaults. */
  continueStops?: Partial<Record<InboxCategory, boolean>>;
  /** Assistant Manager delegation (engine/dailyTick.ts's `advanceDay`):
   *  which categories the assistant handles automatically — applying the
   *  same default a human would (Reassure, Offer new deal, or the
   *  assistant's own schedule suggestion) — instead of stopping the sim.
   *  All off by default; delegating is an opt-in, not a hidden behavior
   *  change for existing saves. */
  assistantDelegation?: Partial<Record<'complaints' | 'contracts' | 'schedule', boolean>>;
  /** Sound effect volume, 0–1. Optional — older settings blobs fall back
   *  to the UI default (0.7). */
  volume?: number;
  /** Mute all synthesized sound effects. */
  muted?: boolean;
  /** Vibration feedback on supported (mobile) devices. */
  haptics?: boolean;
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
  /** Suit/jacket fill for the shoulders silhouette. Optional — falls back to
   *  `var(--panel-2)` when absent (older saves predate this field). */
  suitColor?: string;
  /** Eyebrow shape, independent of eyebrow colour. Optional — falls back to
   *  the arched default when absent (older saves predate this field). */
  eyebrows?: string;
  /** Outfit shape (suit & tie, turtleneck, tracksuit…). Optional — falls back
   *  to 'suittie' when absent. */
  attire?: string;
  /** Lip colour. Optional — falls back to a muted default when absent. */
  mouthColor?: string;
  /** Frame/stud colour for glasses and earrings. Optional — falls back to a
   *  dark neutral when absent. */
  accessoryColor?: string;
}

/** Playing career tier chosen in the Credentials step — feeds the starting
 *  reputation formula in `engine/seasonProgression.ts` (`newGame`). */
export type PlayingBackground =
  | 'world-class' | 'top-flight' | 'lower-league' | 'semi-pro' | 'none';

/** Non-playing background before taking the manager's chair, if any. */
export type PriorRole = 'coaching' | 'recruitment' | 'media' | 'none';

/** Coaching badge tier attained. */
export type BadgeLevel = 'none' | 'basic' | 'advanced' | 'pro';

export interface ManagerProfile {
  id: string;
  name: string;
  avatarConfig: AvatarConfig;
  createdAt: Date;
  updatedAt: Date;
  /** Backstory/credentials (Phase: Manager Creator). All optional so
   *  existing saves/profiles load unchanged and simply skip the bonus. */
  playingBackground?: PlayingBackground;
  priorRole?: PriorRole;
  badgeLevel?: BadgeLevel;
  /** Up to 3 coaching-style flavor tags. */
  coachingStyles?: string[];
  /** Up to 2 personality flavor tags. */
  personality?: string[];
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
