import type { FormationDef, GameState, Player, Tactics } from '../types';
import { HOME_ADVANTAGE, MAX_SUBS, MORALE_START, getFormation } from '../gameRules';
import { aiMatchSetup, availableSquad, lineupStrength, squadAvgRating } from '../teamManagement';
import { scorerTraitMult } from '../traits';
import { weightedIndex } from '../utils';
import { CHANCE_QUALITY, MENTALITIES, type MentalityId, compactFormation, normalizeMentality } from './tacticsData';
import { bump, ratingsFromCounts } from './ratings';
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
}

const freshStats = (): SideStats => ({ possession: 50, shots: 0, onTarget: 0, xg: 0, corners: 0, fouls: 0 });

function onPitch(s: Sim, side: SideState): Player[] {
  return side.lineup
    .filter((id): id is number => id !== null)
    .map((id) => s.state.players[id])
    .filter(Boolean);
}

function refreshStrength(s: Sim, side: SideState): void {
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

function pickShooter(s: Sim, side: SideState): Player | null {
  return pickWeighted(onPitch(s, side), (p) => {
    const posW = p.pos === 'FWD' ? 5 : p.pos === 'MID' ? 2.2 : p.pos === 'DEF' ? 0.4 : 0.03;
    return posW * Math.max(p.sho, 20) * scorerTraitMult(p);
  });
}

function pickAssister(s: Sim, side: SideState, notId: number): Player | null {
  const pool = onPitch(s, side).filter((p) => p.id !== notId && p.pos !== 'GK');
  return pickWeighted(pool, (p) => (p.pos === 'MID' ? 3 : p.pos === 'FWD' ? 2 : 0.7) * Math.max(p.pas, 20));
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

function checkInjury(s: Sim, side: SideState): void {
  const players = onPitch(s, side).filter((p) => p.pos !== 'GK');
  if (!players.length) return;
  const avgFat = players.reduce((a, p) => a + (side.fatigue[p.id] ?? 0), 0) / players.length;
  if (Math.random() >= 0.0035 * (1 + avgFat / 120)) return;
  const victim = pickWeighted(players, (p) => 1 + (side.fatigue[p.id] ?? 0) / 25);
  if (!victim) return;
  push(s, { minute: s.minute, type: 'injury', clubId: side.clubId, side: side.side, playerId: victim.id, text: says.injuryText(victim.name) });
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

function resolveShot(s: Sim, att: SideState, def: SideState): void {
  const ment = MENTALITIES[att.mentality];
  const tier = CHANCE_QUALITY[weightedIndex(CHANCE_QUALITY.map((t) => t.weight * (t.min >= 0.25 ? ment.chanceCreation : 1)))];
  const quality = Math.pow(effAttack(s, att) / effDefense(def), 0.6);
  const xg = Math.min(0.85, (tier.min + Math.random() * (tier.max - tier.min)) * Math.min(1.2, Math.max(0.7, quality)));
  const shooter = pickShooter(s, att);
  if (!shooter) return;
  att.stats.shots++;
  att.stats.xg += xg;

  if (Math.random() < 0.16) {
    commentary(s, att, says.blockText(shooter.name));
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

  const scored = Math.random() < xg;
  const onTarget = scored || Math.random() < 0.48;
  if (scored) {
    att.stats.onTarget++;
    bump(att.counts, shooter.id, 'goal');
    const assister = Math.random() < 0.72 ? pickAssister(s, att, shooter.id) : null;
    if (assister) bump(att.counts, assister.id, 'assist');
    const hg = score(s, 'home') + (att.side === 'home' ? 1 : 0);
    const ag = score(s, 'away') + (att.side === 'away' ? 1 : 0);
    push(s, {
      minute: s.minute,
      type: 'goal',
      clubId: att.clubId,
      side: att.side,
      playerId: shooter.id,
      text: says.goalText(shooter.name, att.name, hg, ag, s.home.name, s.away.name),
    });
    nudgeMomentum(s, att, 0.5);
    s.possession = def.side;
    s.ballZone = 2;
    return;
  }
  if (onTarget) {
    att.stats.onTarget++;
    bump(att.counts, shooter.id, 'shotOnTarget');
    const gk = keeper(s, def);
    if (gk) bump(def.counts, gk.id, 'save');
    commentary(s, att, says.saveText(shooter.name));
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
  commentary(s, att, xg >= 0.25 ? says.bigMissText(shooter.name) : says.missText(shooter.name));
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
    const pShot = Math.min(0.45, Math.max(0.08, 0.22 * (0.55 + 0.45 * ment.chanceCreation) * Math.pow(ratio, 0.5) * momEdge));
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
  };

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
  const scoreOf = (side: TeamSide) => score(s, side);

  if (startMinute === 1 && !s.headless) push(s, { minute: 1, type: 'info', clubId: 0, kind: 'kickoff', text: 'Kick-off!' });

  for (let minute = startMinute; minute <= 90; minute++) {
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
      if (minute === 45) push(s, { minute, type: 'info', clubId: 0, kind: 'halftime', text: 'Half time.' });
      s.snapshots.push(snapshot(s));
    }
  }
  if (!s.headless) push(s, { minute: 90, type: 'info', clubId: 0, kind: 'fulltime', text: 'Full time.' });

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
      events: s.events.map(({ minute, type, clubId, text, playerId }) => ({ minute, type, clubId, text, playerId })),
      homeLineup: [...s.home.appeared],
      awayLineup: [...s.away.appeared],
      ratings,
    },
    ratings,
  };
}
