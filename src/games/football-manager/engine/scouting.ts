import type { GameState, Scout, ScoutReport } from './types';
import { newScouting } from './facilities';

/**
 * Career mode scouting network: a permanent roster of named scouts (distinct
 * from the ad-hoc `ScoutAssignment` tasks in engine/facilities.ts, which stay
 * untouched), each combing one region for talent. Periodically — cadence and
 * quality set by star rating — a scout files a lead: an existing player from
 * that region gets added to the shortlist and a report lands in the inbox,
 * feeding straight into the existing TransfersScreen/transferMarket flow.
 * No parallel transfer pipeline: this only ever points at real player ids
 * already in `state.players`.
 */

export const SCOUT_REGIONS = ['England', 'France', 'Germany', 'Italy', 'Netherlands', 'Portugal', 'Scotland', 'Spain'] as const;

const SCOUT_NAMES = [
  'Terry Dunmore', 'Yusuf Kaya', 'Bianca Rossi', 'Owen Lachlan', 'Sven Pettersson',
  'Ana Beltran', 'Kwame Asante', 'Liesel Hartmann', 'Rico Alves', 'Duncan Fairweather',
];

export function getScouts(state: GameState): Scout[] {
  return state.scouting?.scouts ?? [];
}

export function getPlayerReports(state: GameState): ScoutReport[] {
  return state.scouting?.playerReports ?? [];
}

/** Weekly wage for a scout of a given star rating (1-5). Mirrors the coach
 *  wage curve in engine/facilities.ts, scaled down — scouts are cheaper than
 *  coaching staff. */
export function scoutWage(stars: number): number {
  return Math.round(300 + stars * 300);
}

export function hireScout(state: GameState, stars: number, region: string): GameState {
  const sc = state.scouting ?? newScouting();
  const nextScoutId = sc.nextScoutId ?? 1;
  const name = SCOUT_NAMES[nextScoutId % SCOUT_NAMES.length];
  const scout: Scout = { id: nextScoutId, name, stars, region, wage: scoutWage(stars) };
  return {
    ...state,
    scouting: { ...sc, scouts: [...(sc.scouts ?? []), scout], nextScoutId: nextScoutId + 1 },
  };
}

export function fireScout(state: GameState, scoutId: number): GameState {
  const sc = state.scouting;
  if (!sc) return state;
  return { ...state, scouting: { ...sc, scouts: (sc.scouts ?? []).filter((s) => s.id !== scoutId) } };
}

export function reassignScout(state: GameState, scoutId: number, region: string): GameState {
  const sc = state.scouting;
  if (!sc) return state;
  const scouts = (sc.scouts ?? []).map((s) => (s.id === scoutId ? { ...s, region } : s));
  return { ...state, scouting: { ...sc, scouts } };
}

/** Higher stars = more frequent leads. A 1-star scout files roughly every 6
 *  weeks, a 5-star scout roughly every 2. */
function fileChance(stars: number): number {
  return 0.08 + stars * 0.08;
}

/** Note detail scales with star rating — a 1-star scout gives a vague read,
 *  a 5-star scout gives real attribute detail. */
function reportNote(stars: number, name: string, region: string): string {
  if (stars >= 4) return `${name} rates this one highly on both current ability and long-term ceiling — worth a firm approach.`;
  if (stars >= 3) return `${name} thinks he's a real prospect out of ${region}, though wants another look before committing fully.`;
  return `${name} has flagged some early interest from ${region} — still just a name to keep an eye on.`;
}

/** Advance the scouting network by one week: each scout independently rolls
 *  a chance (by star rating) to file a lead from his assigned region — an
 *  existing free/rival player, added to the shortlist with an inbox report.
 *  Idempotent per call, same contract as tickFacilitiesWeek. */
export function tickScoutNetwork(state: GameState): GameState {
  const sc = state.scouting;
  if (!sc || !sc.scouts || sc.scouts.length === 0) return state;

  let shortlist = sc.shortlist;
  let playerReports = sc.playerReports ?? [];
  let nextPlayerReportId = sc.nextPlayerReportId ?? 1;
  const news: string[] = [];
  const inboxAdds: { title: string; body: string; playerId: number }[] = [];

  for (const scout of sc.scouts) {
    if (Math.random() > fileChance(scout.stars)) continue;
    const pool = Object.values(state.players).filter(
      (p) => p.clubId !== state.userClubId && p.clubId !== 0 && p.nat === scout.region && !shortlist.includes(p.id)
    );
    if (pool.length === 0) continue;
    // Higher stars find better players — sort by rating and pick from a
    // narrower, stronger band instead of the whole pool.
    pool.sort((a, b) => b.rating - a.rating);
    const band = Math.max(1, Math.round(pool.length * (0.6 - scout.stars * 0.1)));
    const pick = pool[Math.floor(Math.random() * band)];
    shortlist = [...shortlist, pick.id];
    const report: ScoutReport = {
      id: nextPlayerReportId++,
      playerId: pick.id,
      scoutName: scout.name,
      stars: scout.stars,
      region: scout.region,
      weekGenerated: state.week,
      yearGenerated: state.seasonYear,
      note: reportNote(scout.stars, scout.name, scout.region),
    };
    playerReports = [report, ...playerReports].slice(0, 40);
    news.unshift(`${scout.name} filed a scouting lead on ${pick.name} (${scout.region}).`);
    inboxAdds.push({
      title: `Scouting lead: ${pick.name}`,
      body: `${scout.name} (${scout.stars}★, ${scout.region}) has filed a report on ${pick.name}.\n\n${report.note}\n\nHe has been added to your shortlist — check Transfers to take it further.`,
      playerId: pick.id,
    });
  }

  if (inboxAdds.length === 0) return state;

  const next: GameState = {
    ...state,
    scouting: { ...sc, shortlist, playerReports, nextPlayerReportId },
    news: [...news, ...state.news],
    inbox: [...state.inbox],
  };
  for (const item of inboxAdds) {
    next.inbox.unshift({
      id: next.nextInboxId++,
      week: next.week,
      seasonYear: next.seasonYear,
      read: false,
      category: 'transfer',
      title: item.title,
      body: item.body,
      playerId: item.playerId,
    });
  }
  next.inbox = next.inbox.slice(0, 40);
  return next;
}
