import type { GameState, Player, Position, Tactics, FormationDef } from './types';
import { FORMATIONS, getFormation, getLeague } from './gameRules';
import { styleExec, styleFamiliarity } from './familiarity';
import { traitsFor } from './traits';
import { isSuspended } from './discipline';
import { buildXI, calcMatchXG } from './tickEngine/xgModel';
import { normalizeMentality } from './tickEngine/tacticsData';
import { clamp } from './utils';
import { getRole } from '@/lib/playerRoles';

/** Assign (or clear with null) a player's tactical role. */
export function setPlayerRole(state: GameState, playerId: number, roleId: string | null): GameState {
  const s: GameState = structuredClone(state);
  const p = s.players[playerId];
  if (!p) return state;
  if (roleId) p.tacticalRole = roleId;
  else delete p.tacticalRole;
  return s;
}

/** Small strength bonus for a player deployed in their assigned specialist role. */
function roleFitBonus(p: Player, slotPos: Position): number {
  if (!p.tacticalRole) return 1;
  const role = getRole(p.tacticalRole);
  if (!role || role.position !== slotPos) return 1;
  return 1.05;
}

export function getSquad(state: GameState, clubId: number): Player[] {
  const club = state.clubs.find((c) => c.id === clubId);
  if (!club) return [];
  return club.playerIds.map((id) => state.players[id]).filter(Boolean);
}

/** Weekly wage bill for a club. Loanees are off the books — their parent club
 *  pays them. Lives here rather than in `seasonProgression` so that
 *  `transferMarket` can reach it without a circular import; that module's
 *  `weeklyWageBill` is the user-club shorthand for this. */
export function clubWageBill(state: GameState, clubId: number): number {
  return getSquad(state, clubId)
    .filter((p) => !isOnLoan(p))
    .reduce((sum, p) => sum + p.wage, 0);
}

/**
 * The board's sanctioned weekly wage ceiling.
 *
 * Seeded at `newGame` as headroom over what the inherited squad already
 * earns, so it self-calibrates to the league and squad instead of needing a
 * hand-tuned figure per division — and so a freshly-started save can never
 * already be over its own cap. Pre-v7 saves store nothing and fall back to
 * the same formula applied to their current bill.
 */
export const WAGE_BUDGET_HEADROOM = 1.25;

export function wageCeiling(state: GameState): number {
  return state.wageBudget ?? Math.round(clubWageBill(state, state.userClubId) * WAGE_BUDGET_HEADROOM);
}

/** Position order shirt numbers are handed out in, and the conventional
 *  numbers reserved for the best player in a position. */
const NUMBER_POS_ORDER: Position[] = ['GK', 'DEF', 'MID', 'FWD'];
const PREFERRED_NUMBER: Partial<Record<Position, number>> = { GK: 1, FWD: 9, MID: 10 };
const MAX_SHIRT = 99;

/**
 * Give every player at every club a shirt number that is unique within that
 * club.
 *
 * Idempotent and additive: a number that is already valid and unclaimed is
 * kept, so nobody loses their shirt because a team-mate signed. Only genuine
 * gaps and collisions are filled — which is why this can be called from the
 * weekly tick and after each signing rather than threaded through all ~10
 * places a player's `clubId` changes (transfers, loans, releases, youth
 * intake, AI deals). Players without a club hold their old number until it
 * collides somewhere new.
 */
export function ensureSquadNumbers(state: GameState): void {
  for (const club of state.clubs) {
    const squad = club.playerIds.map((id) => state.players[id]).filter(Boolean);
    const taken = new Set<number>();

    // Keep the numbers that are still legal and unclaimed; drop the rest.
    for (const p of squad) {
      const n = p.squadNumber;
      if (n !== undefined && Number.isInteger(n) && n >= 1 && n <= MAX_SHIRT && !taken.has(n)) {
        taken.add(n);
      } else {
        p.squadNumber = undefined;
      }
    }

    // 1 to the best keeper, 9 to the best forward, 10 to the best midfielder —
    // but only where that number is actually free.
    for (const pos of NUMBER_POS_ORDER) {
      const want = PREFERRED_NUMBER[pos];
      if (want === undefined || taken.has(want)) continue;
      const best = squad
        .filter((p) => p.pos === pos && p.squadNumber === undefined)
        .sort((a, b) => b.rating - a.rating)[0];
      if (best) {
        best.squadNumber = want;
        taken.add(want);
      }
    }

    // Everyone else takes the lowest free number, back to front.
    const rest = squad
      .filter((p) => p.squadNumber === undefined)
      .sort(
        (a, b) =>
          NUMBER_POS_ORDER.indexOf(a.pos) - NUMBER_POS_ORDER.indexOf(b.pos) || b.rating - a.rating
      );
    let next = 2;
    for (const p of rest) {
      while (next <= MAX_SHIRT && taken.has(next)) next++;
      if (next > MAX_SHIRT) break; // squad deeper than the shirt range; leave unnumbered
      p.squadNumber = next;
      taken.add(next);
    }
  }
}

export function isOnLoan(p: Player): boolean {
  return p.onLoanUntil !== undefined && p.onLoanUntil > 0;
}

/** Players actually available to pick (fit and not away on loan). */
export function availableSquad(state: GameState, clubId: number): Player[] {
  return getSquad(state, clubId).filter((p) => p.injuryWeeks === 0 && !isOnLoan(p) && !isSuspended(p));
}

/** Effective matchday rating: base rating × form, zero if injured or on loan. */
export function effectiveRating(p: Player): number {
  if (p.injuryWeeks > 0 || isOnLoan(p)) return 0;
  return p.rating * p.form;
}

/** Pick the best available XI for a formation, strongest first per slot group. */
export function autoPickLineup(state: GameState, clubId: number, formation: FormationDef): (number | null)[] {
  const squad = availableSquad(state, clubId).sort((a, b) => effectiveRating(b) - effectiveRating(a));
  const used = new Set<number>();
  const lineup: (number | null)[] = formation.slots.map((slot) => {
    const pick = squad.find((p) => p.pos === slot.pos && !used.has(p.id));
    if (pick) {
      used.add(pick.id);
      return pick.id;
    }
    return null;
  });
  // Fill any empty slots with best remaining outfielders (out of position).
  return lineup.map((id, i) => {
    if (id !== null) return id;
    const slot = formation.slots[i];
    const fallback = squad.find((p) => !used.has(p.id) && (slot.pos === 'GK') === (p.pos === 'GK'));
    if (fallback) {
      used.add(fallback.id);
      return fallback.id;
    }
    return null;
  });
}

/** True if every slot is filled with a fit, present player from the club. */
export function isLineupValid(state: GameState, clubId: number, lineup: (number | null)[]): boolean {
  const clubPlayers = new Set(getSquad(state, clubId).map((p) => p.id));
  const seen = new Set<number>();
  for (const id of lineup) {
    if (id === null || !clubPlayers.has(id) || seen.has(id)) return false;
    if (state.players[id].injuryWeeks > 0 || isOnLoan(state.players[id])) return false;
    // A suspended man is as unpickable as an injured one — the lineup gate
    // has to agree with `availableSquad`, or the dock would call an XI valid
    // that the pre-match check then has to break up.
    if (isSuspended(state.players[id])) return false;
    seen.add(id);
  }
  return lineup.length === 11;
}

export interface TeamStrength {
  attack: number;
  midfield: number;
  defense: number;
  overall: number;
}

/**
 * Aggregate a lineup into attack/midfield/defense numbers (roughly 50–95).
 * Players slotted out of position play at 85% of their rating. Morale,
 * team chemistry, player traits and tactics all modulate the result.
 */
export function lineupStrength(
  state: GameState,
  lineup: (number | null)[],
  formation: FormationDef,
  tactics: Tactics,
  morale: number,
  chemistry = 50
): TeamStrength {
  const groups: Record<Position, number[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  let traitAtt = 0;
  let traitMid = 0;
  let traitDef = 0;
  formation.slots.forEach((slot, i) => {
    const id = lineup[i];
    if (id === null || id === undefined) {
      groups[slot.pos].push(30); // empty slot is a big hole
      return;
    }
    const p = state.players[id];
    const penalty = (p.pos === slot.pos ? 1 : 0.85) * roleFitBonus(p, slot.pos);
    groups[slot.pos].push(effectiveRating(p) * penalty || 30);
    for (const t of traitsFor(p)) {
      traitAtt += t.att;
      traitMid += t.mid;
      traitDef += t.def;
    }
  });

  // Captain's armband: a steadying presence, doubled for natural Leaders.
  const cap = state.captainId != null && lineup.includes(state.captainId) ? state.players[state.captainId] : null;
  if (cap) {
    const capBonus = traitsFor(cap).some((t) => t.name === 'Leader') ? 1 : 0.5;
    traitAtt += capBonus * 0.4;
    traitMid += capBonus * 0.4;
    traitDef += capBonus * 0.4;
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 30);
  const gk = avg(groups.GK);
  const def = avg(groups.DEF);
  const mid = avg(groups.MID);
  const fwd = avg(groups.FWD);

  const moraleMod = 1 + (morale - 60) / 400; // ±~9%
  const chemMod = 1 + (chemistry - 50) / 550; // ±~9%
  const styleAtt = tactics.style === 'attacking' ? 1.07 : tactics.style === 'defensive' ? 0.93 : 1;
  const styleDef = tactics.style === 'attacking' ? 0.93 : tactics.style === 'defensive' ? 1.07 : 1;
  const widthAtt = tactics.width === 'wide' ? 1.03 : tactics.width === 'narrow' ? 0.97 : 1;
  const widthDef = tactics.width === 'narrow' ? 1.04 : tactics.width === 'wide' ? 0.98 : 1;

  const attack = (0.7 * fwd + 0.3 * mid + traitAtt) * moraleMod * chemMod * styleAtt * widthAtt;
  const midfield = (mid + traitMid) * moraleMod * chemMod;
  const defense = (0.55 * def + 0.3 * gk + 0.15 * mid + traitDef) * moraleMod * chemMod * styleDef * widthDef;

  return {
    attack: clamp(attack, 20, 110),
    midfield: clamp(midfield, 20, 110),
    defense: clamp(defense, 20, 110),
    overall: clamp((attack + midfield + defense) / 3, 20, 110),
  };
}

/** Average rating of a club's squad — a proxy for its overall quality. */
export function squadAvgRating(state: GameState, clubId: number): number {
  const squad = getSquad(state, clubId);
  if (!squad.length) return 50;
  return squad.reduce((s, p) => s + p.rating, 0) / squad.length;
}

/**
 * Opponent-contextual AI tactics (gap 23). Reads the reputation/quality gap
 * to the specific opponent this match, plus whether the club has actually
 * drilled a counter-attacking setup, rather than a single "flip to attacking
 * at 70' if losing" rule with no opponent awareness at all.
 *
 * Blends squad-rating gap (dominant, always populated) with reputation gap
 * (1-5 stars, worth roughly 4 rating points a star) into one score. The
 * thresholds below are calibrated against a real measured spread, not
 * guessed: `reputation` is derived from a squad-rating banding
 * (`clubReputation` in engine/clubIdentity.ts) that saturates at 5 stars for
 * most of a top division — measured directly, 20 of 24 Premier League clubs
 * in a fresh career all carry `reputation: 5`, so reputation alone cannot
 * distinguish an in-league quality gap and the squad-rating term has to do
 * the real work. Measured top-to-bottom squad-rating spread in that same
 * division is 12.6 (Arsenal 82.6 vs Charlton Athletic 70.0); Liverpool vs
 * Burnley — a clear "big club vs relegation candidate" gap, not the most
 * extreme possible one — measures 7.3. Thresholds are set so that gap
 * qualifies as "elite/underdog", not just the most extreme top-to-bottom
 * case:
 *   - A big lead (>6): play like the better side — attacking, high press,
 *     high line, quick direct football. An elite club should never park
 *     the bus.
 *   - A big deficit (<-6): go deep and cautious rather than try to trade
 *     evenly with a side that outclasses this one.
 *   - Anywhere in between: a plain balanced approach, UNLESS this club has
 *     genuinely drilled a counter-attacking setup (`styleFamiliarity` >= 50)
 *     and is still a moderate underdog (gap < -2), in which case it leans
 *     into it — sitting in and hitting on the break only pays off for a
 *     side that has actually practiced it.
 */
export function contextualizeTactics(state: GameState, clubId: number, opponentId?: number): Tactics {
  const club = state.clubs.find((c) => c.id === clubId);
  const BALANCED: Tactics = {
    style: 'balanced', pressing: 'mid', tempo: 'normal', width: 'standard',
    defLine: 'normal', focus: 'mixed', buildUp: 'balanced', passingStyle: 'mixed', runs: 'balanced', tackling: 'normal',
  };
  if (!opponentId || !club) return BALANCED;

  const opp = state.clubs.find((c) => c.id === opponentId);
  const ratingGap = squadAvgRating(state, clubId) - squadAvgRating(state, opponentId);
  const repGap = (club.reputation ?? 3) - (opp?.reputation ?? 3);
  const gap = ratingGap + repGap * 4;

  if (gap > 6) {
    return {
      style: 'attacking', pressing: 'high', tempo: 'fast', width: 'wide',
      defLine: 'high', focus: 'mixed', buildUp: 'play-out', passingStyle: 'short', runs: 'in-behind', tackling: 'aggressive',
    };
  }
  if (gap < -6) {
    // Every one of defLine/tempo/width/tackling/pressing independently
    // suppresses this side's OWN attack in calcMatchXG's tactical chain
    // (LINE_ATK.deep=0.95, TEMPO_ATK.slow=0.96, WIDTH_ATK.narrow=0.97,
    // TACKLE_BOOST.cautious=-0.02, PRESS_PRESET.low.ownBoost=-0.10) on top of
    // the rating gap this side is already losing on — stacking four or five
    // of them multiplicatively on the weaker side pushed whole-league
    // goals/game below the 2.4-3.2 regression band across repeated runs
    // (measured as low as 2.28, and failing roughly 1 in 3 smoke-test runs
    // even after an earlier partial fix). Keeping only `defLine: 'deep'` +
    // `tackling: 'cautious'` — the two levers a real deep-block underdog
    // actually needs — reads as clearly cautious without compounding every
    // available suppressor into a side that barely creates anything at all.
    return {
      style: 'defensive', pressing: 'mid', tempo: 'normal', width: 'standard',
      defLine: 'deep', focus: 'flanks', buildUp: 'long', passingStyle: 'mixed', runs: 'balanced', tackling: 'cautious',
    };
  }
  const canCounter = styleFamiliarity(club, 'counter') >= 50;
  if (canCounter && gap < -2) {
    return { ...BALANCED, pressing: 'mid', defLine: 'deep', runs: 'in-behind', passingStyle: 'through-balls' };
  }
  return BALANCED;
}

/**
 * The AI's setup for a club. Each club has its own preferred formation
 * (falling back to a rotation of the classic five for clubs that predate
 * Phase 5's identity system), and its tactics adapt to this specific
 * opponent via `contextualizeTactics` above.
 */
export function aiMatchSetup(state: GameState, clubId: number, opponentId?: number): {
  lineup: (number | null)[];
  formation: FormationDef;
  tactics: Tactics;
} {
  const club = state.clubs.find((c) => c.id === clubId);
  const formation = getFormation(club?.formationId ?? FORMATIONS[clubId % FORMATIONS.length].id);
  return {
    formation,
    lineup: autoPickLineup(state, clubId, formation),
    tactics: contextualizeTactics(state, clubId, opponentId),
  };
}

/**
 * Live xG readout for the tactics screen (gap 32): "if this match kicked off
 * right now with this lineup/formation/tactics, what would each side's xG
 * budget be?" Reuses the match engine's own `calcMatchXG` chain — the exact
 * function `initShotModel` calls when a real match is simulated — rather
 * than a parallel estimate that could silently drift from what actually
 * happens on kickoff.
 *
 * Overrides let the tactics screen preview a change (a different formation,
 * a tweaked instruction) before it's saved to `GameState`.
 */
export function previewEffectiveXG(
  state: GameState,
  opponentId: number,
  overrides?: { tactics?: Tactics; formationId?: string; lineup?: (number | null)[] },
): { userXG: number; oppXG: number } {
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const oppClub = state.clubs.find((c) => c.id === opponentId);
  if (!userClub || !oppClub) return { userXG: 0, oppXG: 0 };

  const userFormationId = overrides?.formationId ?? state.dualFormation?.inPossessionId ?? state.formationId;
  const userFormation = getFormation(userFormationId);
  const userLineup = overrides?.lineup ?? state.lineup;
  const userTactics = overrides?.tactics ?? state.tactics;
  const userXi = buildXI(state, userLineup, userFormation);

  const oppSetup = aiMatchSetup(state, opponentId, state.userClubId);
  const oppXi = buildXI(state, oppSetup.lineup, oppSetup.formation);

  const userLevel = getLeague(userClub.leagueId)?.level ?? 3;
  const oppLevel = getLeague(oppClub.leagueId)?.level ?? 3;
  const userStyle = state.playStyle ?? 'balanced';
  const oppStyle = oppClub.playStyle ?? 'balanced';

  const userExec = styleExec(userClub, userXi.map((s) => s.p), userStyle, userLevel, { xi: oppXi.map((s) => s.p) });
  const oppExec = styleExec(oppClub, oppXi.map((s) => s.p), oppStyle, oppLevel, { xi: userXi.map((s) => s.p) });

  const userMentality = normalizeMentality(userTactics.mentality);
  const oppMentality = oppSetup.tactics.style === 'attacking' ? 'attacking'
    : oppSetup.tactics.style === 'defensive' ? 'defensive' : 'balanced';

  const xg = calcMatchXG(
    { xi: userXi, tactics: userTactics, mentality: userMentality, qualityMult: 1, styleExec: userExec },
    { xi: oppXi, tactics: oppSetup.tactics, mentality: oppMentality, qualityMult: 1, styleExec: oppExec },
  );
  return { userXG: Math.round(xg.homeXG * 100) / 100, oppXG: Math.round(xg.awayXG * 100) / 100 };
}

/**
 * Estimated xG for any fixture between two clubs (either may be the user's),
 * reusing the same real `calcMatchXG` chain as `previewEffectiveXG` above.
 * Built for the odds model (gap 75), which needs a scoreline estimate for
 * arbitrary AI-vs-AI fixtures, not just the user's next match.
 */
export function estimateMatchXG(state: GameState, homeId: number, awayId: number): { homeXG: number; awayXG: number } {
  const homeClub = state.clubs.find((c) => c.id === homeId);
  const awayClub = state.clubs.find((c) => c.id === awayId);
  if (!homeClub || !awayClub) return { homeXG: 1, awayXG: 1 };

  const setupFor = (clubId: number, oppId: number) =>
    clubId === state.userClubId
      ? {
          formation: getFormation(state.dualFormation?.inPossessionId ?? state.formationId),
          lineup: state.lineup,
          tactics: state.tactics,
        }
      : aiMatchSetup(state, clubId, oppId);

  const homeSetup = setupFor(homeId, awayId);
  const awaySetup = setupFor(awayId, homeId);
  const homeXi = buildXI(state, homeSetup.lineup, homeSetup.formation);
  const awayXi = buildXI(state, awaySetup.lineup, awaySetup.formation);

  const mentalityOf = (clubId: number, tactics: Tactics) =>
    clubId === state.userClubId
      ? normalizeMentality(tactics.mentality)
      : tactics.style === 'attacking' ? 'attacking' : tactics.style === 'defensive' ? 'defensive' : 'balanced';

  const homeLevel = getLeague(homeClub.leagueId)?.level ?? 3;
  const awayLevel = getLeague(awayClub.leagueId)?.level ?? 3;
  const homeStyle = homeId === state.userClubId ? (state.playStyle ?? 'balanced') : (homeClub.playStyle ?? 'balanced');
  const awayStyle = awayId === state.userClubId ? (state.playStyle ?? 'balanced') : (awayClub.playStyle ?? 'balanced');
  const homeExec = styleExec(homeClub, homeXi.map((s) => s.p), homeStyle, homeLevel, { xi: awayXi.map((s) => s.p) });
  const awayExec = styleExec(awayClub, awayXi.map((s) => s.p), awayStyle, awayLevel, { xi: homeXi.map((s) => s.p) });

  const xg = calcMatchXG(
    { xi: homeXi, tactics: homeSetup.tactics, mentality: mentalityOf(homeId, homeSetup.tactics), qualityMult: 1, styleExec: homeExec },
    { xi: awayXi, tactics: awaySetup.tactics, mentality: mentalityOf(awayId, awaySetup.tactics), qualityMult: 1, styleExec: awayExec },
  );
  return { homeXG: xg.homeXG, awayXG: xg.awayXG };
}
