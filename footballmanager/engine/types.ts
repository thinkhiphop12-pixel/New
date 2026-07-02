export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

/** A player record. Static attributes come from the dataset; form/injury/club
 *  are dynamic and live in the save. */
export interface Player {
  id: number;
  name: string;
  nat: string;
  pos: Position;
  role: string; // detailed role: GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST
  rating: number;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  age: number;
  value: number;
  clubId: number; // 0 = free agent
  form: number; // 0.85–1.15 multiplier, drifts weekly
  injuryWeeks: number; // 0 = fit
}

export interface Club {
  id: number;
  name: string;
  code: string;
  color: string;
  division: 1 | 2;
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

export interface Tactics {
  style: TacticStyle;
  pressing: Pressing;
}

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
}

export interface MatchReport {
  homeId: number;
  awayId: number;
  homeGoals: number;
  awayGoals: number;
  homeXG: number;
  awayXG: number;
  events: MatchEvent[];
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

export interface SeasonSummary {
  year: number;
  division: 1 | 2;
  position: number;
  pts: number;
  champions: boolean;
  promoted: boolean;
  relegated: boolean;
  prize: number;
}

export interface GameState {
  version: 1;
  userClubId: number;
  seasonYear: number;
  /** Next round to be played, 1..SEASON_ROUNDS. > SEASON_ROUNDS means season over. */
  week: number;
  budget: number;
  morale: number; // 30–95 team morale
  formationId: string;
  /** Player id per formation slot (11 entries). null = empty slot. */
  lineup: (number | null)[];
  tactics: Tactics;
  players: Record<number, Player>;
  clubs: Club[];
  fixtures: { d1: Fixture[]; d2: Fixture[] };
  incomingOffers: TransferOffer[];
  history: SeasonSummary[];
  news: string[];
}

export interface GameData {
  meta: { attribution: string; clubCount: number; playerCount: number };
  clubs: Club[];
  players: Omit<Player, 'form' | 'injuryWeeks'>[];
}
