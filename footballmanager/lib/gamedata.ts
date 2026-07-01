import type { GameData } from '@/engine/types';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

let cache: GameData | null = null;

export async function loadGameData(): Promise<GameData> {
  if (cache) return cache;
  const res = await fetch(`${BASE}/data/gamedata.json`);
  if (!res.ok) throw new Error(`Failed to load game data (${res.status})`);
  cache = (await res.json()) as GameData;
  return cache;
}
