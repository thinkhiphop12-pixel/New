import type { Club, Fixture, GameState, Player } from '@/engine/types';
import {
  continentalEntrants, makeBoardObjective, makeContinental, makeDomesticCup, refillPhantomPools,
} from '@/engine/seasonProgression';
import { LEAGUES, getLeague, leagueIdForDivision } from '@/engine/gameRules';
import { contractEndFor, rollRetireAge, weeklyWage } from '@/engine/utils';
import { seedClubIdentities } from '@/engine/clubIdentity';
import { newFacilities, newScouting } from '@/engine/facilities';
import { compressToUTF16, decompressFromUTF16, WORKER_SOURCE } from '@/lib/lz';
import { idbDelete, idbGet, idbPut } from '@/lib/idb';

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
  const stale = raw.version < 6;
  const staleV7 = raw.version < 7;
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

    // --- v5: the seven-type injury model. Pre-v5 saves only know how many
    // whole weeks a man is out for; convert that to the day clock the match
    // engine now writes, and label an unexplained layoff as a knock.
    p.injuryDays = p.injuryDays ?? p.injuryWeeks * 7;
    p.injuryType = p.injuryType ?? (p.injuryWeeks > 0 ? 'knock' : null);
  }
  const t = s.tactics as GameState['tactics'];
  t.tempo = t.tempo ?? 'normal';
  t.width = t.width ?? 'standard';
  t.mentality = t.mentality ?? 'balanced';
  // --- v5: the tactical instructions the xG chain reads. Every one defaults
  // to its neutral setting, so a migrated save plays exactly as it did before.
  t.defLine = t.defLine ?? 'normal';
  t.focus = t.focus ?? 'mixed';
  t.buildUp = t.buildUp ?? 'balanced';
  t.passingStyle = t.passingStyle ?? 'mixed';
  t.runs = t.runs ?? 'balanced';
  t.tackling = t.tackling ?? 'normal';
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
  // Phase 9: `continental` moved from the domestic-cup-shaped Knockout to the
  // real 24-club Continental bracket. A save missing the field entirely, or
  // still carrying the old shape (no `ties`/`directQualifiers`), gets a fresh
  // one — an in-progress old-format continental run doesn't carry over, same
  // as the v4 league-pyramid migration already did for this field once.
  if (!s.continental || !('ties' in s.continental)) {
    s.continental = makeContinental(s, continentalEntrants(s));
  }
  // v5 also adds optional shot coordinates / injury detail to MatchEvent. Those
  // only ever appear on reports written after this version, and every reader
  // treats them as optional, so stored reports need no back-fill.
  // --- v6: play-style identities and tactical familiarity. Seeding clubs that
  // lack an identity is idempotent, and familiarity itself is created lazily by
  // tacFamInit on the first drilling tick, so nothing else needs back-filling.
  // --- Phase 7: transfers. Purely additive and version-agnostic — the
  // negotiation state is all optional, so an older save simply starts with an
  // empty market rather than needing a schema bump.
  s.negotiations = s.negotiations ?? [];
  s.preContracts = s.preContracts ?? [];
  s.transferBans = s.transferBans ?? {};
  s.transferNews = s.transferNews ?? [];

  seedClubIdentities(s);
  s.playStyle = s.playStyle ?? s.clubs.find((c) => c.id === s.userClubId)?.playStyle ?? 'balanced';

  if (stale) s.version = 6;

  // --- v7: facilities/staff/scouting (Phase 10). A save with none of this
  // gets a freshly-derived facilities block (stands seeded at their starting
  // tier, ground capacity cap derived from the club's league) and an empty
  // scouting block — no in-flight projects or assignments to fabricate, so
  // there is nothing lossy about back-filling this way.
  if (!s.facilities) s.facilities = newFacilities(s);
  if (!s.scouting) s.scouting = newScouting();
  if (staleV7) s.version = 7;
  return s;
}

/* ---------------------------------------------------------------------------
 * Persistence
 *
 * Payloads live in IndexedDB, LZ-compressed (~11x on real saves). A small
 * metadata index stays in localStorage so the save menu can render synchronously
 * without parsing — and without deserializing three multi-megabyte careers just
 * to print three club names, which is what the previous implementation did.
 * ------------------------------------------------------------------------- */

const INDEX_KEY = 'fmlite.index.v1';
const EMERGENCY_KEY = 'fmlite.emergency';
const IDB_KEY = (slot: number) => `save.${slot}`;

/** Raised when a save could not be persisted. Previously these were swallowed,
 *  so a career would silently stop saving and the player only found out when
 *  they came back to an old save. */
export class SaveFailedError extends Error {
  constructor(cause: string) {
    super(`Save failed: ${cause}`);
    this.name = 'SaveFailedError';
  }
}

function metaOf(state: GameState, slot: number): SaveMeta {
  const club = state.clubs.find((c) => c.id === state.userClubId);
  return {
    slot,
    clubName: club?.name ?? '—',
    seasonYear: state.seasonYear,
    week: state.week,
    leagueId: club?.leagueId ?? 'premier_league',
    leagueName: getLeague(club?.leagueId ?? 'premier_league').name,
    managerName: state.manager.name,
  };
}

function readIndex(): (SaveMeta | null)[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return SLOT_KEYS.map(() => null);
    const parsed = JSON.parse(raw) as (SaveMeta | null)[];
    return SLOT_KEYS.map((_, i) => parsed[i] ?? null);
  } catch {
    return SLOT_KEYS.map(() => null);
  }
}

function writeIndex(index: (SaveMeta | null)[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    // The index is a few hundred bytes; if even that fails the menu degrades to
    // empty slots, but the payloads in IndexedDB are still intact.
  }
}

/* --- compression worker -------------------------------------------------- */

interface PendingJob {
  resolve: (v: string) => void;
  reject: (e: Error) => void;
}

let worker: Worker | null = null;
let workerJobId = 0;
const pending = new Map<number, PendingJob>();

function getWorker(): Worker | null {
  if (worker !== null) return worker;
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined') return null;
  try {
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
    worker = new Worker(url);
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: string; error?: string }>) => {
      const job = pending.get(e.data.id);
      if (!job) return;
      pending.delete(e.data.id);
      if (e.data.ok && e.data.result != null) job.resolve(e.data.result);
      else job.reject(new Error(e.data.error ?? 'compression failed'));
    };
    return worker;
  } catch {
    return null;
  }
}

/** Compress off the main thread when possible. A ~4 MB save takes long enough
 *  that doing this inline visibly janks the UI on every autosave. */
function compressAsync(payload: string): Promise<string> {
  const w = getWorker();
  if (!w) return Promise.resolve(compressToUTF16(payload));
  return new Promise((resolve, reject) => {
    const id = ++workerJobId;
    pending.set(id, { resolve, reject });
    w.postMessage({ id, payload });
  });
}

/* --- public API ---------------------------------------------------------- */

export async function saveGame(state: GameState, slot = 0): Promise<void> {
  const payload = JSON.stringify(state);
  const compressed = await compressAsync(payload);
  try {
    await idbPut(IDB_KEY(slot), compressed);
  } catch (e) {
    throw new SaveFailedError((e as Error).message);
  }
  const index = readIndex();
  index[slot] = metaOf(state, slot);
  writeIndex(index);
}

export async function loadGame(slot = 0): Promise<GameState | null> {
  let raw: string | null = null;
  try {
    const stored = await idbGet(IDB_KEY(slot));
    if (stored) raw = decompressFromUTF16(stored);
  } catch {
    raw = null;
  }
  // Fall back to a pre-IndexedDB save still sitting in localStorage.
  if (!raw) {
    try {
      raw = localStorage.getItem(SLOT_KEYS[slot]);
    } catch {
      raw = null;
    }
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RawSave;
    if (!parsed.userClubId || ![1, 2, 3, 4, 5, 6, 7].includes(parsed.version)) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export async function clearSave(slot = 0): Promise<void> {
  try {
    await idbDelete(IDB_KEY(slot));
  } catch {
    // Nothing to do — the index write below still removes it from the menu.
  }
  try {
    localStorage.removeItem(SLOT_KEYS[slot]);
  } catch {
    // ignore
  }
  const index = readIndex();
  index[slot] = null;
  writeIndex(index);
}

/** Slot metadata, read straight from the localStorage index — no payload is
 *  fetched, decompressed or parsed. */
export function listSaves(): (SaveMeta | null)[] {
  return readIndex();
}

export function hasSave(slot = 0): boolean {
  return readIndex()[slot] !== null;
}

/**
 * Rebuild the localStorage index from the IndexedDB payloads.
 *
 * The index and the payloads live in different stores with different eviction
 * behaviour — browsers clear localStorage far more readily than IndexedDB. If
 * the index is lost the careers are still there, but `listSaves()` reports
 * empty slots, which makes them invisible, unreachable, and liable to be
 * overwritten by a new game. Reconciling on boot makes the index a cache of
 * the payloads rather than a second source of truth.
 */
async function reconcileIndex(): Promise<void> {
  const index = readIndex();
  let changed = false;
  for (let slot = 0; slot < SLOT_KEYS.length; slot++) {
    if (index[slot]) continue;
    let stored: string | null = null;
    try {
      stored = await idbGet(IDB_KEY(slot));
    } catch {
      continue;
    }
    if (!stored) continue;
    try {
      const parsed = JSON.parse(decompressFromUTF16(stored)) as RawSave;
      if (!parsed?.userClubId) continue;
      index[slot] = metaOf(migrate(parsed), slot);
      changed = true;
    } catch {
      // An unreadable payload stays out of the index but is left on disk.
    }
  }
  if (changed) writeIndex(index);
}

/**
 * One-time relocation of pre-IndexedDB saves, plus recovery of any emergency
 * blob written by the last beforeunload, plus index reconciliation. Safe to
 * call on every boot.
 */
export async function migrateLegacySaves(): Promise<void> {
  for (let slot = 0; slot < SLOT_KEYS.length; slot++) {
    let legacy: string | null = null;
    try {
      legacy = localStorage.getItem(SLOT_KEYS[slot]);
    } catch {
      continue;
    }
    if (!legacy) continue;
    try {
      const parsed = JSON.parse(legacy) as RawSave;
      if (!parsed.userClubId) continue;
      await saveGame(migrate(parsed), slot);
      localStorage.removeItem(SLOT_KEYS[slot]);
    } catch {
      // Leave an unreadable legacy save where it is rather than destroying it.
    }
  }

  try {
    const emergency = localStorage.getItem(EMERGENCY_KEY);
    if (emergency) {
      const { slot, state } = JSON.parse(emergency) as { slot: number; state: RawSave };
      if (state?.userClubId) await saveGame(migrate(state), slot);
      localStorage.removeItem(EMERGENCY_KEY);
    }
  } catch {
    // A corrupt emergency blob is discarded on the next successful save.
  }

  await reconcileIndex();
}

/**
 * Synchronous last-ditch write for `beforeunload`, where async IndexedDB work
 * will not complete. Stores uncompressed to a single key; absorbed into
 * IndexedDB by migrateLegacySaves() on the next boot. Best-effort by nature —
 * if the state is too big for localStorage this simply does nothing, which is
 * why it is a backstop for the debounced autosave rather than a replacement.
 */
export function emergencySave(state: GameState, slot = 0): void {
  try {
    localStorage.setItem(EMERGENCY_KEY, JSON.stringify({ slot, state }));
  } catch {
    // Nothing further to try at this point in the page lifecycle.
  }
}
