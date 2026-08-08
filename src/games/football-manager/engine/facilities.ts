import type {
  Club, Coach, FacilitiesState, FacilityProject, GameState, OpponentReport, ProjectKind,
  ScoutAssignment, ScoutAssignmentKind, ScoutingState,
} from './types';
import { getLeague } from './gameRules';

/**
 * Phase 10 — facilities, staff and scouting.
 *
 * Engine-only, no React imports (scripts/*.ts run this under tsx). Every
 * upgrade in this module is a timed project: 2-10 weeks scaled by spend, a
 * live progress readout, and the effect only applies once the project
 * completes — replacing the old instant-purchase upgrades in
 * seasonProgression.ts (upgradeAcademy / upgradeStaff),
 * which stay untouched and still work for whoever calls them directly. The
 * two systems are additive, not exclusive: a save with no facilities block
 * behaves exactly as before.
 */

/**
 * The club's ground capacity. Fixed for the career: stand-by-stand expansion
 * was removed, so a club plays in the ground it has.
 *
 * Real per-club capacities were not seeded in the Phase 1 dataset — see the
 * DIVERGENCE note on `FacilitiesState.groundCapacity`. Derived instead from the
 * league's `gateBase` (already a per-club stature figure used for matchday
 * income), clamped to a sane stadium-sized range.
 */
export function groundCapacity(state: GameState, clubId: number): number {
  const club = state.clubs.find((c) => c.id === clubId);
  const league = getLeague(club?.leagueId ?? 'eng-1');
  return Math.max(9000, Math.min(90_000, Math.round((league.gateBase / 10) / 100) * 100));
}

/** Fresh facilities state for a new/migrating save. */
export function newFacilities(state: GameState): FacilitiesState {
  return {
    groundCapacity: groundCapacity(state, state.userClubId),
    trainingLevel: 1,
    medicalLevel: 1,
    academyReputation: 20,
    coaches: [],
    projects: [],
    nextProjectId: 1,
    nextCoachId: 1,
  };
}

export function newScouting(): ScoutingState {
  return { assignments: [], shortlist: [], reports: [], nextAssignmentId: 1, nextReportId: 1 };
}

export const TRAINING_UPGRADE_COST = [0, 0, 1_500_000, 3_500_000, 7_000_000, 14_000_000];
export const MEDICAL_UPGRADE_COST = [0, 0, 1_200_000, 2_800_000, 5_500_000, 11_000_000];
export const ACADEMY_PROJECT_COST = 4_000_000; // per +15 reputation project, funding-capped
export const ACADEMY_REPUTATION_CAP = 100;

/** Project duration in weeks: bigger spend buys a faster build, within the
 *  2-10 week band the plan specifies. */
function durationForSpend(kind: ProjectKind, spend: number): number {
  const ref = kind === 'academy' ? ACADEMY_PROJECT_COST : 3_000_000;
  const ratio = spend / ref;
  const weeks = Math.round(10 - 8 * Math.min(1, ratio));
  return Math.max(2, Math.min(10, weeks));
}

function demandCanAfford(state: GameState, cost: number): boolean {
  return cost > 0 && cost <= state.budget;
}

/** Start a training ground / medical centre / academy reputation project. */
export function startFacilityProject(state: GameState, kind: 'training' | 'medical' | 'academy'): GameState {
  const fs = state.facilities ?? newFacilities(state);
  if (fs.projects.some((p) => p.kind === kind && !p.complete)) return state;

  let cost: number;
  let label: string;
  if (kind === 'training') {
    if (fs.trainingLevel >= 5) return state;
    cost = TRAINING_UPGRADE_COST[fs.trainingLevel + 1];
    label = `Training ground → level ${fs.trainingLevel + 1}`;
  } else if (kind === 'medical') {
    if (fs.medicalLevel >= 5) return state;
    cost = MEDICAL_UPGRADE_COST[fs.medicalLevel + 1];
    label = `Rehab & medical centre → level ${fs.medicalLevel + 1}`;
  } else {
    if (fs.academyReputation >= ACADEMY_REPUTATION_CAP) return state;
    cost = ACADEMY_PROJECT_COST;
    label = 'Academy reputation drive (+15)';
  }
  if (!demandCanAfford(state, cost)) return state;

  const project: FacilityProject = {
    id: fs.nextProjectId,
    kind,
    label,
    startWeek: state.week,
    startYear: state.seasonYear,
    durationWeeks: durationForSpend(kind, cost),
    weeksElapsed: 0,
    spend: cost,
    complete: false,
  };
  const nextFs: FacilitiesState = { ...fs, projects: [...fs.projects, project], nextProjectId: fs.nextProjectId + 1 };
  return {
    ...state,
    budget: state.budget - cost,
    facilities: nextFs,
    ledger: [{ week: state.week, desc: `Project started: ${label}`, amount: -cost }, ...state.ledger],
  };
}

/** Advance every in-flight project by one week; apply effects on completion.
 *  Idempotent per call — call this exactly once per week advanced. Pure, no
 *  React: called both from the weekly UI catch-up and from scripted tests. */
export function tickFacilityProjects(state: GameState): GameState {
  const fs = state.facilities;
  if (!fs || fs.projects.every((p) => p.complete)) return state;

  let trainingLevel = fs.trainingLevel;
  let medicalLevel = fs.medicalLevel;
  let academyReputation = fs.academyReputation;
  const news: string[] = [];

  const projects = fs.projects.map((p) => {
    if (p.complete) return p;
    const weeksElapsed = p.weeksElapsed + 1;
    if (weeksElapsed < p.durationWeeks) return { ...p, weeksElapsed };

    // Completes this tick — apply the effect.
    if (p.kind === 'training') {
      trainingLevel += 1;
      news.unshift(`Training ground upgrade complete — now level ${trainingLevel}.`);
    } else if (p.kind === 'medical') {
      medicalLevel += 1;
      news.unshift(`Medical centre upgrade complete — now level ${medicalLevel}.`);
    } else if (p.kind === 'academy') {
      academyReputation = Math.min(ACADEMY_REPUTATION_CAP, academyReputation + 15);
      news.unshift(`Academy reputation drive complete — reputation now ${academyReputation}.`);
    }
    return { ...p, weeksElapsed, complete: true };
  });

  return {
    ...state,
    facilities: { ...fs, trainingLevel, medicalLevel, academyReputation, projects },
    news: news.length ? [...news, ...state.news] : state.news,
  };
}

const COACH_NAMES = [
  'Marco Rinaldi', 'Karl Voss', 'Dean Okafor', 'Pieter van Dalen', 'Luis Marquez',
  'Sami Kallio', 'Rob Fenwick', 'Andres Duarte', 'Jonas Brekke', 'Tomasz Wach',
];

/** Legacy `staff.coach` is a 0-3 integer that `coachDrillMult` in
 *  familiarity.ts already reads. A named head coach's quality (1-99) maps
 *  onto that same scale so hiring one actually changes drilling speed
 *  without touching familiarity.ts. */
function levelFromQuality(quality: number): 0 | 1 | 2 | 3 {
  if (quality >= 80) return 3;
  if (quality >= 60) return 2;
  if (quality >= 35) return 1;
  return 0;
}

export function hireCoach(state: GameState, role: Coach['role'], quality: number): GameState {
  const fs = state.facilities ?? newFacilities(state);
  const wage = Math.round(400 + quality * 45);
  const name = COACH_NAMES[fs.nextCoachId % COACH_NAMES.length];
  const coach: Coach = { id: fs.nextCoachId, name, role, quality, wage };
  const coaches = [...fs.coaches.filter((c) => c.role !== role), coach];
  const nextFs: FacilitiesState = { ...fs, coaches, nextCoachId: fs.nextCoachId + 1 };
  const next: GameState = { ...state, facilities: nextFs };
  if (role === 'head') {
    next.staff = { ...(state.staff ?? { coach: 0, physio: 0, scout: 0 }), coach: levelFromQuality(quality) };
  } else if (role === 'goalkeeping' || role === 'fitness') {
    // Fitness/GK coaches sharpen the medical/physio side of the legacy staff scale.
    next.staff = { ...(state.staff ?? { coach: 0, physio: 0, scout: 0 }), physio: Math.max(state.staff?.physio ?? 0, levelFromQuality(quality)) };
  }
  return next;
}

export function fireCoach(state: GameState, coachId: number): GameState {
  const fs = state.facilities;
  if (!fs) return state;
  const coach = fs.coaches.find((c) => c.id === coachId);
  if (!coach) return state;
  const coaches = fs.coaches.filter((c) => c.id !== coachId);
  const next: GameState = { ...state, facilities: { ...fs, coaches } };
  if (coach.role === 'head') next.staff = { ...(state.staff ?? { coach: 0, physio: 0, scout: 0 }), coach: 0 };
  return next;
}

/* --- Scouting -------------------------------------------------------------- */

const SCOUT_NAMES = [
  'Frank Delaney', 'Hiroshi Tanaka', 'Colm Brady', 'Nadia Farouk', 'Ilya Petrov',
  'Gareth Vance', 'Mikael Sund', 'Otto Brandt', 'Diego Serrano', 'Amara Nwosu',
];

function assignmentDuration(kind: ScoutAssignmentKind): number {
  return kind === 'opponent' ? 1 : kind === 'youth' ? 3 : 2;
}

export function assignScout(state: GameState, kind: ScoutAssignmentKind, targetClubId?: number): GameState {
  const sc = state.scouting ?? newScouting();
  const weeks = assignmentDuration(kind);
  const name = SCOUT_NAMES[sc.nextAssignmentId % SCOUT_NAMES.length];
  const assignment: ScoutAssignment = {
    id: sc.nextAssignmentId,
    scoutName: name,
    kind,
    targetClubId,
    startWeek: state.week,
    startYear: state.seasonYear,
    dueWeek: state.week + weeks,
    dueYear: state.seasonYear,
    weeksRemaining: weeks,
    complete: false,
  };
  return {
    ...state,
    scouting: { ...sc, assignments: [...sc.assignments, assignment], nextAssignmentId: sc.nextAssignmentId + 1 },
  };
}

function summarizeClub(state: GameState, club: Club): OpponentReport {
  const squad = club.playerIds.map((id) => state.players[id]).filter((p): p is NonNullable<typeof p> => !!p);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const pac = avg(squad.map((p) => p.pac));
  const def = avg(squad.map((p) => p.def));
  const sho = avg(squad.map((p) => p.sho));
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (pac >= 72) strengths.push('pace on the counter'); else weaknesses.push('lacks pace in behind');
  if (def >= 68) strengths.push('organised defence'); else weaknesses.push('defensively suspect');
  if (sho >= 68) strengths.push('clinical finishing'); else weaknesses.push('wasteful in front of goal');
  return {
    id: 0,
    clubId: club.id,
    weekGenerated: state.week,
    yearGenerated: state.seasonYear,
    summary: `${club.name} average rating ${avg(squad.map((p) => p.rating))}. Plays ${club.playStyle ?? 'balanced'}.`,
    strengths,
    weaknesses,
  };
}

/** Advance every scout assignment by one week; resolve completed ones into
 *  opponent reports or shortlist additions. Idempotent per week, same
 *  contract as tickFacilityProjects. */
export function tickScouting(state: GameState): GameState {
  const sc = state.scouting;
  if (!sc || sc.assignments.every((a) => a.complete)) return state;

  let reports = sc.reports;
  let nextReportId = sc.nextReportId;
  let shortlist = sc.shortlist;
  const news: string[] = [];

  const assignments = sc.assignments.map((a) => {
    if (a.complete) return a;
    const weeksRemaining = a.weeksRemaining - 1;
    if (weeksRemaining > 0) return { ...a, weeksRemaining };

    if (a.kind === 'opponent' && a.targetClubId != null) {
      const club = state.clubs.find((c) => c.id === a.targetClubId);
      if (club) {
        const report = { ...summarizeClub(state, club), id: nextReportId };
        reports = [report, ...reports];
        nextReportId += 1;
        news.unshift(`Scouting report ready: ${club.name}.`);
        return { ...a, weeksRemaining: 0, complete: true, reportId: report.id };
      }
    } else if (a.kind === 'player-search' || a.kind === 'youth') {
      // Surface a small number of plausible targets by rating band; player
      // discovery itself lives in transferMarket.ts (owned elsewhere) —
      // here we just pick from the existing pool so the shortlist has real ids.
      const pool = Object.values(state.players).filter((p) =>
        a.kind === 'youth' ? p.age <= 20 && p.clubId !== state.userClubId : p.clubId !== state.userClubId && p.clubId !== 0
      );
      const picks = pool
        .sort((x, y) => y.rating - x.rating)
        .slice(0, 3)
        .map((p) => p.id);
      shortlist = Array.from(new Set([...shortlist, ...picks]));
      news.unshift(`${a.scoutName} filed ${picks.length} new lead(s) from a ${a.kind === 'youth' ? 'youth' : 'player'} search.`);
      return { ...a, weeksRemaining: 0, complete: true, foundPlayerIds: picks };
    }
    return { ...a, weeksRemaining: 0, complete: true };
  });

  return {
    ...state,
    scouting: { ...sc, assignments, reports, nextReportId, shortlist },
    news: news.length ? [...news, ...state.news] : state.news,
  };
}

export function toggleShortlist(state: GameState, playerId: number): GameState {
  const sc = state.scouting ?? newScouting();
  const has = sc.shortlist.includes(playerId);
  const shortlist = has ? sc.shortlist.filter((id) => id !== playerId) : [...sc.shortlist, playerId];
  return { ...state, scouting: { ...sc, shortlist } };
}

/** Advance facilities projects and scout assignments by one week. Call once
 *  per week — the FacilitiesScreen/ScoutScreen catch-up effect and the
 *  smoke test both drive this the same way, since neither this module nor
 *  its owning screens may edit seasonProgression.ts's own weekly tick. */
export function tickFacilitiesWeek(state: GameState): GameState {
  return tickScouting(tickFacilityProjects(state));
}
