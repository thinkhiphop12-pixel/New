import type { GameState, Player } from '@/engine/types';
import { makeBoardObjective, makeContinental, makeDomesticCup } from '@/engine/seasonProgression';
import { squadAvgRating } from '@/engine/teamManagement';
import { weeklyWage } from '@/engine/utils';

/**
 * Save games live in the browser. Three career slots; slot 0 keeps the legacy
 * key so pre-slot saves keep working. Each save is a plain JSON GameState.
 */
const SLOT_KEYS = ['fmlite.save.v1', 'fmlite.save.slot2', 'fmlite.save.slot3'];
export const SAVE_SLOTS = SLOT_KEYS.length;

export interface SaveMeta {
  slot: number;
  clubName: string;
  seasonYear: number;
  week: number;
  division: number;
  managerName: string;
}

type RawSave = Omit<GameState, 'version'> & { version: number };

/** Upgrade any older save in place to the current shape (idempotent). */
function migrate(raw: RawSave): GameState {
  const s = raw as unknown as GameState;
  const wasV1 = raw.version !== 2;
  for (const p of Object.values(s.players) as Player[]) {
    p.wage = p.wage ?? weeklyWage(p.value, p.rating);
    p.contractYears = p.contractYears ?? 2;
    p.apps = p.apps ?? 0;
    p.goals = p.goals ?? 0;
    p.career = p.career ?? [];
    p.seasonRatingSum = p.seasonRatingSum ?? 0;
    p.seasonRatingCount = p.seasonRatingCount ?? 0;
  }
  const t = s.tactics as GameState['tactics'];
  t.tempo = t.tempo ?? 'normal';
  t.width = t.width ?? 'standard';
  t.mentality = t.mentality ?? 'balanced';
  s.training = s.training ?? 'balanced';
  s.chemistry = s.chemistry ?? 50;
  s.fanConfidence = s.fanConfidence ?? 60;
  s.manager = s.manager ?? {
    name: 'The Gaffer', reputation: 45, wins: 0, draws: 0, losses: 0,
    seasons: s.history?.length ?? 0, trophies: [],
  };
  s.academyLevel = s.academyLevel ?? 1;
  s.staff = s.staff ?? { coach: 0, physio: 0, scout: 0 };
  s.stadiumLevel = s.stadiumLevel ?? 1;
  s.captainId = s.captainId ?? null;
  s.ledger = s.ledger ?? [];
  s.jobOffers = s.jobOffers ?? [];
  s.records = s.records ?? { biggestWin: null, bestFinish: null, topSeasonScorer: null };
  s.legacy = s.legacy ?? {};
  s.inbox = s.inbox ?? [];
  s.nextInboxId = s.nextInboxId ?? (s.inbox.reduce((m, i) => Math.max(m, i.id), 0) + 1);
  s.pressWeek = s.pressWeek ?? 0;
  s.nextPlayerId = s.nextPlayerId ?? Math.max(...Object.keys(s.players).map(Number)) + 1;
  s.board = s.board ?? makeBoardObjective(s);
  s.cup = s.cup ?? makeDomesticCup(s);
  if (!s.continental) {
    const d1 = s.clubs
      .filter((c) => c.division === 1)
      .sort((a, b) => squadAvgRating(s, b.id) - squadAvgRating(s, a.id))
      .map((c) => c.id);
    s.continental = makeContinental(d1);
  }
  if (wasV1) s.version = 2;
  return s;
}

export function saveGame(state: GameState, slot = 0): void {
  try {
    localStorage.setItem(SLOT_KEYS[slot], JSON.stringify(state));
  } catch {
    // Storage full or blocked — the session keeps working, it just won't persist.
  }
}

export function loadGame(slot = 0): GameState | null {
  try {
    const raw = localStorage.getItem(SLOT_KEYS[slot]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RawSave;
    if (!parsed.userClubId || (parsed.version !== 1 && parsed.version !== 2)) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function clearSave(slot = 0): void {
  try {
    localStorage.removeItem(SLOT_KEYS[slot]);
  } catch {
    // ignore
  }
}

/** Lightweight metadata for every slot (null = empty slot). */
export function listSaves(): (SaveMeta | null)[] {
  return SLOT_KEYS.map((_, slot) => {
    const s = loadGame(slot);
    if (!s) return null;
    const club = s.clubs.find((c) => c.id === s.userClubId);
    return {
      slot,
      clubName: club?.name ?? '—',
      seasonYear: s.seasonYear,
      week: s.week,
      division: club?.division ?? 1,
      managerName: s.manager.name,
    };
  });
}

export function hasSave(slot = 0): boolean {
  return loadGame(slot) !== null;
}
