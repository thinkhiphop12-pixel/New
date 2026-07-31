/**
 * Assigns each AI club a play-style identity and a reputation band.
 *
 * The reference hand-authors these per club (Barcelona plays tiki-taka,
 * Atletico catenaccio). We derive them instead, from squad profile and league
 * level, so all 240 clubs get a coherent identity without a hand-maintained
 * table — a passing-heavy elite squad gravitates to possession, a quick
 * physical lower-league side to direct or longball.
 *
 * This matters because familiarity drilling needs something to drill: without
 * an identity every AI club would sit on `balanced` forever and the style
 * system would only ever apply to the user.
 */
import type { Club, GameState, PlayStyle, Player } from './types';
import { getLeague } from './gameRules';
import { tacFamInit } from './familiarity';

/** 1–5 club standing, from league level and squad strength. Drives AI drilling
 *  speed and, later, transfer prestige. */
export function clubReputation(level: number, avgRating: number): number {
  const byLevel = [5, 4, 3, 2, 1][Math.min(4, Math.max(0, level - 1))];
  const bySquad = avgRating >= 78 ? 5 : avgRating >= 72 ? 4 : avgRating >= 66 ? 3 : avgRating >= 60 ? 2 : 1;
  return Math.round((byLevel + bySquad) / 2);
}

/**
 * Pick the identity this squad is actually built for. Compares the squad's
 * strongest attribute profile against what each style leans on, rather than
 * assigning at random — so the choice stays plausible when squads change.
 */
export function deriveClubStyle(squad: Player[], level: number): PlayStyle {
  if (!squad.length) return 'balanced';
  const avg = (k: keyof Player) => squad.reduce((s, p) => s + (p[k] as number), 0) / squad.length;
  const pas = avg('pas');
  const pac = avg('pac');
  const phy = avg('phy');
  const def = avg('def');
  const dri = avg('dri');

  // Elite technical sides play the ball; everyone else leans on what they have.
  if (pas >= 76 && dri >= 74) return 'tiki-taka';
  if (pas >= 73) return 'possession';
  if (pac >= 75 && phy >= 72) return 'gegenpressing';
  if (def >= 74 && level <= 2) return 'catenaccio';
  if (pac >= 73) return 'counter';
  if (phy >= 73) return level >= 3 ? 'longball' : 'direct';
  if (pac >= 69) return 'direct';
  return 'balanced';
}

const FORMATIONS_BY_STYLE: Partial<Record<PlayStyle, string>> = {
  'tiki-taka': '4-3-3',
  possession: '4-3-3',
  gegenpressing: '4-2-3-1',
  counter: '4-4-2',
  direct: '4-4-2',
  longball: '4-4-2',
  catenaccio: '5-3-2',
  balanced: '4-4-2',
};

/**
 * Stamp identity, formation and reputation onto every club that lacks them.
 * Idempotent — safe to run on a fresh game and again on migration.
 */
export function seedClubIdentities(state: GameState): void {
  for (const club of state.clubs) {
    if (club.playStyle && club.reputation != null) continue;
    const squad = club.playerIds
      .map((id) => state.players[id])
      .filter((p): p is Player => Boolean(p));
    const level = getLeague(club.leagueId)?.level ?? 3;
    const avgRating = squad.length
      ? squad.reduce((s, p) => s + p.rating, 0) / squad.length
      : 60;
    club.playStyle = club.playStyle ?? deriveClubStyle(squad, level);
    club.formationId = club.formationId ?? FORMATIONS_BY_STYLE[club.playStyle] ?? '4-4-2';
    club.reputation = club.reputation ?? clubReputation(level, avgRating);
    // Seed familiarity now rather than waiting for the first weekly tick —
    // otherwise a brand-new career shows its own identity as 0% drilled.
    tacFamInit(club, club.playStyle, club.formationId ?? null);
  }
}
