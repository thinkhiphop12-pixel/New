import type { Club, Fixture, GameState, Player } from '@/engine/types';
import {
  continentalEntrants, makeBoardObjective, makeContinental, makeDomesticCup, refillPhantomPools,
} from '@/engine/seasonProgression';
import { LEAGUES, getLeague, leagueIdForDivision } from '@/engine/gameRules';
import { contractEndFor, rollRetireAge, weeklyWage } from '@/engine/utils';

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
  leagueId: string;
  leagueName: string;
  managerName: string;
}

/** Pre-v4 shapes, kept only so migrate() can read them. */
type LegacyClub = Club & { division?: number };
type LegacyFixtures = Record<string, Fixture[]>;

type RawSave = Omit<GameState, 'version'> & { version: number };

/** Upgrade any older save in place to the current shape (idempotent). */
function migrate(raw: RawSave): GameState {
  const s = raw as unknown as GameState;
  const stale = raw.version < 4;
  for (const p of Object.values(s.players) as Player[]) {
    p.wage = p.wage ?? weeklyWage(p.value, p.rating);
    p.contractYears = p.contractYears ?? 2;
    p.apps = p.apps ?? 0;
    p.goals = p.goals ?? 0;
    p.career = p.career ?? [];
    p.seasonRatingSum = p.seasonRatingSum ?? 0;
    p.seasonRatingCount = p.seasonRatingCount ?? 0;

    // --- v3: player model (potential, condition, contracts, GK attrs, stats).
    // Pre-v3 saves have none of this. Potential is re-derived from the same
    // age curve the dataset builder uses, so a migrated save develops exactly
    // like a fresh one; anyone already at or past 30 is simply finished.
    if (p.potential == null) {
      const gap = p.age >= 30 ? 0
        : p.age <= 19 ? 12 + Math.floor(Math.random() * 13)
        : p.age <= 21 ? 10 + Math.floor(Math.random() * 11)
        : p.age <= 23 ? 6 + Math.floor(Math.random() * 10)
        : p.age <= 25 ? 3 + Math.floor(Math.random() * 8)
        : p.age <= 27 ? 1 + Math.floor(Math.random() * 6)
        : Math.floor(Math.random() * 4);
      p.potential = Math.min(99, p.rating + gap);
    }
    // Never let a migrated player already sit above his own ceiling.
    p.potential = Math.min(99, Math.max(p.potential, p.rating));
    p.gkReflexes = p.gkReflexes ?? (p.pos === 'GK' ? p.rating : 5 + Math.floor(Math.random() * 15));
    p.gkPositioning = p.gkPositioning ?? (p.pos === 'GK' ? p.rating : 5 + Math.floor(Math.random() * 15));
    p.height = p.height ?? (p.pos === 'GK' ? 190 : p.pos === 'DEF' ? 184 : p.pos === 'MID' ? 179 : 180);
    p.altPos = p.altPos ?? [];
    p.contractEnd = p.contractEnd ?? contractEndFor(s.seasonYear, p.contractYears);
    p.releaseClause = p.releaseClause ?? 0;
    p.loyal = p.loyal ?? Math.random() < 0.6;
    p.transferListed = p.transferListed ?? false;
    p.wantsMove = p.wantsMove ?? p.unhappy ?? false;
    p.promisedStatus = p.promisedStatus ?? null;
    p.retireAge = p.retireAge ?? rollRetireAge(p.pos === 'GK');
    // An existing veteran must not retire the instant the save is opened —
    // give anyone already past his rolled age at least one more season.
    if (p.age >= p.retireAge) p.retireAge = p.age + 1;
    p.morale = p.morale ?? s.morale ?? 70;
    p.fitness = p.fitness ?? (p.injuryWeeks > 0 ? 40 : 90);
    p.sharpness = p.sharpness ?? 70;
    p.chem = p.chem ?? s.chemistry ?? 60;
    p.assists = p.assists ?? 0;
    p.cleanSheets = p.cleanSheets ?? 0;
    p.saves = p.saves ?? 0;
    // Domestic mirrors can only be back-filled optimistically — before v3 the
    // game did not distinguish league from cup appearances.
    p.lgApps = p.lgApps ?? p.apps;
    p.lgGoals = p.lgGoals ?? p.goals;
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
  // managerProfile.avatarConfig.skinShadow / eyebrowColor are new, optional
  // fields — older saves simply lack them, and ManagerAvatar derives a
  // sensible shade at render time when they're absent, so no backfill is
  // needed here beyond the field being optional on the type.
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
  // --- v4: the league pyramid. Pre-v4 saves key clubs, fixtures, records and
  // season history off a Division number (1–10); everything now keys off a
  // LeagueDef id. Map each old division onto the league it became, rebuild the
  // fixture map under league-id keys, and seed the phantom pools so the first
  // season end after loading has churn to work with.
  for (const club of s.clubs as LegacyClub[]) {
    if (!club.leagueId) club.leagueId = leagueIdForDivision(club.division ?? 1);
    delete club.division;
  }
  const oldFixtures = s.fixtures as LegacyFixtures | undefined;
  if (oldFixtures && Object.keys(oldFixtures).some((k) => /^d\d+$/.test(k))) {
    const mapped: GameState['fixtures'] = {};
    for (const [key, list] of Object.entries(oldFixtures)) {
      const m = /^d(\d+)$/.exec(key);
      const id = m ? leagueIdForDivision(Number(m[1])) : key;
      // Anything that resolves to neither an old division key nor a real
      // league id is junk from a hand-edited save — drop it rather than
      // carrying a fixture list nothing will ever play.
      if (!m && !LEAGUES.some((l) => l.id === key)) continue;
      mapped[id] = list;
    }
    s.fixtures = mapped;
  }
  s.fixtures = s.fixtures ?? {};
  s.splitGroups = s.splitGroups ?? {};
  s.nextClubId = s.nextClubId ?? Math.max(0, ...s.clubs.map((c) => c.id)) + 1;
  if (!s.phantomPools) {
    s.phantomPools = {};
    refillPhantomPools(s);
  }
  const bestFinish = s.records?.bestFinish as (GameState['records']['bestFinish'] & { division?: number }) | null;
  if (bestFinish && !bestFinish.leagueId) {
    bestFinish.leagueId = leagueIdForDivision(bestFinish.division ?? 1);
    bestFinish.level = getLeague(bestFinish.leagueId).level;
    delete bestFinish.division;
  }
  for (const h of s.history ?? []) {
    const legacy = h as typeof h & { division?: number };
    if (!legacy.leagueId) legacy.leagueId = leagueIdForDivision(legacy.division ?? 1);
    delete legacy.division;
  }

  s.board = s.board ?? makeBoardObjective(s);
  s.cup = s.cup ?? makeDomesticCup(s);
  if (!s.continental) s.continental = makeContinental(continentalEntrants(s));
  if (stale) s.version = 4;
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
    if (!parsed.userClubId || ![1, 2, 3, 4].includes(parsed.version)) return null;
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
      leagueId: club?.leagueId ?? 'premier_league',
      leagueName: getLeague(club?.leagueId ?? 'premier_league').name,
      managerName: s.manager.name,
    };
  });
}

export function hasSave(slot = 0): boolean {
  return loadGame(slot) !== null;
}
