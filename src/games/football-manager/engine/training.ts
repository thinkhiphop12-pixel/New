import type { Coach, GameState, Player, Position, TeamDrill, TrainingFocus } from './types';
import { clamp, marketValue } from './utils';
import { pushInbox } from './inbox';

/**
 * Training, in two halves.
 *
 * **Team sessions** — the club trains together twice a week and the manager
 * picks what each session works on. The six drills are the categories the
 * FIFA-style training mini-games will eventually sit behind; until those are
 * built, choosing a drill *is* the interaction, and it resolves in the
 * weekly tick rather than in a mini-game.
 *
 * **One-to-one** — four individual slots a week, one per position group
 * (GK / DEF / MID / ATT). Booking a player in gives him guaranteed, visible
 * progress (`Player.oneToOneXp`) instead of the squad-wide coin flip the old
 * single `TrainingFocus` rolled for everyone at once.
 *
 * The legacy `GameState.training` focus is not deleted — several older
 * systems read it (injury risk, injury healing, the generic development roll
 * in seasonProgression.ts). It is now *derived* from the two chosen sessions
 * (`effectiveFocus`) and written back whenever the manager changes one, so
 * those systems keep working without knowing this module exists.
 */

/* --------------------------------------------------------- team drills */

export interface TeamDrillDef {
  id: TeamDrill;
  label: string;
  /** One short line. This screen is not the place for a paragraph. */
  blurb: string;
  /** Who gets most out of it; the rest of the squad gets a fraction. */
  focusPositions: Position[];
  /** Attributes the drill pushes, in order of preference. */
  stats: StatKey[];
  sharpness: number;
  fitness: number;
  chemistry: number;
}

const STAT_KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const TEAM_DRILLS: TeamDrillDef[] = [
  {
    id: 'attacking',
    label: 'Attacking',
    blurb: 'Finishing and final-third movement.',
    focusPositions: ['MID', 'FWD'],
    stats: ['sho', 'dri'],
    sharpness: 1.4, fitness: -1.0, chemistry: 0,
  },
  {
    id: 'defending',
    label: 'Defending',
    blurb: 'Shape, pressing triggers and one-v-ones.',
    focusPositions: ['GK', 'DEF'],
    stats: ['def', 'phy'],
    sharpness: 1.4, fitness: -1.0, chemistry: 0,
  },
  {
    id: 'possession',
    label: 'Possession',
    blurb: 'Rondos and circulation — passing, and a tighter side.',
    focusPositions: ['DEF', 'MID', 'FWD'],
    stats: ['pas', 'dri'],
    sharpness: 1.0, fitness: -0.6, chemistry: 1.6,
  },
  {
    id: 'set-pieces',
    label: 'Set pieces',
    blurb: 'Dead balls at both ends. Cheap goals, cheap clean sheets.',
    focusPositions: ['DEF', 'MID', 'FWD'],
    stats: ['sho', 'def'],
    sharpness: 0.7, fitness: -0.3, chemistry: 1.0,
  },
  {
    id: 'fitness',
    label: 'Fitness',
    blurb: 'Running and recovery. Legs back, edge off.',
    focusPositions: ['GK', 'DEF', 'MID', 'FWD'],
    stats: ['phy', 'pac'],
    sharpness: -0.6, fitness: 2.6, chemistry: 0,
  },
  {
    id: 'match-prep',
    label: 'Match prep',
    blurb: 'Shadow play against the weekend opponent. Sharpness, nothing else.',
    focusPositions: ['GK', 'DEF', 'MID', 'FWD'],
    stats: [],
    sharpness: 2.2, fitness: -0.7, chemistry: 0.6,
  },
];

export function drillDef(id: TeamDrill): TeamDrillDef {
  return TEAM_DRILLS.find((d) => d.id === id) ?? TEAM_DRILLS[2];
}

export const DEFAULT_SESSIONS: [TeamDrill, TeamDrill] = ['possession', 'match-prep'];

/** Labels for the two slots. Midweek is the working session; the second is
 *  the day before the game, which is why it defaults to match prep. */
export const SESSION_LABELS = ['Midweek session', 'Pre-match session'] as const;

export function getSessions(state: GameState): [TeamDrill, TeamDrill] {
  const s = state.teamSessions;
  return s && s.length === 2 ? s : DEFAULT_SESSIONS;
}

/**
 * Collapse the week's two sessions onto the single legacy focus the older
 * systems read. A week that is fitness twice over is a fitness week; a week
 * that leans one way without also leaning the other takes that side;
 * anything mixed is balanced.
 */
export function effectiveFocus(sessions: [TeamDrill, TeamDrill]): TrainingFocus {
  const [a, b] = sessions;
  if (a === 'fitness' && b === 'fitness') return 'fitness';
  const attacking = a === 'attacking' || b === 'attacking';
  const defending = a === 'defending' || b === 'defending';
  if (attacking && !defending) return 'attack';
  if (defending && !attacking) return 'defense';
  return 'balanced';
}

/** Set one of the two sessions, keeping the derived legacy focus in step. */
export function setSession(state: GameState, index: 0 | 1, drill: TeamDrill): GameState {
  const sessions = [...getSessions(state)] as [TeamDrill, TeamDrill];
  sessions[index] = drill;
  return { ...state, teamSessions: sessions, training: effectiveFocus(sessions) };
}

/* ----------------------------------------------------------- one-to-one */

/** The four individual slots, in the order the screen lays them out. */
export const ONE_TO_ONE_SLOTS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

export const SLOT_LABEL: Record<Position, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Attacker',
};

export function getOneToOne(state: GameState): Partial<Record<Position, number>> {
  return state.oneToOne ?? {};
}

/** Book (or, with `null`, clear) the week's individual session for a slot. */
export function setOneToOne(state: GameState, pos: Position, playerId: number | null): GameState {
  const next = { ...getOneToOne(state) };
  if (playerId == null) delete next[pos];
  else next[pos] = playerId;
  return { ...state, oneToOne: next };
}

/** The position coach whose group this player falls in, if one is hired. */
function coachForPosition(state: GameState, pos: Position): Coach | undefined {
  const role: Coach['role'] | null =
    pos === 'FWD' ? 'attack' : pos === 'MID' ? 'midfield' : pos === 'DEF' ? 'defense' : 'goalkeeping';
  return state.facilities?.coaches.find((c) => c.role === role);
}

/**
 * How much credit a week of individual work is worth to this player, 0-1.
 * Young players with headroom left move fastest; a 33-year-old at his
 * ceiling gets the sharpness and nothing more.
 */
export function oneToOneRate(state: GameState, p: Player): number {
  const headroom = (p.potential ?? p.rating) - p.rating;
  if (headroom <= 0 || p.rating >= 92) return 0;
  const ageMult = p.age <= 21 ? 1.6 : p.age <= 25 ? 1.2 : p.age <= 29 ? 0.8 : 0.4;
  const coach = coachForPosition(state, p.pos);
  const coachMult = 1 + (coach ? coach.quality / 150 : 0);
  const groundMult = 1 + (state.facilities?.trainingLevel ?? 1) * 0.06;
  const moraleMult = clamp(0.6 + p.morale / 140, 0.6, 1.2);
  // Headroom itself tapers: the last point of potential is the hardest.
  const headroomMult = clamp(headroom / 8, 0.35, 1.2);
  return 0.09 * ageMult * coachMult * groundMult * moraleMult * headroomMult;
}

/** The attribute an individual session would push for this player. */
function individualStat(p: Player): StatKey {
  if (p.pos === 'GK') return 'phy';
  if (p.pos === 'DEF') return 'def';
  if (p.pos === 'MID') return 'pas';
  return 'sho';
}

/* -------------------------------------------------------- weekly apply */

function absTick(s: GameState): number {
  return s.seasonYear * 100 + s.week;
}

/**
 * One week of both halves of training, applied in place. Called once per
 * round from `playRound` (engine/seasonProgression.ts), after the weekly
 * schedule has run — the schedule decides how *hard* the week was, this
 * decides what the squad actually worked on.
 *
 * Idempotent within a week: `oneToOneResolved` records the tick the
 * individual slots last paid out, so a re-entrant call can't double them.
 */
export function applyWeeklyTraining(state: GameState): void {
  const s = state;
  const club = s.clubs.find((c) => c.id === s.userClubId);
  if (!club) return;
  if (s.oneToOneResolved === absTick(s)) return;
  s.oneToOneResolved = absTick(s);

  const sessions = getSessions(s);
  const booked = getOneToOne(s);
  const bookedIds = new Set(Object.values(booked).filter((v): v is number => typeof v === 'number'));

  /* --- team sessions ------------------------------------------------- */
  for (const drillId of sessions) {
    const d = drillDef(drillId);
    for (const id of club.playerIds) {
      const p = s.players[id];
      if (!p || p.injuryWeeks > 0) continue;
      const focused = d.focusPositions.includes(p.pos);
      const weight = focused ? 1 : 0.4;
      p.sharpness = clamp(p.sharpness + d.sharpness * weight, 0, 100);
      p.fitness = clamp(p.fitness + d.fitness * weight, 15, 100);
      if (d.chemistry) p.chem = clamp(p.chem + d.chemistry * weight * 0.4, 0, 100);

      // A modest chance of an attribute nudge for the group the drill is
      // aimed at. Deliberately smaller than a one-to-one session — this is
      // the whole squad, every week, so it compounds fast if it isn't kept
      // low. Players with a development plan of their own are left to it.
      if (!focused || !d.stats.length || p.devPlan || bookedIds.has(p.id)) continue;
      if (p.rating >= (p.potential ?? p.rating)) continue;
      const coach = coachForPosition(s, p.pos);
      const chance = 0.012 * (1 + (coach ? coach.quality / 200 : 0)) * (p.age <= 24 ? 1.5 : p.age <= 28 ? 1 : 0.35);
      if (Math.random() < chance) {
        const key = d.stats[Math.floor(Math.random() * d.stats.length)];
        p[key] = clamp(p[key] + 1, 1, 99);
        p.rating = Math.min(p.potential ?? 99, p.rating + 1);
        p.value = marketValue(p.rating, p.age);
      }
    }
    // The squad drilling together pulls it together as a unit.
    if (d.chemistry) s.chemistry = clamp(s.chemistry + d.chemistry * 0.25, 0, 100);
  }

  /* --- one-to-one ---------------------------------------------------- */
  for (const pos of ONE_TO_ONE_SLOTS) {
    const pid = booked[pos];
    if (pid == null) continue;
    const p = s.players[pid];
    // A player who has been sold, released or is in the treatment room
    // quietly loses his slot rather than silently absorbing it.
    if (!p || p.clubId !== s.userClubId || p.injuryWeeks > 0) {
      delete (s.oneToOne ?? {})[pos];
      continue;
    }
    p.sharpness = clamp(p.sharpness + 3.5, 0, 100);
    const rate = oneToOneRate(s, p);
    if (rate <= 0) continue;
    p.oneToOneXp = (p.oneToOneXp ?? 0) + rate;
    if (p.oneToOneXp >= 1) {
      p.oneToOneXp -= 1;
      const key = individualStat(p);
      p[key] = clamp(p[key] + 1, 1, 99);
      p.rating = Math.min(p.potential ?? 99, p.rating + 1);
      p.value = marketValue(p.rating, p.age);
      s.news.unshift(`${p.name} has been sharp in individual work — now ${p.rating} overall.`);
      pushInbox(s, {
        category: 'club',
        title: `${p.name} steps up in individual training`,
        body: `The one-to-one work with ${p.name} is paying off. He is now rated ${p.rating} overall.`,
        playerId: p.id,
        kind: 'trainingImprovement',
      });
    }
  }
}

/** Squad-wide read on how the week's plan is pitched, for the screen's
 *  summary strip. Pure — no mutation, safe to call on every render. */
export function projectTeamSessions(state: GameState): {
  sharpness: number;
  fitness: number;
  chemistry: number;
} {
  const sessions = getSessions(state);
  let sharpness = 0, fitness = 0, chemistry = 0;
  for (const id of sessions) {
    const d = drillDef(id);
    // Averaged over a squad that is part focus group, part not.
    sharpness += d.sharpness * 0.7;
    fitness += d.fitness * 0.7;
    chemistry += d.chemistry * 0.3;
  }
  return { sharpness, fitness, chemistry };
}
