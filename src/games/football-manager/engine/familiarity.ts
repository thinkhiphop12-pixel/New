/**
 * Tactical familiarity — how well a squad has actually been drilled in the
 * style and shape it is being asked to play.
 *
 * Ported from the reference implementation's `tacFam` model. The point of it is
 * that picking a style is not free: a side switched to tiki-taka on Monday
 * plays it badly for weeks, and a side that has drilled counter-attacking for a
 * season executes it properly. Without this, style selection is a menu of free
 * bonuses.
 *
 * Two things gate a style's effectiveness, and both must hold:
 *   - `styleExec`  — can these players physically do it? (stats vs requirement)
 *   - `famFactor`  — have they been drilled in it? (0-100 familiarity)
 */
import type { Club, GameState, PlayStyle, Player, TacFam } from './types';

export type { PlayStyle, TacFam };

export const DRILLED_STYLES: PlayStyle[] = [
  'direct', 'possession', 'tiki-taka', 'counter', 'gegenpressing', 'longball', 'catenaccio',
];

export const FAM_MAX = 100;
const FAM_STYLE_GAIN = 7.0;
const FAM_FORM_GAIN = 9.0;

/**
 * Each style as a point in (ball retention, defensive line height) space.
 * Distance between two styles is what lets familiarity carry across a switch —
 * a possession side moving to tiki-taka keeps most of its work; moving to
 * catenaccio keeps almost none.
 */
const STYLE_SHAPE: Record<PlayStyle, { ball: number; line: number }> = {
  'tiki-taka':   { ball: 1.00, line: 0.80 },
  possession:    { ball: 0.88, line: 0.66 },
  gegenpressing: { ball: 0.60, line: 1.00 },
  balanced:      { ball: 0.50, line: 0.50 },
  direct:        { ball: 0.36, line: 0.56 },
  longball:      { ball: 0.20, line: 0.42 },
  counter:       { ball: 0.26, line: 0.24 },
  catenaccio:    { ball: 0.18, line: 0.12 },
  parkbus:       { ball: 0.04, line: 0.00 },
};

/** Attributes a style leans on, and the opposing attributes that blunt it. */
const STYLE_REQ: Partial<Record<PlayStyle, { stats: StatKey[]; counter: StatKey[] }>> = {
  direct:        { stats: ['pac', 'phy'],        counter: ['def', 'pac'] },
  possession:    { stats: ['pas'],               counter: ['phy', 'pac', 'def'] },
  'tiki-taka':   { stats: ['pas', 'dri'],        counter: ['phy', 'pac', 'def'] },
  counter:       { stats: ['pac'],               counter: ['pac', 'def'] },
  gegenpressing: { stats: ['phy', 'pac'],        counter: ['pas', 'dri'] },
  longball:      { stats: ['phy'],               counter: ['phy', 'def'] },
  catenaccio:    { stats: ['def'],               counter: ['sho', 'dri'] },
};

type StatKey = 'pac' | 'sho' | 'pas' | 'dri' | 'def' | 'phy';

/**
 * Lower leagues are judged against a lower bar. Without this every side outside
 * the top flight would be permanently incapable of any style, since the
 * requirement is an absolute attribute average.
 *
 * RECALIBRATED for our dataset, which does not share the reference's rating
 * scale. Measured first-XI attribute means in gamedata.json are L1 69.7,
 * L2 63.5, L3 59.4, L4 57.4, L5 ~57. The reference's offsets (-10/-16/-21/-26)
 * put the bar so far below those means that every side scored a perfect fit in
 * every style and the ability gate never discriminated at all. These sit the
 * bar ~1.5 above each level's mean, so a typical side lands near 0.70 and has
 * to be genuinely well-suited to a style to clear it.
 */
const LEVEL_REQ_OFFSET: Record<number, number> = { 1: 0, 2: -6, 3: -10, 4: -12, 5: -13 };

export function needsDrilling(style: PlayStyle): boolean {
  return DRILLED_STYLES.includes(style);
}

/** 1 = identical, 0 = unrelated. Drives how much work carries across a switch. */
export function styleKinship(a: PlayStyle, b: PlayStyle): number {
  const A = STYLE_SHAPE[a];
  const B = STYLE_SHAPE[b];
  if (!A || !B) return 0;
  if (a === b) return 1;
  return Math.max(0, 1 - Math.hypot(A.ball - B.ball, A.line - B.line) / 0.85);
}

/**
 * Seed a club's familiarity the first time it is needed. A club is assumed to
 * already be drilled in whatever it currently plays — otherwise every side in
 * the game would start the first season unable to execute its own identity.
 */
export function tacFamInit(club: Club, style: PlayStyle, formationId: string | null): TacFam {
  if (!club.tacFam) {
    const styles: Partial<Record<PlayStyle, number>> = {};
    if (needsDrilling(style)) styles[style] = 85;
    for (const other of DRILLED_STYLES) {
      if (other === style) continue;
      const carried = Math.round((styles[style] ?? 60) * styleKinship(style, other) * 0.55);
      if (carried > 4) styles[other] = carried;
    }
    club.tacFam = {
      styles,
      formations: formationId ? { [formationId]: 88 } : {},
      lastStyle: style,
      lastFormation: formationId,
    };
  }
  const tf = club.tacFam;
  tf.styles = tf.styles ?? {};
  tf.formations = tf.formations ?? {};
  return tf;
}

export function styleFamiliarity(club: Club, style: PlayStyle): number {
  if (!needsDrilling(style)) return FAM_MAX;
  return club.tacFam?.styles?.[style] ?? 0;
}

export function formationFamiliarity(club: Club, formationId: string): number {
  return club.tacFam?.formations?.[formationId] ?? 0;
}

/**
 * Familiarity this club would start on if it switched to `newStyle` right now:
 * the best of what it already has and what carries across from a related style.
 *
 * Kept separate from the mutating seed below so callers that only want to
 * *ask* the question — the tactics screen quoting a switch cost — get the same
 * answer the switch itself would produce. Without this every switch looks
 * equally expensive from a standing start, which is exactly wrong: the point of
 * the kinship model is that possession -> tiki-taka is cheap and possession ->
 * catenaccio is not.
 */
export function projectedFamiliarity(club: Club, newStyle: PlayStyle): number {
  if (!needsDrilling(newStyle)) return FAM_MAX;
  const tf = club.tacFam;
  if (!tf) return 0;
  let carried = tf.styles[newStyle] ?? 0;
  for (const old of Object.keys(tf.styles) as PlayStyle[]) {
    if (old === newStyle) continue;
    carried = Math.max(carried, (tf.styles[old] ?? 0) * styleKinship(old, newStyle) * 0.85);
  }
  // Undrilled styles are never stored, so read the last-played tag directly.
  const prev = tf.lastStyle;
  if (prev && !needsDrilling(prev)) carried = Math.max(carried, 45 * styleKinship(prev, newStyle));
  return Math.round(carried * 10) / 10;
}

/**
 * On a style switch, carry across the closest related work already done, so a
 * possession side moving to tiki-taka is not starting from zero.
 */
export function seedFamiliarityForSwitch(club: Club, newStyle: PlayStyle): void {
  const tf = club.tacFam;
  if (!tf || !needsDrilling(newStyle)) return;
  tf.styles[newStyle] = projectedFamiliarity(club, newStyle);
}

/** Familiarity converts to a multiplier on a curve, not linearly — the first
 *  weeks of drilling buy the most. Floors at 0.30 so an undrilled side is poor,
 *  not useless. */
export function famFactor(fam: number): number {
  return 0.30 + 0.70 * (Math.max(0, Math.min(FAM_MAX, fam)) / FAM_MAX) ** 0.75;
}

/** Coaching staff speed up drilling. */
export function coachDrillMult(state: GameState): number {
  return 1 + [0, 0.10, 0.20, 0.34][state.staff?.coach ?? 0];
}

/** Weeks of drilling still needed to reach `target` familiarity — shown on the
 *  tactics screen so a switch has a visible cost before it is committed to. */
export function weeksToDrill(club: Club, style: PlayStyle, target = 80, coachMult = 1): number {
  if (!needsDrilling(style)) return 0;
  // Start from where the switch would actually leave us, not from the current
  // (usually zero) familiarity in a style we are not yet playing.
  let fam = Math.max(styleFamiliarity(club, style), projectedFamiliarity(club, style));
  if (fam >= target) return 0;
  for (let w = 1; w <= 60; w++) {
    fam += FAM_STYLE_GAIN * coachMult * (1 - fam / (FAM_MAX + 12));
    if (fam >= target) return w;
  }
  return 60;
}

function avgStat(players: Player[], stat: StatKey): number {
  if (!players.length) return 60;
  return players.reduce((s, p) => s + p[stat], 0) / players.length;
}

/**
 * How well this XI can actually execute this style, 0-1.
 *
 * Compared against the opponent's counter-attributes when one is supplied, so
 * the same side executes possession well against a passive team and badly
 * against an aggressive one. `rawSkill` returns the ability component alone,
 * before familiarity is applied — used for previews on the tactics screen.
 */
export function styleExec(
  club: Club,
  xi: Player[],
  style: PlayStyle,
  level: number,
  opp?: { xi: Player[] },
  opts?: { rawSkill?: boolean },
): number {
  const req = STYLE_REQ[style];
  if (!req) return 1.0;
  const own = req.stats.reduce((s, st) => s + avgStat(xi, st), 0) / req.stats.length;
  const ref = opp
    ? req.counter.reduce((s, st) => s + avgStat(opp.xi, st), 0) / req.counter.length
    : 71 + (LEVEL_REQ_OFFSET[level] ?? -26);
  const skill = Math.max(0, Math.min(1, 0.75 + (own - ref) / 25));
  if (opts?.rawSkill) return skill;
  return Math.max(0, Math.min(1, skill * famFactor(styleFamiliarity(club, style))));
}

/**
 * Weekly drilling tick for every club. Growth has diminishing returns, so the
 * last few points of familiarity take far longer than the first.
 */
export function tickTacticalFamiliarity(state: GameState, weeks = 1): void {
  const userCoach = coachDrillMult(state);
  for (const club of state.clubs) {
    const style = (club.id === state.userClubId ? state.playStyle : club.playStyle) ?? 'balanced';
    const formationId = (club.id === state.userClubId ? state.formationId : club.formationId) ?? '4-3-3';
    const tf = tacFamInit(club, style, formationId);
    if (tf.lastStyle && tf.lastStyle !== style) seedFamiliarityForSwitch(club, style);

    // AI clubs get a coaching equivalent scaled by how well-run the club is,
    // so a big side drills faster than a small one without needing a staff list.
    const coach = club.id === state.userClubId
      ? userCoach
      : 1 + Math.max(0, Math.min(0.30, ((club.reputation ?? 3) - 2) * 0.09));

    const grow = (cur: number, rate: number) =>
      Math.min(FAM_MAX, cur + rate * coach * (1 - cur / (FAM_MAX + 12)) * weeks);

    if (needsDrilling(style)) {
      tf.styles[style] = Math.round(grow(tf.styles[style] ?? 0, FAM_STYLE_GAIN) * 10) / 10;
    }
    tf.formations[formationId] = Math.round(grow(tf.formations[formationId] ?? 0, FAM_FORM_GAIN) * 10) / 10;

    // Styles and shapes not being worked on drift back down slowly.
    for (const other of Object.keys(tf.styles) as PlayStyle[]) {
      if (other === style) continue;
      tf.styles[other] = Math.max(0, Math.round(((tf.styles[other] ?? 0) - 0.5 * weeks) * 10) / 10);
    }
    for (const other of Object.keys(tf.formations)) {
      if (other === formationId) continue;
      tf.formations[other] = Math.max(0, Math.round((tf.formations[other] - 0.4 * weeks) * 10) / 10);
    }

    tf.lastStyle = style;
    tf.lastFormation = formationId;
  }
}
