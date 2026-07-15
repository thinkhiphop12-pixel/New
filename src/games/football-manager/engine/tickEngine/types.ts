import type { MatchEvent, MatchReport, Tactics } from '../types';
import type { MentalityId } from './tacticsData';

export type TeamSide = 'home' | 'away';

/** Per-player event counters used for event-weighted match ratings. */
export interface PlayerCounts {
  goal?: number;
  assist?: number;
  keyPass?: number;
  shotOnTarget?: number;
  shotOffTarget?: number;
  bigChanceMissed?: number;
  tackle?: number;
  interception?: number;
  save?: number;
  foulCommitted?: number;
  yellowCard?: number;
  redCard?: number;
}

export interface SideStats {
  possession: number; // percent, live
  shots: number;
  onTarget: number;
  xg: number;
  corners: number;
  fouls: number;
}

/** Everything needed to resume the sim from the end of a given minute. */
export interface ResumeSideContext {
  lineup: (number | null)[];
  formationId: string;
  mentality: MentalityId;
  subsUsed: number;
  sentOff: number[];
  fatigue: Record<number, number>;
  yellows: Record<number, number>;
  counts: Record<number, PlayerCounts>;
  appeared: number[];
}

export interface ResumeContext {
  score: { home: number; away: number };
  stats: { home: SideStats; away: SideStats };
  possessionTicks: { home: number; away: number };
  momentum: number; // -1..1, positive favours home
  ballZone: 0 | 1 | 2 | 3 | 4; // from the possession side's perspective
  possession: TeamSide;
  home: ResumeSideContext;
  away: ResumeSideContext;
}

/** Extra flavour carried on tick-engine events on top of the legacy shape. */
export interface TickMatchEvent extends MatchEvent {
  side?: TeamSide;
  assistant?: boolean; // ASST analysis line
  kind?: 'shot' | 'save' | 'block' | 'corner' | 'foul' | 'sub' | 'kickoff' | 'halftime' | 'fulltime' | 'mentality';
  card?: 'yellow' | 'red';
}

/** One replay frame per match minute (omitted in headless mode). */
export interface MinuteSnapshot {
  minute: number;
  /** Ball position in home-attacking coordinates: x 0..1 (left/right), y 0..1 (0 = home goal line). */
  ballX: number;
  ballY: number;
  possession: TeamSide;
  momentum: number;
  score: { home: number; away: number };
  stats: { home: SideStats; away: SideStats };
  resume: ResumeContext;
}

export interface MatchTimeline {
  homeId: number;
  awayId: number;
  snapshots: MinuteSnapshot[];
  events: TickMatchEvent[];
  report: MatchReport;
  ratings: Record<number, number>;
}

export interface TickSimOptions {
  /** Resume a match mid-way (mid-match tactics/subs): first simulated minute. */
  startMinute?: number;
  initial?: ResumeContext;
  userLineup?: (number | null)[];
  userMentality?: MentalityId;
  userFormationId?: string;
  userTactics?: Tactics;
  /** AI difficulty multiplier applied to the user's opponent. */
  difficulty?: number;
  /** Seed match momentum (-1..1, home-perspective) — a pre-match team talk. Ignored when resuming via `initial`. */
  initialMomentum?: number;
  /** Skip snapshots/commentary for cheap AI/auto sims. */
  headless?: boolean;
}
