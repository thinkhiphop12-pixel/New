/**
 * Set pieces — routines, designated takers, and the box assignments that decide
 * how dangerous a dead ball actually is.
 *
 * Ported from the reference. Before this, corners were a counter on the stats
 * panel: they generated nothing and cost nothing. Now a corner's value comes
 * from the delivery of the man actually taking it, the aerial threat of the men
 * attacking it, and the routine chosen — and committing bodies forward leaves
 * you exposed to the counter.
 */
import type { PlayStyle, Player, Tactics } from './types';

/* --- Routines ------------------------------------------------------------ */

export type CornerRoutine = 'near-post' | 'far-post' | 'drilled' | 'short' | 'edge-of-box';

/** Per-routine coefficients: overall danger, how much it leans on aerial
 *  ability, and how much falls to a man on the edge of the box. A short corner
 *  does not care how tall your centre-backs are. */
export const CORNER_ROUTINES: Record<CornerRoutine, { xg: number; aerial: number; edge: number }> = {
  'near-post':   { xg: 1.00, aerial: 0.85, edge: 0.10 },
  'far-post':    { xg: 1.14, aerial: 1.00, edge: 0.08 },
  drilled:       { xg: 1.03, aerial: 0.55, edge: 0.22 },
  short:         { xg: 0.74, aerial: 0.20, edge: 0.55 },
  'edge-of-box': { xg: 0.88, aerial: 0.10, edge: 0.80 },
};

export type CornerDefense = 'zonal' | 'man' | 'mixed';
const CORNER_DEF_MULT: Record<CornerDefense, number> = { zonal: 0.82, man: 0.96, mixed: 0.88 };

/* --- Takers -------------------------------------------------------------- */

export type SPJob = 'penalty' | 'fkShoot' | 'fkDeliver' | 'corner';

type PosGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

/** What each job asks for, and which positions tend to do it. */
const SP_JOBS: Record<SPJob, { stats: Partial<Record<'sho' | 'pas', number>>; posW: Record<PosGroup, number> }> = {
  // Nerve and technique from twelve yards — finishing, nothing else.
  penalty:   { stats: { sho: 1.0 },              posW: { ATT: 2.2, MID: 1.5, DEF: 0.6, GK: 0.02 } },
  // Bending one over the wall: mostly striking the ball, partly technique.
  fkShoot:   { stats: { sho: 0.68, pas: 0.32 },  posW: { ATT: 1.6, MID: 1.9, DEF: 0.7, GK: 0.02 } },
  // Whipping one into the mixer from wide.
  fkDeliver: { stats: { pas: 1.0 },              posW: { ATT: 1.0, MID: 2.0, DEF: 1.0, GK: 0.02 } },
  corner:    { stats: { pas: 1.0 },              posW: { ATT: 0.8, MID: 2.2, DEF: 0.9, GK: 0.01 } },
};

function group(pos: string): PosGroup {
  return pos === 'GK' ? 'GK' : pos === 'DEF' ? 'DEF' : pos === 'MID' ? 'MID' : 'ATT';
}

/** Best man on the pitch for a job, when none has been designated. */
export function bestForJob(xi: Player[], job: SPJob): Player | null {
  const spec = SP_JOBS[job] ?? SP_JOBS.corner;
  let best: Player | null = null;
  let bestScore = -1;
  for (const p of xi) {
    const w = spec.posW[group(p.pos)] ?? 1;
    if (w <= 0) continue;
    let q = 0;
    let tw = 0;
    for (const [stat, weight] of Object.entries(spec.stats) as ['sho' | 'pas', number][]) {
      q += (p[stat] ?? 50) * weight;
      tw += weight;
    }
    const sc = (q / (tw || 1)) * (0.55 + w * 0.35);
    if (sc > bestScore) {
      bestScore = sc;
      best = p;
    }
  }
  return best ?? xi[0] ?? null;
}

/** Designated taker if one is set and on the pitch, otherwise the best fit. */
export function setPieceTaker(xi: Player[], tac: Tactics, job: SPJob): Player | null {
  const sp = tac.setPieces;
  const key = job === 'corner' ? 'corners' : job === 'penalty' ? 'penalties' : job;
  const id = sp?.[key as keyof typeof sp] as number | undefined;
  const designated = id != null ? xi.find((p) => p.id === id) : undefined;
  return designated ?? bestForJob(xi, job);
}

/* --- Box assignments ----------------------------------------------------- */

export type BoxJob = 'far' | 'near' | 'six' | 'edge' | 'back';
export type DefBoxJob = 'post' | 'mark' | 'zone' | 'edge' | 'up';

export const BOX_JOB_LABEL: Record<BoxJob, string> = {
  far: 'Far Post', near: 'Near Post', six: 'Six-Yard Box', edge: 'Edge of Box', back: 'Stay Back',
};
export const DEF_BOX_JOB_LABEL: Record<DefBoxJob, string> = {
  post: 'Guard Post', mark: 'Man-Mark', zone: 'Hold Zone', edge: 'Second Ball', up: 'Stay Up',
};

const DEFAULT_BOX_COMMIT = 5;
const DEFAULT_EDGE_MEN = 2;
const DEFAULT_POSTS = 2;
const DEFAULT_UP_MEN = 1;

/** Centre-backs and strikers attack corners; full-backs and wingers less so. */
const BOX_POS_BIAS: Record<string, number> = { GK: -60, DEF: 8, MID: 0, FWD: 6 };

/** Default attacking assignments: biggest men nearest the goal. */
export function autoBoxJobs(xi: Player[], takerId: number | null): Record<number, BoxJob> {
  const jobs: Record<number, BoxJob> = {};
  const score = (p: Player) => p.phy + (BOX_POS_BIAS[p.pos] ?? 0);
  const attackers = xi.filter((p) => p.id !== takerId).sort((a, b) => score(b) - score(a));
  attackers.forEach((p, i) => {
    jobs[p.id] = i === 0 ? 'far'
      : i === 1 ? 'near'
      : i < DEFAULT_BOX_COMMIT ? 'six'
      : i < DEFAULT_BOX_COMMIT + DEFAULT_EDGE_MEN ? 'edge'
      : 'back';
  });
  return jobs;
}

interface BoxPlan { inBox: Player[]; edge: Player[]; back: Player[] }

function boxPlan(xi: Player[], tac: Tactics, takerId: number | null): BoxPlan {
  const assigned = tac.setPieces?.boxJobs ?? autoBoxJobs(xi, takerId);
  const plan: BoxPlan = { inBox: [], edge: [], back: [] };
  for (const p of xi) {
    if (p.id === takerId) continue;
    const job = assigned[p.id] ?? 'back';
    if (job === 'edge') plan.edge.push(p);
    else if (job === 'back') plan.back.push(p);
    else plan.inBox.push(p);
  }
  return plan;
}

/**
 * Aerial threat of the men actually in the box, not the squad average.
 *
 * Expressed on the same 0-100 scale as `phy` so it can be compared against the
 * neutral point of 72 below: strength is the base, height a modest bonus either
 * side of a 182cm norm. An earlier version blended a raw height figure that
 * topped out near 40, which dragged every side below neutral and quietly
 * nerfed set pieces across the board.
 */
function boxAerialThreat(plan: BoxPlan): number {
  const men = plan.inBox;
  if (!men.length) return 60;
  const phy = men.reduce((s, p) => s + p.phy, 0) / men.length;
  const height = men.reduce((s, p) => s + p.height, 0) / men.length;
  return phy + (height - 182) * 0.8;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* --- The numbers the match engine consumes ------------------------------- */

/**
 * Multiplier on a corner's base xG: delivery quality × aerial threat × routine.
 * Returns ~1.0 for an average side taking a standard far-post corner.
 */
export function setPieceXG(xi: Player[], tac: Tactics): number {
  const routine = CORNER_ROUTINES[cornerRoutineOf(tac)];
  const taker = setPieceTaker(xi, tac, 'corner');
  const delivery = taker?.pas ?? 65;
  const plan = boxPlan(xi, tac, taker?.id ?? null);
  const aerial = boxAerialThreat(plan);
  const deliveryF = clamp(0.72 + (delivery - 66) * 0.009, 0.60, 1.32);
  const aerialF = 1 + ((aerial - 72) / 72) * 0.60 * routine.aerial;
  return routine.xg * deliveryF * clamp(aerialF, 0.70, 1.35);
}

export function cornerRoutineOf(tac: Tactics): CornerRoutine {
  const key = tac.setPieces?.cornerRoutine;
  return key && CORNER_ROUTINES[key] ? key : 'far-post';
}

/** How much the defending side suppresses a set piece. Lower = better defence. */
export function spDefenseMult(xi: Player[], tac: Tactics): number {
  const base = CORNER_DEF_MULT[tac.setPieces?.cornerDefense ?? 'mixed'] ?? 0.88;
  const jobs = tac.setPieces?.defJobs;
  if (!jobs) return base;
  const count = (j: DefBoxJob) => xi.filter((p) => jobs[p.id] === j).length;
  // Fewer men on the posts is riskier; more men staying up is riskier still.
  const postF = clamp(1 + (DEFAULT_POSTS - count('post')) * 0.035, 0.94, 1.10);
  const upF = clamp(1 + (count('up') - DEFAULT_UP_MEN) * 0.045, 0.94, 1.16);
  return base * postF * upF;
}

/** Counter-attack exposure from committing bodies forward at your own corner. */
export function spExposure(xi: Player[], tac: Tactics): number {
  const taker = setPieceTaker(xi, tac, 'corner');
  const plan = boxPlan(xi, tac, taker?.id ?? null);
  const committed = plan.inBox.length + plan.edge.length;
  return clamp(1 + (committed - (DEFAULT_BOX_COMMIT + DEFAULT_EDGE_MEN)) * 0.020, 0.95, 1.09);
}

/** Counter-attack outlet from leaving men up when defending a set piece. */
export function spOutletBonus(xi: Player[], tac: Tactics): number {
  const jobs = tac.setPieces?.defJobs;
  if (!jobs) return 1.0;
  const up = xi.filter((p) => jobs[p.id] === 'up').length;
  return clamp(1 + (up - DEFAULT_UP_MEN) * 0.018, 0.98, 1.05);
}

/** Styles that naturally lean on dead balls, used to pick an AI club's routine. */
export function defaultRoutineFor(style: PlayStyle): CornerRoutine {
  if (style === 'longball' || style === 'direct') return 'far-post';
  if (style === 'tiki-taka' || style === 'possession') return 'short';
  if (style === 'catenaccio' || style === 'parkbus') return 'edge-of-box';
  return 'near-post';
}
