/**
 * Perfect Cup data layer — loads squads & cards, exposes simple getters.
 */
import type { Card, Squad } from './engine.js';
export type { Card, Squad };
/**
 * Load squad & card data. Tries pre-built squads.json first, falls back to players.json.
 */
export declare function loadData(squadsUrl?: string, playersUrl?: string): Promise<{
    squads: Squad[];
    cardsBySquad: Map<string, Card[]>;
}>;
export declare function getAllSquads(): Squad[];
export declare function getSquad(id: string): Squad | undefined;
export declare function getSquadCards(squadId: string): Card[];
