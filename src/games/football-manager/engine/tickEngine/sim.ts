import type { FormationDef, GameState, Player, Tactics } from '../types';
import { HOME_ADVANTAGE, MAX_SUBS, MORALE_START, getFormation } from '../gameRules';
import { aiMatchSetup, availableSquad, lineupStrength, squadAvgRating } from '../teamManagement';
import { scorerTraitMult } from '../traits';
import { weightedIndex } from '../utils';
import { MENTALITIES, type MentalityId, compactFormation, normalizeMentality } from './tacticsData';
import { bump, ratingsFromCounts } from './ratings';
import {
  CONTACT_MULT, DEF_PRESS_W, INJURY_TYPES, PENALTY_SPOT_X, SHOOTER_W, SHOOT_GROUP_IDX,
  SHOT_ARCH, type Contact, type XISlot, buildXI, calcMatchXG, chanceProfile, effAttr,
  fatigueInjuryMult, pickInjuryType, sampleShotLocation, sharpnessAt, shotBaseXG,
  tacShotVol, teamStaminaRate,
} from './xgModel';
import * as says from './commentary';
import type {
  MatchTimeline,
  MinuteSnapshot,
  PlayerCounts,
  ResumeContext,
  ResumeSideContext,
  SideStats,
  TeamSide,
  TickMatchEvent,
  TickSimOptions,
} from './types';

const TICKS_PER_MINUTE = 4;

interface SideState {
  side: TeamSide;
  clubId: number;
  name: string;
  isUser: boolean;
  lineup: (number | null)[];
  formationId: string;
  formation: FormationDef;
  mentality: MentalityId;
  tactics: Tactics;
  morale: number;
  chemistry: number;
  strengthMult: number; // difficulty scaling for the user's opponent
  subsUsed: number;
  sentOff: number[];
  fatigue: Record<number, number>;
  yellows: Record<number, number>;
  counts: Record<number, PlayerCounts>;
  appeared: Set<number>;
  stats: SideStats;
  possessionTicks: number;
  attack: number;
  defense: number;

  /* --- Phase 4: the shot-level model. --- */
  /** The XI as deployed, carrying each man's positional fit for his slot. */
  xi: XISlot[];
  /** How hard this side's instructions ask its players to run. */
  stamRate: number;
  /** Relative weight of each shot archetype for this side, this match. */
  profile: Record<string, number>;
  /** xG budget for the match from `calcMatchXG`. */
  budgetXG: number;
  /** Shots the side is expected to take across 90'. */
  targetShots: number;
  /** Holds the shot sheet to its budget so location sampling can't inflate it. */
  shotScale: number;
}

interface Sim {
  state: GameState;
  home: SideState;
  away: SideState;
  minute: number;
  possession: TeamSide;
  ballZone: 0 | 1 | 2 | 3 | 4;
  momentum: number;
  events: TickMatchEvent[];
  snapshots: MinuteSnapshot[];
  headless: boolean;
  ballX: number;
  baseScore: { home: number; away: number };
  /** Final whistle minute — 90 plus both halves' stoppage time (gap 18). */
  matchEnd: number;
  /** Minute the first half's added time ran to. */
  halfEnd: number;
}

const freshStats = (): SideStats => ({ possession: 50, shots: 0, onTarget: 0, xg: 0, corners: 0, fouls: 0 });

function onPitch(s: Sim, side: SideState): Player[] {
  return side.lineup
    .filter((id): id is number => id !== null)
    .map((id) => s.state.players[id])
    .filter(Boolean);
}

function refreshStrength(s: Sim, side: SideState): void {
  // The deployed XI (and therefore every OOP-weighted stat aggregation) is
  // rebuilt whenever the lineup changes — a sub or a sending-off.
  side.xi = buildXI(s.state, side.lineup, side.formation);
  const st = lineupStrength(s.state, side.lineup, side.formation, side.tactics, side.morale, side.chemistry);
  const men = side.lineup.filter((id) => id !== null).length;
  const shortHanded = men < 11 ? Math.pow(0.93, 11 - men) : 1;
  side.attack = st.attack * side.strengthMult * shortHanded;
  side.defense = st.defense * side.strengthMult * (men < 11 ? Math.pow(0.96, 11 - men) : 1);
}

function fatigueFactor(side: SideState): number {
  const vals = Object.values(side.fatigue);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  return 1 - avg / 600;
}

function effAttack(s: Sim, side: SideState): number {
  const home = side.side === 'home' ? Math.sqrt(HOME_ADVANTAGE) : 1;
  return side.attack * MENTALITIES[side.mentality].attackBonus * fatigueFactor(side) * home;
}

function effDefense(side: SideState): number {
  return side.defense * MENTALITIES[side.mentality].defenceBonus * fatigueFactor(side);
}

function push(s: Sim, e: TickMatchEvent): void {
  s.events.push(e);
}

function commentary(s: Sim, side: SideState | null, text: string, assistant = false): void {
  if (s.headless || !text) return;
  push(s, { minute: s.minute, type: 'info', clubId: side?.clubId ?? 0, text, side: side?.side, assistant });
}

function pickWeighted(players: Player[], weight: (p: Player) => number): Player | null {
  if (!players.length) return null;
  return players[weightedIndex(players.map(weight))];
}

/**
 * Who takes the shot depends on where it comes from: tap-ins fall to
 * strikers, shots from range are hit by midfielders, crosses are attacked by
 * the tall men including centre-backs pushed up for a set piece.
 */
function pickShooter(s: Sim, side: SideState, archKey: string): Player | null {
  const table = SHOOTER_W[archKey] ?? SHOOTER_W.box_central;
  const A = SHOT_ARCH[archKey];
  const aerial = A.header === 1 || !!A.aerial;
  return pickWeighted(onPitch(s, side), (p) => {
    const base = table[SHOOT_GROUP_IDX[p.role] ?? 3] ?? 1;
    if (base <= 0) return 0;
    const skill = aerial ? 0.55 + p.phy / 150 : 0.65 + p.sho / 190;
    return base * skill * scorerTraitMult(p);
  });
}

/** Vision-weighted assist selection — passing carries it, dribbling helps. */
function pickAssister(s: Sim, side: SideState, notId: number): Player | null {
  const pool = onPitch(s, side).filter((p) => p.id !== notId && p.pos !== 'GK');
  return pickWeighted(pool, (p) => {
    const posW = p.pos === 'MID' ? 3 : p.pos === 'FWD' ? 2 : 0.7;
    const vision = (Math.max(p.pas, 20) * 1.0 + Math.max(p.dri, 20) * 0.4) / 1.4;
    return posW * vision;
  });
}

/** The man throwing himself in front of the shot. */
function pickBlocker(s: Sim, side: SideState): Player | null {
  return pickWeighted(onPitch(s, side), (p) => (DEF_PRESS_W[p.role] ?? 1) * (0.5 + p.def / 130));
}

function pickDefender(s: Sim, side: SideState): Player | null {
  return pickWeighted(
    onPitch(s, side).filter((p) => p.pos !== 'GK'),
    (p) => (p.pos === 'DEF' ? 3 : p.pos === 'MID' ? 1.6 : 0.4) * Math.max(p.def, 20)
  );
}

function keeper(s: Sim, side: SideState): Player | null {
  return onPitch(s, side).find((p) => p.pos === 'GK') ?? null;
}

function mirrorZone(z: number): 0 | 1 | 2 | 3 | 4 {
  return (4 - z) as 0 | 1 | 2 | 3 | 4;
}

/** Remove a player from the pitch (red card or injury with no subs left). */
function removePlayer(s: Sim, side: SideState, playerId: number): void {
  side.lineup = side.lineup.map((id) => (id === playerId ? null : id));
  const men = side.lineup.filter((id) => id !== null).length;
  const compact = compactFormation(men);
  if (compact && compact !== side.formationId) {
    side.formationId = compact;
    side.formation = getFormation(compact);
    commentary(s, side, `${side.name} drop into a ${compact} — compact shape.`);
  }
  refreshStrength(s, side);
}

/** Bring on the best like-for-like bench player, if a sub is available. */
function autoSub(s: Sim, side: SideState, outId: number): void {
  const out = s.state.players[outId];
  if (side.subsUsed >= MAX_SUBS) {
    removePlayer(s, side, outId);
    return;
  }
  const usedIds = new Set([...side.appeared, ...side.sentOff]);
  const bench = availableSquad(s.state, side.clubId).filter((p) => !usedIds.has(p.id));
  const like = bench.filter((p) => p.pos === out?.pos);
  const sub = (like.length ? like : bench).sort((a, b) => b.rating * b.form - a.rating * a.form)[0];
  if (!sub) {
    removePlayer(s, side, outId);
    return;
  }
  side.lineup = side.lineup.map((id) => (id === outId ? sub.id : id));
  side.subsUsed++;
  side.appeared.add(sub.id);
  side.fatigue[sub.id] = 0;
  if (!s.headless)
    push(s, { minute: s.minute, type: 'info', clubId: side.clubId, side: side.side, kind: 'sub', text: says.subText(sub.name, out?.name ?? 'a teammate') });
  refreshStrength(s, side);
}

/**
 * Seven-type injury model (gap 25). Tired legs get hurt far more often —
 * exponential in fitness, so genuinely fit players are genuinely safe. The
 * severity, day-based layoff and any permanent potential loss ride on the
 * event so `applyReportStats` can apply them to the save.
 */
function checkInjury(s: Sim, side: SideState): void {
  const players = onPitch(s, side).filter((p) => p.pos !== 'GK');
  if (!players.length) return;
  // Live fitness = the fitness he started on, less what this match has taken.
  const liveFit = (p: Player) => (p.fitness ?? 80) * sharpnessAt(p, s.minute, side.stamRate);
  const avgMult = players.reduce((a, p) => a + fatigueInjuryMult(liveFit(p)), 0) / players.length;
  if (Math.random() >= 0.00085 * avgMult) return;
  const victim = pickWeighted(players, (p) => fatigueInjuryMult(liveFit(p)));
  if (!victim) return;
  // A knock in open play is usually a knock; the serious ones are rarer and
  // skew toward whoever is running on empty.
  const drained = liveFit(victim) < 55;
  const pool = drained ? INJURY_TYPES : INJURY_TYPES.filter((x) => x.severity !== 'career');
  const type = pickInjuryType(pool);
  const days = type.minDays + Math.floor(Math.random() * (type.maxDays - type.minDays + 1));
  push(s, {
    minute: s.minute,
    type: 'injury',
    clubId: side.clubId,
    side: side.side,
    playerId: victim.id,
    injuryType: type.id,
    injuryDays: days,
    potDrop: type.potDrop,
    text: says.injuryText(victim.name, type.label, days),
  });
  autoSub(s, side, victim.id);
}

function checkFoul(s: Sim, defending: SideState, attacking: SideState): void {
  if (s.ballZone < 3) return;
  if (Math.random() >= 0.028) return;
  const offender = pickDefender(s, defending);
  if (!offender) return;
  defending.stats.fouls++;
  bump(defending.counts, offender.id, 'foulCommitted');
  const r = Math.random();
  if (r < 0.015) {
    bump(defending.counts, offender.id, 'redCard');
    defending.sentOff.push(offender.id);
    push(s, { minute: s.minute, type: 'card', clubId: defending.clubId, side: defending.side, playerId: offender.id, card: 'red', text: says.redText(offender.name) });
    removePlayer(s, defending, offender.id);
  } else if (r < 0.23) {
    const had = (defending.yellows[offender.id] = (defending.yellows[offender.id] ?? 0) + 1);
    if (had >= 2) {
      bump(defending.counts, offender.id, 'redCard');
      defending.sentOff.push(offender.id);
      push(s, { minute: s.minute, type: 'card', clubId: defending.clubId, side: defending.side, playerId: offender.id, card: 'red', text: says.secondYellowText(offender.name) });
      removePlayer(s, defending, offender.id);
    } else {
      bump(defending.counts, offender.id, 'yellowCard');
      push(s, { minute: s.minute, type: 'card', clubId: defending.clubId, side: defending.side, playerId: offender.id, card: 'yellow', text: says.yellowText(offender.name) });
    }
  } else {
    commentary(s, attacking, says.foulText(offender.name));
  }
}

function nudgeMomentum(s: Sim, side: SideState, by: number): void {
  s.momentum = Math.max(-1, Math.min(1, s.momentum + (side.side === 'home' ? by : -by)));
}

/** Goals this player has already scored in this match (for hat-trick lines). */
function goalsBy(s: Sim, playerId: number): number {
  return s.events.filter((e) => e.type === 'goal' && e.playerId === playerId).length;
}

interface Shot {
  archKey: string;
  gx: number;
  gy: number;
  dist: number;
  contact: Contact;
  shooter: Player;
  assist: Player | null;
  blocker: Player | null;
  xg: number;
}

/**
 * One complete chance: archetype → location → taker → the pass that made it →
 * the defender closing him down → the keeper he has to beat. Ported from the
 * reference's `makeShot`; every attribute is read at the player's sharpness
 * for this minute, so tired legs visibly cost you late on.
 */
function makeShot(s: Sim, att: SideState, def: SideState, minute: number, forceArch?: string): Shot | null {
  const keys = Object.keys(att.profile);
  const archKey = forceArch ?? keys[weightedIndex(keys.map((k) => att.profile[k] ?? 0))];
  const A = SHOT_ARCH[archKey];
  if (!A) return null;
  const { gx, gy } = A.isPen ? { gx: PENALTY_SPOT_X, gy: 0 } : sampleShotLocation(archKey);
  const shooter = pickShooter(s, att, archKey);
  if (!shooter) return null;

  const contact: Contact = A.header === 1 ? 'header'
    : Math.random() < A.header ? 'header'
    : Math.random() < A.volley ? 'volley' : 'foot';
  const sSharp = sharpnessAt(shooter, minute, att.stamRate);
  let xg = shotBaseXG(gx, gy) * A.mult * CONTACT_MULT[contact];

  // The finisher: technique and composure in front of goal (a header is as
  // much about attacking the ball as about striking it).
  const fin = contact === 'header'
    ? effAttr(shooter, 'shooting', sSharp) * 0.5 + effAttr(shooter, 'physical', sSharp) * 0.5
    : effAttr(shooter, 'shooting', sSharp);
  xg *= Math.max(0.55, Math.min(1.55, 1 + (fin - 68) * 0.0105));

  // The pass that made it. A defence-splitting ball leaves a far better chance
  // than a hopeful one — and its author gets the assist if it goes in.
  let assist: Player | null = null;
  if (!A.setPiece && Math.random() < (A.setPlay === 'corner' ? 0.9 : 0.74)) {
    assist = pickAssister(s, att, shooter.id);
    if (assist) {
      const aSharp = sharpnessAt(assist, minute, att.stamRate);
      const vision = (effAttr(assist, 'passing', aSharp) * 1.0 + effAttr(assist, 'dribbling', aSharp) * 0.4) / 1.4;
      xg *= Math.max(0.82, Math.min(1.22, 1 + (vision - 68) * 0.0055));
    }
  }

  // Someone is closing him down — unless he's clean through on goal.
  let blocker: Player | null = null;
  if (!A.setPiece && Math.random() < (archKey === 'one_on_one' ? 0.35 : 0.92)) {
    blocker = pickBlocker(s, def);
    if (blocker) {
      const dSharp = sharpnessAt(blocker, minute, def.stamRate);
      const dq = effAttr(blocker, 'defending', dSharp) * 0.7 + effAttr(blocker, 'physical', dSharp) * 0.3;
      xg *= Math.max(0.62, Math.min(1.22, 1 - (dq - 66) * 0.0075));
    }
  }

  // And a keeper to beat. How much he matters depends on the chance: an elite
  // keeper saves you far more one-on-ones than tap-ins.
  const gk = keeper(s, def);
  if (gk) {
    const gSharp = sharpnessAt(gk, minute, def.stamRate);
    const gq = effAttr(gk, 'gkReflexes', gSharp) * 0.6 + effAttr(gk, 'gkPositioning', gSharp) * 0.4;
    xg *= Math.max(0.55, Math.min(1.35, 1 - (gq - 68) * 0.0042 * A.gk));
  }

  // A penalty isn't an open-play chance — twelve yards, no defenders, and a
  // straight contest between the taker's nerve and the keeper's.
  if (A.isPen) {
    const gkSharp = gk ? sharpnessAt(gk, minute, def.stamRate) : 1;
    xg = 0.76 + (effAttr(shooter, 'shooting', sSharp) - 70) * 0.0035
      - (gk ? (effAttr(gk, 'gkReflexes', gkSharp) - 70) * 0.003 : 0);
    xg = Math.max(0.55, Math.min(0.92, xg));
  } else {
    // Hold the shot to the side's xG budget so sampling noise in the location
    // draw can never quietly inflate or starve a team's output.
    xg *= att.shotScale;
  }

  return {
    archKey, gx, gy, contact, shooter, assist, blocker,
    dist: Math.sqrt(gx * gx + gy * gy),
    // Hard ceiling: no single chance is ever worth more than a certain goal.
    xg: Math.max(0.004, Math.min(0.95, xg)),
  };
}

/**
 * Outcome. The goal roll is the shot's own xG, so a side's expected goals is
 * exactly the sum of its chances; everything else decides how it missed.
 */
function resolveShot(s: Sim, att: SideState, def: SideState, forceArch?: string): void {
  const shot = makeShot(s, att, def, s.minute, forceArch);
  if (!shot) return;
  const A = SHOT_ARCH[shot.archKey];
  const { shooter, xg } = shot;
  att.stats.shots++;
  att.stats.xg += xg;

  const shotEvent = {
    gx: Math.round(shot.gx * 10) / 10,
    gy: Math.round(shot.gy * 10) / 10,
    xg: Math.round(xg * 1000) / 1000,
    archetype: shot.archKey,
    contact: shot.contact,
  };

  const scored = Math.random() < xg;
  if (scored) {
    att.stats.onTarget++;
    bump(att.counts, shooter.id, 'goal');
    if (shot.assist) bump(att.counts, shot.assist.id, 'assist');
    const hg = score(s, 'home') + (att.side === 'home' ? 1 : 0);
    const ag = score(s, 'away') + (att.side === 'away' ? 1 : 0);
    push(s, {
      minute: s.minute,
      type: 'goal',
      clubId: att.clubId,
      side: att.side,
      playerId: shooter.id,
      assistId: shot.assist?.id,
      ...shotEvent,
      text: says.goalText(shooter.name, att.name, hg, ag, s.home.name, s.away.name)
        + says.goalColour(s.minute, shot.archKey, hg, ag, att.side === 'home', goalsBy(s, shooter.id) + 1, s.matchEnd),
    });
    nudgeMomentum(s, att, 0.5);
    s.possession = def.side;
    s.ballZone = 2;
    return;
  }

  // Blocked before it ever troubles the keeper.
  const blockP = shot.blocker ? A.block * (0.7 + shot.blocker.def / 200) : A.block * 0.45;
  if (!A.isPen && Math.random() < blockP) {
    if (shot.blocker) bump(def.counts, shot.blocker.id, 'interception');
    if (!s.headless) push(s, { minute: s.minute, type: 'chance', clubId: att.clubId, side: att.side, playerId: shooter.id, kind: 'block', ...shotEvent, text: says.blockText(shooter.name) });
    if (Math.random() < 0.5) {
      att.stats.corners++;
      commentary(s, att, says.cornerText(att.name));
      s.ballZone = 4;
      return;
    }
    s.possession = def.side;
    s.ballZone = 0;
    return;
  }

  // Accuracy: sharp finishers hit the target from anywhere, distance drags
  // efforts wide and high, and headers are the hardest contact to direct.
  const acc = A.isPen ? 0.58
    : 0.36 + (shooter.sho - 65) * 0.006 - (shot.dist - 12) * 0.009 + (shot.contact === 'header' ? -0.06 : 0);
  const onTarget = Math.random() < Math.max(0.16, Math.min(0.74, acc));

  if (onTarget) {
    att.stats.onTarget++;
    bump(att.counts, shooter.id, 'shotOnTarget');
    const gk = keeper(s, def);
    if (gk) bump(def.counts, gk.id, 'save');
    if (!s.headless) push(s, { minute: s.minute, type: 'chance', clubId: att.clubId, side: att.side, playerId: shooter.id, kind: 'save', ...shotEvent, text: says.saveText(shooter.name) });
    nudgeMomentum(s, att, 0.1);
    if (Math.random() < 0.3) {
      att.stats.corners++;
      commentary(s, att, says.cornerText(att.name));
      s.ballZone = 4;
      return;
    }
    s.possession = def.side;
    s.ballZone = 0;
    return;
  }
  bump(att.counts, shooter.id, xg >= 0.25 ? 'bigChanceMissed' : 'shotOffTarget');
  if (!s.headless)
    push(s, {
      minute: s.minute, type: 'chance', clubId: att.clubId, side: att.side, playerId: shooter.id, kind: 'shot',
      ...shotEvent,
      text: xg >= 0.25 ? says.bigMissText(shooter.name) : says.missText(shooter.name),
    });
  nudgeMomentum(s, att, 0.06);
  s.possession = def.side;
  s.ballZone = 0;
}

function score(s: Sim, side: TeamSide): number {
  return s.baseScore[side] + s.events.filter((e) => e.type === 'goal' && e.side === side).length;
}

function tick(s: Sim): void {
  const att = s.possession === 'home' ? s.home : s.away;
  const def = s.possession === 'home' ? s.away : s.home;
  att.possessionTicks++;

  checkFoul(s, def, att);

  const ratio = effAttack(s, att) / effDefense(def);
  const ment = MENTALITIES[att.mentality];
  const momEdge = 1 + 0.12 * (att.side === 'home' ? s.momentum : -s.momentum);

  if (s.ballZone < 4) {
    const pAdvance = Math.min(0.58, Math.max(0.14, 0.31 * Math.pow(ratio, 1.1) * (0.8 + 0.2 * ment.riskFactor) * momEdge));
    const r = Math.random();
    if (r < pAdvance) {
      s.ballZone = (s.ballZone + 1) as Sim['ballZone'];
    } else if (r > pAdvance + 0.42) {
      // Turnover — the winning side may spring a counter against an exposed shape.
      const tackler = pickDefender(s, def);
      if (tackler) bump(def.counts, tackler.id, Math.random() < 0.5 ? 'tackle' : 'interception');
      s.possession = def.side;
      let z = mirrorZone(s.ballZone);
      if (z < 4 && Math.random() < 0.22 * MENTALITIES[att.mentality].counterExposure) z = (z + 1) as Sim['ballZone'];
      s.ballZone = z;
    }
  } else {
    // Shot rate is steered toward the side's expected shot count for the day
    // (budget xG / its own average chance quality), so the tick loop decides
    // *when* the chances come while calcMatchXG decides *how many*.
    const wanted = att.targetShots * Math.min(1, s.minute / 90);
    const deficit = wanted - att.stats.shots;
    const pShot = Math.min(0.75, Math.max(0.02, 0.20 * (1 + 0.55 * deficit) * Math.pow(ratio, 0.25) * momEdge));
    const r = Math.random();
    if (r < pShot) {
      resolveShot(s, att, def);
    } else if (r > 0.62) {
      const tackler = pickDefender(s, def);
      if (tackler) bump(def.counts, tackler.id, Math.random() < 0.6 ? 'tackle' : 'interception');
      s.possession = def.side;
      s.ballZone = 0;
    }
  }

  // Fatigue accrual for the XI, scaled by mentality.
  for (const side of [s.home, s.away]) {
    const rate = 0.014 * MENTALITIES[side.mentality].fatigueRate;
    for (const id of side.lineup) if (id !== null) side.fatigue[id] = Math.min(100, (side.fatigue[id] ?? 0) + rate);
  }
}

function sideContext(side: SideState): ResumeSideContext {
  return {
    lineup: [...side.lineup],
    formationId: side.formationId,
    mentality: side.mentality,
    subsUsed: side.subsUsed,
    sentOff: [...side.sentOff],
    fatigue: { ...side.fatigue },
    yellows: { ...side.yellows },
    counts: JSON.parse(JSON.stringify(side.counts)) as Record<number, PlayerCounts>,
    appeared: [...side.appeared],
  };
}

function snapshot(s: Sim): MinuteSnapshot {
  const total = s.home.possessionTicks + s.away.possessionTicks || 1;
  s.home.stats.possession = Math.round((100 * s.home.possessionTicks) / total);
  s.away.stats.possession = 100 - s.home.stats.possession;
  s.ballX = Math.min(0.85, Math.max(0.15, s.ballX + (Math.random() - 0.5) * 0.3));
  const zy = (s.ballZone + 0.5) / 5;
  return {
    minute: s.minute,
    ballX: s.ballX,
    ballY: s.possession === 'home' ? zy : 1 - zy,
    possession: s.possession,
    momentum: s.momentum,
    score: { home: score(s, 'home'), away: score(s, 'away') },
    stats: { home: { ...s.home.stats }, away: { ...s.away.stats } },
    resume: {
      score: { home: score(s, 'home'), away: score(s, 'away') },
      stats: { home: { ...s.home.stats }, away: { ...s.away.stats } },
      possessionTicks: { home: s.home.possessionTicks, away: s.away.possessionTicks },
      momentum: s.momentum,
      ballZone: s.ballZone,
      possession: s.possession,
      home: sideContext(s.home),
      away: sideContext(s.away),
    },
  };
}

function makeSide(
  state: GameState,
  side: TeamSide,
  clubId: number,
  opponentId: number,
  opts: TickSimOptions
): SideState {
  const isUser = clubId === state.userClubId;
  const club = state.clubs.find((c) => c.id === clubId);
  let lineup: (number | null)[];
  let formationId: string;
  let tactics: Tactics;
  let mentality: MentalityId;
  let morale = MORALE_START;
  let chemistry = 50;
  if (isUser) {
    formationId = opts.userFormationId ?? state.dualFormation?.inPossessionId ?? state.formationId;
    lineup = opts.userLineup ?? state.lineup;
    tactics = opts.userTactics ?? state.tactics;
    mentality = opts.userMentality ?? normalizeMentality(state.tactics.mentality);
    morale = state.morale;
    chemistry = state.chemistry;
  } else {
    const setup = aiMatchSetup(state, clubId, opponentId);
    lineup = setup.lineup;
    formationId = setup.formation.id;
    tactics = setup.tactics;
    const diff = squadAvgRating(state, clubId) - squadAvgRating(state, opponentId);
    mentality = diff > 5 ? 'attacking' : diff < -5 ? 'defensive' : 'balanced';
  }
  const userInvolved = state.userClubId === clubId || state.userClubId === opponentId;
  const strengthMult = !isUser && userInvolved && opts.difficulty ? opts.difficulty : 1;
  const s: SideState = {
    side,
    clubId,
    name: club?.name ?? '???',
    isUser,
    lineup: [...lineup],
    formationId,
    formation: getFormation(formationId),
    mentality,
    tactics,
    morale,
    chemistry,
    strengthMult,
    subsUsed: 0,
    sentOff: [],
    fatigue: {},
    yellows: {},
    counts: {},
    appeared: new Set(lineup.filter((id): id is number => id !== null)),
    stats: freshStats(),
    possessionTicks: 0,
    attack: 50,
    defense: 50,
    xi: [],
    stamRate: teamStaminaRate(tactics),
    profile: {},
    budgetXG: 1.3,
    targetShots: 12,
    shotScale: 1,
  };
  return s;
}

function applyResume(side: SideState, ctx: ResumeSideContext, stats: SideStats, ticks: number): void {
  side.lineup = [...ctx.lineup];
  side.formationId = ctx.formationId;
  side.formation = getFormation(ctx.formationId);
  side.mentality = ctx.mentality;
  side.subsUsed = ctx.subsUsed;
  side.sentOff = [...ctx.sentOff];
  side.fatigue = { ...ctx.fatigue };
  side.yellows = { ...ctx.yellows };
  side.counts = JSON.parse(JSON.stringify(ctx.counts)) as Record<number, PlayerCounts>;
  side.appeared = new Set(ctx.appeared);
  side.stats = { ...stats };
  side.possessionTicks = ticks;
}

/**
 * Set each side's xG budget (the tactical chain), the shape of the chances it
 * creates, and how many shots that budget pays for. Probing the side's own
 * chance profile for its typical chance value is how a team that can play
 * through you ends up taking fewer, better shots than one that can't.
 */
function initShotModel(s: Sim): void {
  const qualityMult = (side: SideState) =>
    side.strengthMult * (1 + (side.morale - 60) / 900) * (1 + (side.chemistry - 50) / 1200);
  const xg = calcMatchXG(
    { xi: s.home.xi, tactics: s.home.tactics, mentality: s.home.mentality, qualityMult: qualityMult(s.home) },
    { xi: s.away.xi, tactics: s.away.tactics, mentality: s.away.mentality, qualityMult: qualityMult(s.away) }
  );
  s.home.budgetXG = xg.homeXG;
  s.away.budgetXG = xg.awayXG;
  for (const [att, def] of [[s.home, s.away], [s.away, s.home]] as [SideState, SideState][]) {
    att.profile = chanceProfile(att.xi, att.tactics, def.xi);
    att.shotScale = 1;
    // Probe what a typical chance is worth to this side, then take as many as
    // the day's xG budget pays for.
    let sum = 0;
    let n = 0;
    for (let i = 0; i < 12; i++) {
      const probe = makeShot(s, att, def, 10 + Math.floor(Math.random() * 70));
      if (probe) { sum += probe.xg; n++; }
    }
    const meanQ = n ? sum / n : 0.11;
    const vol = tacShotVol(att.tactics, att.mentality);
    const raw = (att.budgetXG / Math.max(0.03, meanQ)) * vol * (0.88 + Math.random() * 0.24);
    const soft = raw <= 19 ? raw : 19 + (raw - 19) * 0.45;
    att.targetShots = Math.max(1, Math.min(30, Math.round(soft)));
    // Hold the sheet to its budget so sampling noise can never quietly inflate
    // or starve a team's output.
    att.shotScale = Math.max(0.65, Math.min(1.5, att.budgetXG / Math.max(0.05, att.targetShots * meanQ)));
  }
}

/**
 * Simulate a match (or its remainder) with the tick engine. Pre-computes the
 * whole timeline; the match screen replays it. Pure — never mutates state.
 */
export function simulateTickMatch(state: GameState, homeId: number, awayId: number, opts: TickSimOptions = {}): MatchTimeline {
  const s: Sim = {
    state,
    home: makeSide(state, 'home', homeId, awayId, opts),
    away: makeSide(state, 'away', awayId, homeId, opts),
    minute: opts.startMinute ?? 1,
    possession: Math.random() < 0.5 ? 'home' : 'away',
    ballZone: 2,
    momentum: Math.max(-1, Math.min(1, opts.initialMomentum ?? 0)),
    events: [],
    snapshots: [],
    headless: !!opts.headless,
    ballX: 0.5,
    baseScore: { home: 0, away: 0 },
    // Stoppage time, same as a broadcast added-time clock.
    halfEnd: 45 + 1 + Math.floor(Math.random() * 5),
    matchEnd: 90,
  };
  s.matchEnd = s.halfEnd + 45 + 2 + Math.floor(Math.random() * 6);

  const startMinute = opts.startMinute ?? 1;
  if (opts.initial) {
    const c = opts.initial;
    applyResume(s.home, c.home, c.stats.home, c.possessionTicks.home);
    applyResume(s.away, c.away, c.stats.away, c.possessionTicks.away);
    s.momentum = c.momentum;
    s.ballZone = c.ballZone;
    s.possession = c.possession;
    s.baseScore = { ...c.score };
  }
  refreshStrength(s, s.home);
  refreshStrength(s, s.away);
  initShotModel(s);
  const scoreOf = (side: TeamSide) => score(s, side);

  if (startMinute === 1 && !s.headless) push(s, { minute: 1, type: 'info', clubId: 0, kind: 'kickoff', text: 'Kick-off!' });

  for (let minute = startMinute; minute <= s.matchEnd; minute++) {
    s.minute = minute;

    // AI chases the game late on.
    for (const side of [s.home, s.away]) {
      if (!side.isUser && minute === 70) {
        const other = side.side === 'home' ? 'away' : 'home';
        if (scoreOf(side.side) < scoreOf(other) && side.mentality !== 'ultra-attacking') {
          side.mentality = 'attacking';
          if (!s.headless) push(s, { minute, type: 'info', clubId: side.clubId, side: side.side, kind: 'mentality', text: `${side.name} throw more men forward.` });
        }
      }
    }

    for (let t = 0; t < TICKS_PER_MINUTE; t++) tick(s);
    checkInjury(s, s.home);
    checkInjury(s, s.away);
    s.momentum *= 0.96;

    if (!s.headless) {
      if (Math.random() < 0.05) commentary(s, s.possession === 'home' ? s.home : s.away, says.buildupText(s.possession === 'home' ? s.home.name : s.away.name));
      if (minute % 7 === 0) {
        const snap = s.snapshots[s.snapshots.length - 1];
        const stats = snap ? snap.stats : { home: s.home.stats, away: s.away.stats };
        const userIsHome = s.home.isUser ? true : s.away.isUser ? false : null;
        const line = says.assistantLine(minute, stats, { home: scoreOf('home'), away: scoreOf('away') }, s.home.name, s.away.name, userIsHome);
        if (line) push(s, { minute, type: 'info', clubId: 0, assistant: true, text: line });
      }
      if (minute === 45) push(s, { minute, type: 'info', clubId: 0, text: `${s.halfEnd - 45} added at the end of the first half.` });
      if (minute === s.halfEnd) push(s, { minute, type: 'info', clubId: 0, kind: 'halftime', text: 'Half time.' });
      if (minute === 90 && s.matchEnd > 90) push(s, { minute, type: 'info', clubId: 0, text: `${s.matchEnd - 90} minutes of stoppage time to play.` });
      s.snapshots.push(snapshot(s));
    }
  }
  if (!s.headless) push(s, { minute: s.matchEnd, type: 'info', clubId: 0, kind: 'fulltime', text: 'Full time.' });

  // Final tallies (headless never ran snapshot()).
  const total = s.home.possessionTicks + s.away.possessionTicks || 1;
  s.home.stats.possession = Math.round((100 * s.home.possessionTicks) / total);
  s.away.stats.possession = 100 - s.home.stats.possession;

  const finalScore = { home: scoreOf('home'), away: scoreOf('away') };
  const ratings = ratingsFromCounts(
    { ...s.home.counts, ...s.away.counts },
    { home: [...s.home.appeared], away: [...s.away.appeared] },
    finalScore
  );

  return {
    homeId,
    awayId,
    snapshots: s.snapshots,
    events: s.events,
    report: {
      homeId,
      awayId,
      homeGoals: finalScore.home,
      awayGoals: finalScore.away,
      homeXG: Math.round(s.home.stats.xg * 100) / 100,
      awayXG: Math.round(s.away.stats.xg * 100) / 100,
      events: s.events.map(({ minute, type, clubId, text, playerId, assistId, gx, gy, xg, archetype, contact, injuryType, injuryDays, potDrop }) =>
        ({ minute, type, clubId, text, playerId, assistId, gx, gy, xg, archetype, contact, injuryType, injuryDays, potDrop })),
      homeLineup: [...s.home.appeared],
      awayLineup: [...s.away.appeared],
      ratings,
    },
    ratings,
  };
}
