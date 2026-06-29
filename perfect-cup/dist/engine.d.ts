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
export declare function createDraftState(draftSeed: string): DraftState;
export declare function applySpin(state: DraftState, squadId: string): DraftState;
export declare function applyPick(state: DraftState, card: Card, rules?: {
    totalPicks: number;
    requirements: {
        GK: number;
        DEF: number;
        MID: number;
        FWD: number;
    };
    distinctPersons: boolean;
}): DraftState;
export declare function applyReroll(state: DraftState, kind: 'family' | 'tournament', newSquadId: string): DraftState;
export declare const DEFAULT_RULES: {
    totalPicks: number;
    requirements: {
        GK: number;
        DEF: number;
        MID: number;
        FWD: number;
    };
    distinctPersons: boolean;
};
export declare function canPickCard(state: DraftState, card: Card, rules?: {
    totalPicks: number;
    requirements: {
        GK: number;
        DEF: number;
        MID: number;
        FWD: number;
    };
    distinctPersons: boolean;
}): boolean;
export declare function isComplete(state: DraftState, totalPicks?: number): boolean;
export declare function remainingNeeds(picks: Card[], requirements?: {
    GK: number;
    DEF: number;
    MID: number;
    FWD: number;
}): {
    GK: number;
    DEF: number;
    MID: number;
    FWD: number;
};
export declare function canReroll(state: DraftState, kind: 'family' | 'tournament', currentSquad: Squad | undefined, allSquads: Squad[]): boolean;
export declare function getAvailableRerolls(kind: 'family' | 'tournament', currentSquad: Squad, allSquads: Squad[], seenSquadIds: string[]): Squad[];
export declare const LINEUP_SLOTS: readonly ["GK", "DEF", "MID1", "MID2", "FWD"];
export type LineupSlot = (typeof LINEUP_SLOTS)[number];
export declare function lineupBySlot(picks: Card[]): Record<"GK" | "DEF" | "FWD" | "MID1" | "MID2", Card | undefined>;
export declare function pickWeightedSquad(squads: Squad[], excludeIds?: string[]): Squad | null;
export declare function rerollOptions(state: DraftState, currentSquad: Squad | undefined, allSquads: Squad[]): RerollOption[];
