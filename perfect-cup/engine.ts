// ============================================
// PERFECT CUP - CORE ENGINE (Simple & Clean)
// ============================================

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface Squad {
  id: string;
  countryName: string;
  tournamentYear: number;
  flag: string;
  strength: number;
  strengthPct: number;
  tier: 'legendary' | 'strong' | 'medium' | 'weak';
  result?: string;
  countryFamilyId: string;
  eligible: boolean;
  weight: number;
}

export interface Card {
  id: string;
  personKey: string;
  squadId: string;
  name: string;
  position: Position;
  rating: number;
  goals?: number;
  appearances?: number;
  awards?: string[];
}

export interface DraftState {
  picks: Card[];
  seenSquadIds: string[];
  currentSquadId?: string;
  countryFamilyRerollUsed: boolean;
  tournamentRerollUsed: boolean;
  draftSeed: string;
}

export interface RerollOption {
  kind: 'family' | 'tournament';
  enabled: boolean;
  used: boolean;
  label: string;
}

// ============================================
// DRAFT STATE MANAGEMENT
// ============================================

export function createDraftState(draftSeed: string): DraftState {
  return {
    picks: [],
    seenSquadIds: [],
    currentSquadId: undefined,
    countryFamilyRerollUsed: false,
    tournamentRerollUsed: false,
    draftSeed,
  };
}

export function applySpin(state: DraftState, squadId: string): DraftState {
  return {
    ...state,
    currentSquadId: squadId,
    seenSquadIds: state.seenSquadIds.includes(squadId)
      ? state.seenSquadIds
      : [...state.seenSquadIds, squadId],
  };
}

export function applyPick(
  state: DraftState,
  card: Card,
  rules = DEFAULT_RULES
): DraftState {
  if (!canPickCard(state, card, rules)) {
    throw new Error(`Illegal pick: ${card.id}`);
  }

  const newPicks = [...state.picks, card];

  return {
    ...state,
    picks: newPicks,
    currentSquadId: undefined,
  };
}

export function applyReroll(
  state: DraftState,
  kind: 'family' | 'tournament',
  newSquadId: string
): DraftState {
  return {
    ...state,
    currentSquadId: newSquadId,
    seenSquadIds: state.seenSquadIds.includes(newSquadId)
      ? state.seenSquadIds
      : [...state.seenSquadIds, newSquadId],
    countryFamilyRerollUsed:
      kind === 'family' || state.countryFamilyRerollUsed,
    tournamentRerollUsed:
      kind === 'tournament' || state.tournamentRerollUsed,
  };
}

// ============================================
// PICK VALIDATION
// ============================================

export const DEFAULT_RULES = {
  totalPicks: 5,
  requirements: { GK: 1, DEF: 1, MID: 2, FWD: 1 },
  distinctPersons: true,
};

export function canPickCard(
  state: DraftState,
  card: Card,
  rules = DEFAULT_RULES
): boolean {
  if (state.picks.length >= rules.totalPicks) return false;
  if (card.squadId !== state.currentSquadId) return false;

  const needs = remainingNeeds(state.picks, rules.requirements);
  if (needs[card.position] <= 0) return false;

  if (rules.distinctPersons) {
    const alreadyPicked = state.picks.some(
      (p) => p.personKey === card.personKey
    );
    if (alreadyPicked) return false;
  }

  return true;
}

export function isComplete(state: DraftState, totalPicks = 5): boolean {
  return state.picks.length >= totalPicks;
}

export function remainingNeeds(
  picks: Card[],
  requirements = DEFAULT_RULES.requirements
) {
  const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };

  for (const pick of picks) {
    counts[pick.position]++;
  }

  return {
    GK: requirements.GK - counts.GK,
    DEF: requirements.DEF - counts.DEF,
    MID: requirements.MID - counts.MID,
    FWD: requirements.FWD - counts.FWD,
  };
}

// ============================================
// REROLL HELPERS
// ============================================

export function canReroll(
  state: DraftState,
  kind: 'family' | 'tournament',
  currentSquad: Squad | undefined,
  allSquads: Squad[]
): boolean {
  if (!currentSquad) return false;

  const alreadyUsed =
    kind === 'family'
      ? state.countryFamilyRerollUsed
      : state.tournamentRerollUsed;

  if (alreadyUsed) return false;

  const available = getAvailableRerolls(
    kind,
    currentSquad,
    allSquads,
    state.seenSquadIds
  );

  return available.length > 0;
}

export function getAvailableRerolls(
  kind: 'family' | 'tournament',
  currentSquad: Squad,
  allSquads: Squad[],
  seenSquadIds: string[]
): Squad[] {
  return allSquads.filter((squad) => {
    if (!squad.eligible) return false;
    if (squad.id === currentSquad.id) return false;
    if (seenSquadIds.includes(squad.id)) return false;

    if (kind === 'family') {
      return squad.countryFamilyId === currentSquad.countryFamilyId;
    } else {
      return (
        squad.tournamentYear === currentSquad.tournamentYear &&
        squad.countryFamilyId !== currentSquad.countryFamilyId
      );
    }
  });
}

// ============================================
// LINEUP HELPERS (for later)
// ============================================

export const LINEUP_SLOTS = ['GK', 'DEF', 'MID1', 'MID2', 'FWD'] as const;

export type LineupSlot = (typeof LINEUP_SLOTS)[number];

export function lineupBySlot(picks: Card[]) {
  const result: Record<LineupSlot, Card | undefined> = {
    GK: undefined,
    DEF: undefined,
    MID1: undefined,
    MID2: undefined,
    FWD: undefined,
  };

  const mids = picks.filter((p) => p.position === 'MID');

  for (const pick of picks) {
    if (pick.position === 'GK') result.GK = pick;
    if (pick.position === 'DEF') result.DEF = pick;
    if (pick.position === 'FWD') result.FWD = pick;
  }

  if (mids[0]) result.MID1 = mids[0];
  if (mids[1]) result.MID2 = mids[1];

  return result;
}

// ============================================
// SPIN SELECTION (weighted pick for UI)
// ============================================

export function pickWeightedSquad(
  squads: Squad[],
  excludeIds: string[] = []
): Squad | null {
  const pool = squads.filter(s => s.eligible && !excludeIds.includes(s.id));
  if (!pool.length) return null;
  let total = 0;
  for (const s of pool) total += s.weight;
  let r = Math.random() * total;
  for (const s of pool) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return pool[pool.length - 1];
}

export function rerollOptions(
  state: DraftState,
  currentSquad: Squad | undefined,
  allSquads: Squad[]
): RerollOption[] {
  return [
    {
      kind: 'family',
      enabled: canReroll(state, 'family', currentSquad, allSquads),
      used: state.countryFamilyRerollUsed,
      label: 'Same region, new nation',
    },
    {
      kind: 'tournament',
      enabled: canReroll(state, 'tournament', currentSquad, allSquads),
      used: state.tournamentRerollUsed,
      label: 'Same year, new nation',
    },
  ];
}